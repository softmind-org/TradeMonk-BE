import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ $or: [ { stripeConnectId: 'acct_1032D82eZvKYlo2C' }, { stripeAccountId: 'acct_1032D82eZvKYlo2C' } ] });
    console.log("Found user:", user ? user.email : "Not found");
    mongoose.disconnect();
});
