const logger = require('../utils/logger');

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    logger.logPerformance(
      `${req.method} ${req.url}`,
      duration,
      {
        statusCode: res.statusCode,
        contentLength: res.get('content-length') || 0,
        ip: req.ip
      }
    );
  });
  
  next();
};

/**
 * Memory usage monitoring
 */
const memoryMonitor = () => {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memData = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024 * 100) / 100} MB`
    };
    
    logger.debug(`Memory Usage: ${JSON.stringify(memData)}`);
    
    // Alert if memory usage is high
    if (memUsage.heapUsed > 1000000000) { // 1GB
      logger.warn(`High Memory Usage: ${JSON.stringify(memData)}`);
    }
  }, 60000); // Check every minute
};

/**
 * Security monitoring middleware
 */
const securityMonitor = (req, res, next) => {
  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /(\<script\>|\<\/script\>)/gi,
    /(union|select|insert|delete|drop|create|alter|exec|execute)/gi,
    /(\.\.\/|\.\.\\)/g,
    /(\%27|\%22|\'|\")/g
  ];
  
  const checkSuspicious = (str) => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };
  
  // Check URL
  if (checkSuspicious(req.url)) {
    logger.logSecurity('Suspicious URL Pattern', {
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'high'
    });
  }
  
  // Check request body
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    if (checkSuspicious(bodyStr)) {
      logger.logSecurity('Suspicious Request Body', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'high'
      });
    }
  }
  
  // Monitor failed authentication attempts
  if (req.url.includes('/auth/login') && req.method === 'POST') {
    res.on('finish', () => {
      if (res.statusCode === 401) {
        logger.logSecurity('Failed Login Attempt', {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          email: req.body?.email,
          severity: 'medium'
        });
      }
    });
  }
  
  next();
};

/**
 * Database operation monitoring
 */
const dbMonitor = {
  logQuery: (operation, model, query, duration) => {
    logger.logPerformance(
      `DB ${operation}`,
      duration,
      {
        model,
        query: JSON.stringify(query),
        type: 'database'
      }
    );
  },
  
  logConnection: (event, details = {}) => {
    logger.info(`Database ${event}: ${JSON.stringify(details)}`);
  },
  
  logError: (operation, error, query = {}) => {
    logger.logError(error, null);
    logger.warn(`Database Error - Operation: ${operation}, Query: ${JSON.stringify(query)}`);
  }
};

/**
 * API rate limiting monitor
 */
const rateLimitMonitor = (req, res, next) => {
  const key = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;
  
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }
  
  const requestLog = global.rateLimitStore.get(key) || [];
  const validRequests = requestLog.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    logger.logSecurity('Rate Limit Exceeded', {
      ip: req.ip,
      requests: validRequests.length,
      window: '15 minutes',
      severity: 'medium'
    });
  }
  
  validRequests.push(now);
  global.rateLimitStore.set(key, validRequests);
  
  next();
};

/**
 * Error tracking and reporting
 */
const errorTracker = {
  track: (error, context = {}) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const errorData = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      context
    };
    
    logger.logError(error);
    
    // In production, you might send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // sendToErrorTrackingService(errorData);
    }
    
    return errorId;
  }
};

/**
 * Health check utilities
 */
const healthCheck = {
  getSystemHealth: () => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform
      }
    };
  },
  
  getDatabaseHealth: async () => {
    const mongoose = require('mongoose');
    
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };
      
      return {
        status: state === 1 ? 'healthy' : 'unhealthy',
        state: states[state] || 'unknown',
        host: mongoose.connection.host,
        name: mongoose.connection.name
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
};

// Initialize monitoring
if (process.env.NODE_ENV !== 'test') {
  memoryMonitor();
}

module.exports = {
  performanceMonitor,
  securityMonitor,
  rateLimitMonitor,
  dbMonitor,
  errorTracker,
  healthCheck
};