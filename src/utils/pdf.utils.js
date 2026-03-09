import PDFDocument from 'pdfkit';

/**
 * Generate a PDF invoice for an order and pipe it to a writable stream (e.g., HTTP response).
 * @param {Object} order - The populated Mongoose order document
 * @param {Object} res - The Express response object (stream)
 */
export const generateInvoicePDF = (order, res) => {
    return new Promise((resolve, reject) => {
        try {
            // Create a document
            const doc = new PDFDocument({ margin: 50 });

            // Pipe its output securely to the Express response
            doc.pipe(res);

            // --- HEADER ---
            doc.fillColor('#444444')
                .fontSize(20)
                .text('INVOICE', 50, 50, { align: 'right' });

            doc.fontSize(10)
                .text(`Order Number: ${order.orderNumber}`, 50, 80, { align: 'right' })
                .text(`Date: ${order.createdAt.toISOString().split('T')[0]}`, 50, 95, { align: 'right' });

            // --- SELLER (Billed From) ---
            // Entity of record is the Seller, NOT TradeMonk
            doc.fillColor('#000000')
                .fontSize(14)
                .text('Billed From:', 50, 130)
                .fontSize(10)
                .fillColor('#444444')
                .text(`Seller Name: ${order.sellerId?.fullName || 'Unknown Seller'}`, 50, 150)
                .text(`Email: ${order.sellerId?.email || 'N/A'}`, 50, 165);

            // --- BUYER (Billed To) ---
            doc.fillColor('#000000')
                .fontSize(14)
                .text('Billed To:', 300, 130)
                .fontSize(10)
                .fillColor('#444444')
                .text(order.shippingAddress?.fullName || 'Unknown Buyer', 300, 150)
                .text(order.shippingAddress?.address || '', 300, 165)
                .text(`${order.shippingAddress?.city || ''}, ${order.shippingAddress?.zipCode || ''}`, 300, 180);

            // --- LINE ITEMS TABLE HEADER ---
            const tableTop = 250;
            doc.lineWidth(1);
            doc.font('Helvetica-Bold');
            doc.text('Item Description', 50, tableTop);
            doc.text('Qty', 350, tableTop, { width: 50, align: 'center' });
            doc.text('Unit Price', 400, tableTop, { width: 70, align: 'right' });
            doc.text('Line Total', 470, tableTop, { width: 70, align: 'right' });

            doc.moveTo(50, tableTop + 15)
                .lineTo(540, tableTop + 15)
                .stroke();

            // --- LINE ITEMS ---
            let position = tableTop + 30;
            doc.font('Helvetica');

            order.items.forEach(item => {
                const lineTotal = item.quantity * item.price;

                doc.text(item.title, 50, position, { width: 280 })
                    .text(item.quantity.toString(), 350, position, { width: 50, align: 'center' })
                    .text(`EUR ${item.price.toFixed(2)}`, 400, position, { width: 70, align: 'right' })
                    .text(`EUR ${lineTotal.toFixed(2)}`, 470, position, { width: 70, align: 'right' });

                position += 20;
            });

            doc.moveTo(50, position + 5)
                .lineTo(540, position + 5)
                .stroke();

            // --- TOTALS ---
            position += 20;

            // Important: We only show Items Total + Shipping to the buyer.
            // Platform fees are an internal detail for the seller, not on the generic invoice.
            const subtotal = order.feeBreakdown?.itemsTotal || 0;
            const shipping = order.feeBreakdown?.shippingFee || 0;
            const grandTotal = order.totalAmount || (subtotal + shipping);

            doc.text('Subtotal:', 380, position, { width: 90, align: 'right' })
                .text(`EUR ${subtotal.toFixed(2)}`, 470, position, { width: 70, align: 'right' });
            position += 20;

            doc.text('Shipping:', 380, position, { width: 90, align: 'right' })
                .text(`EUR ${shipping.toFixed(2)}`, 470, position, { width: 70, align: 'right' });
            position += 20;

            doc.font('Helvetica-Bold')
                .text('Total:', 380, position, { width: 90, align: 'right' })
                .text(`EUR ${grandTotal.toFixed(2)}`, 470, position, { width: 70, align: 'right' });

            // --- FOOTER ---
            doc.fontSize(10)
                .font('Helvetica')
                .fillColor('#888888')
                .text(
                    'Thank you for your business. For any questions regarding this invoice, please contact the seller directly.',
                    50,
                    700,
                    { align: 'center', width: 440 }
                );

            // Finalize the PDF and end the stream
            doc.end();
            resolve();
        } catch (error) {
            reject(error);
        }
    });
};
