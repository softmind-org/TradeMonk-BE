import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import s3Client from '../config/s3.config.js';
import dotenv from 'dotenv';

dotenv.config();

const BUCKET = process.env.AWS_S3_BUCKET;

// Build storage engine based on whether S3 is configured
let storage;

if (BUCKET) {
    // S3 storage
    storage = multerS3({
        s3: s3Client,
        bucket: BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            const filename = `products/${file.fieldname}-${uniqueSuffix}${ext}`;
            cb(null, filename);
        }
    });
    console.log('📦 Upload storage: AWS S3 (' + BUCKET + ')');
} else {
    // Fallback to local disk storage if S3 bucket is not configured
    const uploadDir = 'public/uploads/products';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        }
    });
    console.warn('⚠️  AWS_S3_BUCKET not set — using local disk storage (public/uploads/products/)');
}

// Dedicated local storage for CSV files (must be local for stream processing)
const csvStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/temp';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, `bulk-${Date.now()}-${file.originalname}`);
    }
});

export const csvUpload = multer({
    storage: csvStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for CSV
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed!'), false);
        }
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|csv/; // Added csv
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname || mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png, webp) or CSV files are allowed!'));
        }
    }
});

export default upload;
