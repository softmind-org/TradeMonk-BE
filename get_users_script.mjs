import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const Product = (await import('./src/models/product.model.js')).default;
    const User = (await import('./src/models/user.model.js')).default;
    
    const product = await Product.findOne().populate('sellerId');
    console.log('Test Product:', product?.title);
    console.log('Seller Email:', product?.sellerId?.email);
    console.log('Seller Password (user provided): Herryporterr@55');
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
