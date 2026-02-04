/**
 * Security Middleware for Campus Market Backend
 * Provides rate limiting, input sanitization, and other security features
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter configuration
 * Different limits for different endpoint types
 */

// General API rate limiter - 100 requests per 15 minutes
exports.generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use trust proxy for Render deployment
  trustProxy: true
});

// Auth rate limiter (stricter) - 5 requests per 15 minutes
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

// Password reset rate limiter - 3 requests per hour
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Too many password reset attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

/**
 * Input sanitization middleware
 * Cleans request body, query, and params from potential XSS attacks
 */
const createDOMPurify = require('isomorphic-dompurify');

exports.sanitizeInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    next(); // Continue on error to not break functionality
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Strip HTML tags and sanitize
      sanitized[key] = createDOMPurify.sanitize(value, {
        ALLOWED_TAGS: [], // Remove all HTML tags
        KEEP_CONTENT: true // Keep text content
      }).trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Helmet-like security headers middleware
 */
exports.securityHeaders = (req, res, next) => {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * Account lockout middleware for failed login attempts
 * In-memory store for failed attempts (in production, use Redis)
const failedAttempts = new Map();
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

exports.checkAccountLockout = (req, res, next) => {
  const email = req.body.email;
  const ip = req.ip || req.connection.remoteAddress;

  if (!email) {
    return next();
  }

  const key = `${email}_${ip}`;
  const attempts = failedAttempts.get(key);

  if (attempts && attempts.count >= MAX_ATTEMPTS) {
    const timePassed = Date.now() - attempts.lastAttempt;
    if (timePassed < LOCKOUT_TIME) {
      const remainingTime = Math.ceil((LOCKOUT_TIME - timePassed) / 1000 / 60);
      return res.status(429).json({
        error: `Account locked. Try again in ${remainingTime} minutes.`
      });
    } else {
      // Lockout period expired, reset attempts
      failedAttempts.delete(key);
    }
  }

  next();
};

exports.recordFailedAttempt = (req, res, next) => {
  const email = req.body.email;
  const ip = req.ip || req.connection.remoteAddress;

  if (!email) {
    return next();
  }

  const key = `${email}_${ip}`;
  const attempts = failedAttempts.get(key) || { count: 0, lastAttempt: 0 };

  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  failedAttempts.set(key, attempts);

  // Send warning if approaching lockout
  const remainingAttempts = MAX_ATTEMPTS - attempts.count;
  if (remainingAttempts > 0 && remainingAttempts <= 2) {
    res.setHeader('X-Remaining-Attempts', remainingAttempts.toString());
  }

  next();
};

exports.resetFailedAttempts = (email, ip) => {
  const key = `${email}_${ip}`;
  failedAttempts.delete(key);
};
 */
