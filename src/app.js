import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import stripeController from './controllers/stripe.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());

// Stripe webhook route (MUST be before express.json() — requires raw body)
app.post('/api/v1/stripe/webhooks',
    express.raw({ type: 'application/json' }),
    stripeController.handleWebhook
);

// JSON body parser (after webhook route)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Static Files
app.use('/public', express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/v1', routes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

export default app;
