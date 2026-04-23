import Product from '../models/product.model.js';
import csv from 'csv-parser';
import fs from 'fs';

const bulkController = {
    // @desc    Bulk upload products via CSV
    // @route   POST /api/v1/products/bulk-upload
    // @access  Private (Seller/Admin)
    bulkUploadProducts: async (req, res, next) => {
        try {
            if (!req.file) {
                res.status(400);
                throw new Error('Please upload a CSV file');
            }

            const sellerInfo = {
                userId: req.user._id,
                name: req.user.fullName,
                sellerType: req.user.sellerType,
                reputation: req.user.reputation || 'New Seller',
                positiveFeedback: req.user.positiveFeedback || '100%'
            };

            const products = [];
            const results = {
                success: 0,
                errors: [],
                total: 0
            };

            const batchSize = 500;
            let currentBatch = [];

            // Helper to process a batch
            const processBatch = async (batch) => {
                if (batch.length === 0) return;
                try {
                    await Product.insertMany(batch, { ordered: false });
                    results.success += batch.length;
                } catch (error) {
                    // Handle partial inserts if some fail validation
                    if (error.writeErrors) {
                        results.success += (batch.length - error.writeErrors.length);
                        error.writeErrors.forEach(err => {
                            results.errors.push(`Row ${err.index}: ${err.errmsg}`);
                        });
                    } else {
                        results.errors.push(`Batch failed: ${error.message}`);
                    }
                }
            };

            // Stream and parse CSV
            fs.createReadStream(req.file.path)
                .pipe(csv({
                    mapHeaders: ({ header }) => header.replace(/^\uFEFF/g, '').trim() // Strip BOM and trim
                }))
                .on('data', (row) => {
                    results.total++;
                    console.log(`[DEBUG_BULK] Row ${results.total} Keys:`, Object.keys(row));
                    console.log(`[DEBUG_BULK] Row ${results.total} Images:`, { url: row.imageUrl, back: row.backImageUrl });
                    
                    // Basic validation and mapping
                    try {
                        const productData = {
                            title: row.title?.trim(),
                            collectionName: row.collectionName?.trim(),
                            gameSystem: row.gameSystem?.trim(),
                            price: parseFloat(row.price),
                            condition: row.condition?.trim()?.toUpperCase(),
                            quantity: parseInt(row.quantity) || 1,
                            setNumber: row.setNumber?.trim() || '',
                            rarity: row.rarity?.trim() || '',
                            description: row.description?.trim() || '',
                            status: 'active',
                            seller: sellerInfo
                        };

                        // Image mapping (Front and Back) - BOTH REQUIRED
                        if (row.imageUrl) {
                            productData.images = [row.imageUrl.trim()];
                        }
                        if (row.backImageUrl) {
                            productData.backImage = row.backImageUrl.trim();
                        }
                        
                        // Filename mapping for later sync
                        if (row.imageFilename || row.backImageFilename) {
                            productData.metadata = { 
                                imageFilename: row.imageFilename?.trim() || '',
                                backImageFilename: row.backImageFilename?.trim() || ''
                            };
                        }

                        // STRICT VALIDATION: Require BOTH front and back indicators
                        const hasFrontImage = (row.imageUrl?.trim() || row.imageFilename?.trim());
                        const hasBackImage = (row.backImageUrl?.trim() || row.backImageFilename?.trim());

                        if (!productData.title || !productData.collectionName || !productData.gameSystem || isNaN(productData.price)) {
                            results.errors.push(`Row ${results.total}: Missing required fields or invalid price`);
                        } else if (!hasFrontImage || !hasBackImage) {
                            results.errors.push(`Row ${results.total}: Both Front and Back images are required.`);
                        } else {
                            currentBatch.push(productData);
                        }

                        // Process batch if limit reached
                        if (currentBatch.length >= batchSize) {
                            const batchToProcess = [...currentBatch];
                            currentBatch = [];
                            processBatch(batchToProcess);
                        }
                    } catch (err) {
                        results.errors.push(`Row ${results.total}: ${err.message}`);
                    }
                })
                .on('end', async () => {
                    // Process final batch
                    await processBatch(currentBatch);
                    
                    // Delete temp file
                    fs.unlinkSync(req.file.path);

                    res.status(200).json({
                        success: true,
                        message: `Processed ${results.total} rows`,
                        results: {
                            total: results.total,
                            uploaded: results.success,
                            failed: results.errors.length,
                            errors: results.errors.slice(0, 10) // Only send first 10 errors to keep response small
                        }
                    });
                })
                .on('error', (error) => {
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    next(error);
                });

        } catch (error) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            next(error);
        }
    }
};

export default bulkController;
