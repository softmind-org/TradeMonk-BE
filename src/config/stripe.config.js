import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.error('⚠️  STRIPE_SECRET_KEY is missing in .env file');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder');

export default stripe;
