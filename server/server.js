import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const app = express();

// Trust proxy for Vercel to allow rate limiter to get correct IP
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net"
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration
app.use(cors());

// Global API rate limiter
const globalLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: {
    success: false,
    message: 'Too many requests from this network. Please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', globalLimiter);

// Body parser
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Serve static frontend assets
app.use(express.static(publicDir));

// Mount API routes
app.use('/api', apiRouter);

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized Secure Error Handler (Never leaks internals to client)
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  const statusCode = err.statusCode || 500;
  const isProd = config.nodeEnv === 'production';

  res.status(statusCode).json({
    success: false,
    message: isProd
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error'
  });
});

// Start Server only when run directly
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server')
);

if (isMainModule && process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🚀 Riwaz Submission Portal Server Running`);
    console.log(`📍 URL: http://localhost:${config.port}`);
    console.log(`🔒 Mode: ${config.useMockData ? 'Development (Mock Data)' : 'Production (Google Sheets API)'}`);
    console.log(`====================================================`);
  });
}

export default app;
