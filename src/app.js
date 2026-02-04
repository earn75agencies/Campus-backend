const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { securityHeaders, generalLimiter, sanitizeInput } = require('./middlewares/security.middleware');
const app = express();

// Trust proxy for Render deployment (required for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - allow specific origins only
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://campuu-frontend.vercel.app',
  'https://*.vercel.app',  // Allow all Vercel subdomains
  'https://*.netlify.app',  // Allow all Netlify subdomains
  'https://*.render.com',  // Allow all Render apps
  'https://*.herokuapp.com'  // Allow all Heroku apps
];

// Parse additional origins from environment variable (comma-separated)
if (process.env.ALLOWED_ORIGINS) {
  const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...additionalOrigins);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check for exact match
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Check for wildcard patterns (e.g., https://*.vercel.app)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // Convert wildcard pattern to regex
        const pattern = allowedOrigin
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    // Log the blocked origin for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
    }

    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all routes
app.use('/api', generalLimiter);

// Input sanitization for all routes
app.use(sanitizeInput);

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/wishlist', require('./routes/wishlist.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/upload', require('./routes/upload.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Campus Market Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log CORS errors specifically for debugging
  if (err.message && err.message.includes('CORS')) {
    console.error('CORS Error Details:', {
      origin: req.get('origin'),
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }

  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
