const jwt = require('jsonwebtoken');
const {
  authenticate,
  authorize,
  requestLogger,
  errorHandler,
  validateInput,
  rateLimit
} = require('../../src/middleware/auth');

// Mock jwt module
jest.mock('jsonwebtoken');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.testUtils.createMockRequest();
    res = global.testUtils.createMockResponse();
    next = global.testUtils.createMockNext();
    
    // Mock environment variable
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    test('should authenticate user with valid token', async () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'user' };
      const token = 'valid-jwt-token';
      
      req.header = jest.fn().mockReturnValue(`Bearer ${token}`);
      jwt.verify.mockReturnValue(mockUser);

      await authenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
    });

    test('should reject request without token', async () => {
      req.header = jest.fn().mockReturnValue(undefined);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN',
          details: [],
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request with invalid token format', async () => {
      req.header = jest.fn().mockReturnValue('invalid-token-format'); // Missing "Bearer " prefix
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token format');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token.',
          code: 'INVALID_TOKEN',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should reject request with expired/invalid token', async () => {
      const token = 'expired-jwt-token';
      req.header = jest.fn().mockReturnValue(`Bearer ${token}`);
      jwt.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token.',
          code: 'INVALID_TOKEN',
          details: [],
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle missing Authorization header', async () => {
      req.header = jest.fn().mockReturnValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('authorize middleware', () => {
    test('should allow access for user with required role', () => {
      req.user = { id: '123', role: 'admin' };
      const middleware = authorize('admin', 'moderator');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow access for user with any of the required roles', () => {
      req.user = { id: '123', role: 'moderator' };
      const middleware = authorize('admin', 'moderator');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should deny access for user without required role', () => {
      req.user = { id: '123', role: 'user' };
      const middleware = authorize('admin', 'moderator');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. Insufficient permissions.',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: [],
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should deny access for unauthenticated user', () => {
      req.user = null;
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied. User not authenticated.',
          code: 'NOT_AUTHENTICATED',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should handle single role parameter', () => {
      req.user = { id: '123', role: 'admin' };
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requestLogger middleware', () => {
    let consoleSpy, dateSpy;
    
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      dateSpy.mockRestore();
    });

    test('should log request information', () => {
      req.method = 'GET';
      req.url = '/api/users';
      req.ip = '192.168.1.1';
      req.get = jest.fn().mockReturnValue('Mozilla/5.0');

      const mockFinish = jest.fn();
      res.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          mockFinish.mockImplementation(callback);
        }
      });
      res.statusCode = 200;

      requestLogger(req, res, next);

      expect(next).toHaveBeenCalledWith();

      // Simulate response finish
      dateSpy.mockReturnValue(1150);
      mockFinish();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Request:',
        expect.stringContaining('"method":"GET"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Request:',
        expect.stringContaining('"status":200')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Request:',
        expect.stringContaining('"duration":"150ms"')
      );
    });

    test('should use connection.remoteAddress as fallback for IP', () => {
      req.method = 'POST';
      req.url = '/api/login';
      req.ip = undefined;
      req.connection = { remoteAddress: '10.0.0.1' };
      req.get = jest.fn().mockReturnValue('TestAgent');

      const mockFinish = jest.fn();
      res.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          mockFinish.mockImplementation(callback);
        }
      });
      res.statusCode = 201;

      requestLogger(req, res, next);
      dateSpy.mockReturnValue(1200);
      mockFinish();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Request:',
        expect.stringContaining('"ip":"10.0.0.1"')
      );
    });
  });

  describe('errorHandler middleware', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      console.error.mockRestore();
    });

    test('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        email: { message: 'Email is required' },
        password: { message: 'Password is too short' }
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation Error',
          code: 'VALIDATION_ERROR',
          details: ['Email is required', 'Password is too short'],
          timestamp: expect.any(String)
        }
      });
    });

    test('should handle duplicate key error', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;
      error.keyValue = { email: 'test@example.com' };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'email already exists',
          code: 'DUPLICATE_ERROR',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should handle TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should handle errors with custom status code', () => {
      const error = new Error('Custom error');
      error.statusCode = 418;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(418);
    });

    test('should log all errors to console', () => {
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error:', error);
    });
  });

  describe('validateInput middleware', () => {
    test('should pass validation with valid data', () => {
      const mockSchema = {
        validate: jest.fn().mockReturnValue({ error: null })
      };

      req.body = { name: 'John', email: 'john@example.com' };

      const middleware = validateInput(mockSchema);
      middleware(req, res, next);

      expect(mockSchema.validate).toHaveBeenCalledWith(req.body, { abortEarly: false });
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return validation errors', () => {
      const mockSchema = {
        validate: jest.fn().mockReturnValue({
          error: {
            details: [
              { message: 'Name is required' },
              { message: 'Email must be valid' }
            ]
          }
        })
      };

      req.body = { name: '', email: 'invalid-email' };

      const middleware = validateInput(mockSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: ['Name is required', 'Email must be valid'],
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('rateLimit middleware', () => {
    let dateSpy;
    
    beforeEach(() => {
      dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    });

    afterEach(() => {
      dateSpy.mockRestore();
    });

    test('should allow requests under the limit', () => {
      req.ip = '192.168.1.1';
      const middleware = rateLimit(60000, 2); // 2 requests per minute

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    test('should block requests over the limit', () => {
      req.ip = '192.168.1.1';
      const middleware = rateLimit(60000, 2); // 2 requests per minute

      // First two requests should pass
      middleware(req, res, next);
      middleware(req, res, next);

      // Third request should be blocked
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should reset counter after window expires', () => {
      req.ip = '192.168.1.1';
      const middleware = rateLimit(1000, 1); // 1 request per second

      // First request
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request (should be blocked)
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);

      // Advance time beyond window
      dateSpy.mockReturnValue(2001);

      // Third request (should pass after reset)
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    test('should use connection.remoteAddress as fallback', () => {
      req.ip = undefined;
      req.connection = { remoteAddress: '10.0.0.1' };
      const middleware = rateLimit(60000, 1);

      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();

      // Second request from same IP should be blocked
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    test('should handle different IPs independently', () => {
      const middleware = rateLimit(60000, 1); // 1 request per minute

      // First IP
      req.ip = '192.168.1.1';
      middleware(req, res, next);

      // Second IP
      req.ip = '192.168.1.2';
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });
});