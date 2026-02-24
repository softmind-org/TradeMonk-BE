import stripeModule from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = stripeModule(process.env.STRIPE_SECRET_KEY);
const pi = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'eur'
});
console.log(pi.id, pi.client_secret);
