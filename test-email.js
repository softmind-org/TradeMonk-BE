import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

const sendTestEmail = async () => {
    console.log('Testing Email Configuration...');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_EMAIL}`);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: process.env.SMTP_EMAIL, // Send to self
            subject: 'Test Email',
            text: 'This is a test email to verify SMTP configuration.',
        });
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

sendTestEmail();
