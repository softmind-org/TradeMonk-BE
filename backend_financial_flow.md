# TradeMonk Backend Financial Flow

This document details the exact financial math and Stripe payment flow for the TradeMonk marketplace as confirmed by the client requirements.

## 1. Overview
The platform uses a split payment model where a single buyer payment is collected via Stripe, and then funds are distributed to multiple sellers after subtracting Stripe processing fees and the TradeMonk commission.

## 2. Customer Collection (Buyer Flow)
When a buyer completes checkout, they are charged a single consolidated amount:
- **Items Total**: The sum of all item prices `(price * quantity)`
- **Shipping**: A fixed rate of €15.00 per unique seller.

**Buyer Total = Items Total + Shipping**

> [!NOTE]
> The Stripe service processing fee is **not** explicitly added to the buyer's checkout total. Buyers only pay the sticker price for the products and the shipping. 

## 3. Stripe Processing Fees
Stripe charges a fee to process the payment (approximately ~3.2% for international/standard EU mix). 
Since the buyer is not explicitly charged this fee, it is **absorbed by the seller** during checkout.
- **Estimated Stripe Fee**: `Buyer Total * 0.032`

## 4. Platform Fees & Shipping Retention
The platform (Admin) retains a commission from each transaction:
- **TradeMonk Commission**: A `3.5%` platform fee is charged strictly on the **Item Cost**.

**TradeMonk Fee = Items Total * 3.5%**

## 5. Seller Net Earnings 
The final amount credited to the seller's balance is calculated by giving them the Item Cost and the Shipping money (so they can ship the item to the buyer), and subtracting the fees they absorb.

**Seller Net = (Items Total + Shipping) - TradeMonk Fee - Stripe Fee**

---

## Example Calculation
If a buyer purchases a €100 item with €50 shipping (dummy numbers from client example):

1. **Buyer Pays:** `€100 (Item) + €50 (Shipping) = €150.00`
2. **Stripe Processing Fee:** `€150.00 * ~0.0133 = €2.00` (Assuming abstract €2 Stripe fee for the example)
3. **TradeMonk Fee:** `€100 (Item) * 3.5% = €3.50`
4. **Seller Net Payout:** `(€100 + €50) - €3.50 - €2.00 = €144.50`

*(Check: €144.50 (Seller) + €3.50 (Admin) + €2.00 (Stripe) = €150.00)*

## 6. Payout Flow
1. **Holding Period**: Funds sit in the TradeMonk platform Stripe account.
2. **Pending Balance**: Seller net earnings are marked as `pending` until the order is `shipped` + 7 days, or immediately when marked `delivered`.
3. **Available Balance**: Eligible funds move to the available balance.
4. **Manual Transfer**: Sellers request a payout, which triggers a Stripe `Transfer` from the platform account to their connected Stripe account.
,