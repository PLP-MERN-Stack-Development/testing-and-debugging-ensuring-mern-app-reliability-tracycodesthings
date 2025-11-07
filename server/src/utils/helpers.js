/**
 * Server-side utility functions
 */

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate JWT payload
 * @param {object} user - User object
 * @returns {object} - JWT payload
 */
const generateJWTPayload = (user) => {
  return {
    id: user._id,
    email: user.email,
    role: user.role || 'user',
    iat: Math.floor(Date.now() / 1000)
  };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Format error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {array} details - Error details
 * @returns {object} - Formatted error response
 */
const formatErrorResponse = (message, code = 'GENERIC_ERROR', details = []) => {
  return {
    success: false,
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Format success response
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {object} - Formatted success response
 */
const formatSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Generate random token
 * @param {number} length - Token length
 * @returns {string} - Random token
 */
const generateRandomToken = (length = 32) => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash password with bcrypt
 * @param {string} password - Password to hash
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (password, hash) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hash);
};

/**
 * Paginate results
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} - Pagination options
 */
const getPaginationOptions = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    skip
  };
};

/**
 * Log request information
 * @param {object} req - Express request object
 * @returns {object} - Log data
 */
const logRequest = (req) => {
  return {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  sanitizeInput,
  generateJWTPayload,
  isValidObjectId,
  formatErrorResponse,
  formatSuccessResponse,
  generateRandomToken,
  hashPassword,
  comparePassword,
  getPaginationOptions,
  logRequest
};