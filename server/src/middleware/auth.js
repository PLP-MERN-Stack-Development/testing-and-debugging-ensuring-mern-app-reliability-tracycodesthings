const jwt = require('jsonwebtoken');
const { formatErrorResponse } = require('../utils/helpers');

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(
        formatErrorResponse('Access denied. No token provided.', 'NO_TOKEN')
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(
      formatErrorResponse('Invalid token.', 'INVALID_TOKEN')
    );
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        formatErrorResponse('Access denied. User not authenticated.', 'NOT_AUTHENTICATED')
      );
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        formatErrorResponse('Access denied. Insufficient permissions.', 'INSUFFICIENT_PERMISSIONS')
      );
    }

    next();
  };
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    };
    
    console.log('Request:', JSON.stringify(logData));
  });
  
  next();
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(
      formatErrorResponse('Validation Error', 'VALIDATION_ERROR', errors)
    );
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json(
      formatErrorResponse(`${field} already exists`, 'DUPLICATE_ERROR')
    );
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      formatErrorResponse('Invalid token', 'INVALID_TOKEN')
    );
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      formatErrorResponse('Token expired', 'TOKEN_EXPIRED')
    );
  }
  
  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json(
    formatErrorResponse(message, 'INTERNAL_ERROR')
  );
};

/**
 * Input validation middleware
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json(
        formatErrorResponse('Validation failed', 'VALIDATION_ERROR', errors)
      );
    }
    
    next();
  };
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const requestData = requests.get(key);
    
    if (now > requestData.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (requestData.count >= max) {
      return res.status(429).json(
        formatErrorResponse('Too many requests', 'RATE_LIMIT_EXCEEDED')
      );
    }
    
    requestData.count++;
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requestLogger,
  errorHandler,
  validateInput,
  rateLimit
};