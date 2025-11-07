const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced logging methods
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      user: req.user ? req.user.id : 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.warn(`HTTP ${res.statusCode} - ${JSON.stringify(logData)}`);
    } else {
      logger.http(`HTTP ${res.statusCode} - ${JSON.stringify(logData)}`);
    }
  });
  
  next();
};

logger.logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...(req && {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      user: req.user ? req.user.id : 'anonymous'
    })
  };
  
  logger.error(`Application Error: ${JSON.stringify(errorData)}`);
};

logger.logAuth = (action, user, success = true, details = {}) => {
  const authData = {
    action,
    user: user ? (user.email || user.id) : 'unknown',
    success,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  if (success) {
    logger.info(`Auth Success: ${JSON.stringify(authData)}`);
  } else {
    logger.warn(`Auth Failure: ${JSON.stringify(authData)}`);
  }
};

logger.logSecurity = (event, details = {}) => {
  const securityData = {
    event,
    timestamp: new Date().toISOString(),
    severity: details.severity || 'medium',
    ...details
  };
  
  logger.warn(`Security Event: ${JSON.stringify(securityData)}`);
};

logger.logPerformance = (operation, duration, details = {}) => {
  const perfData = {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  if (duration > 5000) {
    logger.warn(`Slow Operation: ${JSON.stringify(perfData)}`);
  } else {
    logger.debug(`Performance: ${JSON.stringify(perfData)}`);
  }
};

module.exports = logger;