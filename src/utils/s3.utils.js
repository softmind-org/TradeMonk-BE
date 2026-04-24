import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../config/s3.config.js';
import dotenv from 'dotenv';

dotenv.config();

const BUCKET = process.env.AWS_S3_BUCKET;
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

/**
 * Check if a string is an S3 URL or S3 key
 */
const isS3Url = (url) => {
    if (!url || typeof url !== 'string') return false;
    // Only attempt to sign if it's from OUR bucket, or a local relative path
    return (url.includes('.s3.') && url.includes(BUCKET)) || (url.includes('s3.amazonaws.com') && url.includes(BUCKET)) || url.startsWith('products/');
};

/**
 * Extract S3 key from a full S3 URL or return the key if already a key
 */
const extractS3Key = (url) => {
    if (!url || typeof url !== 'string') return null;

    // Already a key (e.g., "products/images-123456.jpg")
    if (!url.startsWith('http')) return url;

    try {
        const parsedUrl = new URL(url);
        // Handle both path-style and virtual-hosted-style S3 URLs
        // Path-style: https://s3.region.amazonaws.com/bucket/key
        // Virtual-hosted: https://bucket.s3.region.amazonaws.com/key
        let key = parsedUrl.pathname;
        // Remove leading slash
        if (key.startsWith('/')) key = key.substring(1);
        // Remove bucket name from path-style URLs
        if (key.startsWith(BUCKET + '/')) key = key.substring(BUCKET.length + 1);
        return key;
    } catch {
        return null;
    }
};

/**
 * Generate a pre-signed URL for an S3 object
 * @param {string} urlOrKey - Full S3 URL or S3 object key
 * @returns {Promise<string>} Pre-signed URL or original URL if not S3
 */
export const getSignedImageUrl = async (urlOrKey) => {
    if (!urlOrKey || typeof urlOrKey !== 'string') return urlOrKey;

    // If it's not an S3 URL/key, return as-is (local paths, external URLs, etc.)
    if (!isS3Url(urlOrKey)) return urlOrKey;

    const key = extractS3Key(urlOrKey);
    if (!key) return urlOrKey;

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: SIGNED_URL_EXPIRY });
    } catch (error) {
        console.error(`Failed to sign URL for key: ${key}`, error.message);
        return urlOrKey; // Fallback to original
    }
};

/**
 * Sign all S3 image URLs in a product/order document.
 * Works on plain objects (call .toObject() on Mongoose docs first).
 * Handles: images[], backImage, and items[].image
 * @param {Object|Array} data - Document(s) to sign
 * @returns {Promise<Object|Array>} Data with signed URLs
 */
export const signImageUrls = async (data) => {
    if (!data) return data;

    // Handle arrays (e.g., list of products or order items)
    if (Array.isArray(data)) {
        return Promise.all(data.map(item => signImageUrls(item)));
    }

    // Convert Mongoose document to plain object if needed
    const obj = data.toObject ? data.toObject() : { ...data };

    // Sign images[] array
    if (obj.images && Array.isArray(obj.images)) {
        obj.images = await Promise.all(obj.images.map(url => getSignedImageUrl(url)));
    }

    // Sign backImage
    if (obj.backImage) {
        obj.backImage = await getSignedImageUrl(obj.backImage);
    }

    // Sign items[].image (for orders)
    if (obj.items && Array.isArray(obj.items)) {
        obj.items = await Promise.all(
            obj.items.map(async (item) => {
                if (item.image) {
                    item.image = await getSignedImageUrl(item.image);
                }
                return item;
            })
        );
    }

    return obj;
};
