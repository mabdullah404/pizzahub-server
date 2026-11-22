import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import { seedInitialData } from './utils/seedData.js';
import { handleStripeWebhook } from './controllers/paymentController.js';

// Route imports
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;

// Stripe Webhook MUST receive raw body for cryptographic signature verification
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// Standard Middlewares & CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or direct browser GETs)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        process.env.CLIENT_URL,
        'https://pizzahub-client-tan.vercel.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ].filter(Boolean);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

app.use(express.json());

// Serverless DB connection middleware
app.use(async (req, res, next) => {
  if (req.path === '/' || req.path === '/api/health' || req.path === '/api/payments/webhook') {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error in request:', err);
    next();
  }
});

// Request logger
app.use((req, res, next) => {
  if (req.originalUrl !== '/api/payments/webhook') {
    console.log(`[API] ${new Date().toISOString()} -> ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🍕 PizzaHub REST API Server is running smoothly!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pizzahub-server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount modular API routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);

// Global 404 Handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

// Start Database & Listen for standalone/local development
const isRunningTests =
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('test'));

if (!process.env.VERCEL && !isRunningTests) {
  async function startServer() {
    try {
      await connectDB();
      await seedInitialData();

      app.listen(port, () => {
        console.log(`🚀 PizzaHub Server running on http://localhost:${port}`);
      });
    } catch (err) {
      console.error('❌ Fatal server startup error:', err);
      process.exit(1);
    }
  }

  startServer();
}

export default app;
