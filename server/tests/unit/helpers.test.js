const {
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
} = require('../../src/utils/helpers');

describe('Server Utility Functions', () => {
  describe('sanitizeInput', () => {
    test('should sanitize XSS characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      
      expect(sanitizeInput('<img src="x" onerror="alert(1)">'))
        .toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
      
      expect(sanitizeInput("'; DROP TABLE users; --"))
        .toBe('&#x27;; DROP TABLE users; --');
    });

    test('should handle normal text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
      expect(sanitizeInput('User123@example.com')).toBe('User123@example.com');
    });

    test('should handle invalid inputs', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
      expect(sanitizeInput(123)).toBe('');
      expect(sanitizeInput({})).toBe('');
    });

    test('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('   ');
    });
  });

  describe('generateJWTPayload', () => {
    test('should generate valid JWT payload', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'admin'
      };

      const payload = generateJWTPayload(user);

      expect(payload).toHaveProperty('id', user._id);
      expect(payload).toHaveProperty('email', user.email);
      expect(payload).toHaveProperty('role', user.role);
      expect(payload).toHaveProperty('iat');
      expect(typeof payload.iat).toBe('number');
    });

    test('should use default role when not provided', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      const payload = generateJWTPayload(user);
      expect(payload.role).toBe('user');
    });

    test('should include timestamp', () => {
      const user = { _id: '123', email: 'test@example.com' };
      const beforeTime = Math.floor(Date.now() / 1000);
      const payload = generateJWTPayload(user);
      const afterTime = Math.floor(Date.now() / 1000);

      expect(payload.iat).toBeGreaterThanOrEqual(beforeTime);
      expect(payload.iat).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('isValidObjectId', () => {
    test('should return true for valid ObjectIds', () => {
      const validIds = [
        '507f1f77bcf86cd799439011',
        '507f191e810c19729de860ea',
        '000000000000000000000000'
      ];

      validIds.forEach(id => {
        expect(isValidObjectId(id)).toBe(true);
      });
    });

    test('should return false for invalid ObjectIds', () => {
      const invalidIds = [
        '507f1f77bcf86cd79943901',  // too short
        '507f1f77bcf86cd799439011a', // too long
        'invalid-objectid',          // invalid characters
        '507f1f77bcf86cd79943901G', // invalid character G
        '',
        null,
        undefined,
        123
      ];

      invalidIds.forEach(id => {
        expect(isValidObjectId(id)).toBe(false);
      });
    });
  });

  describe('formatErrorResponse', () => {
    test('should format error response with all parameters', () => {
      const response = formatErrorResponse('Test error', 'TEST_CODE', ['detail1', 'detail2']);

      expect(response).toEqual({
        success: false,
        error: {
          message: 'Test error',
          code: 'TEST_CODE',
          details: ['detail1', 'detail2'],
          timestamp: expect.any(String)
        }
      });
    });

    test('should use default values for optional parameters', () => {
      const response = formatErrorResponse('Test error');

      expect(response).toEqual({
        success: false,
        error: {
          message: 'Test error',
          code: 'GENERIC_ERROR',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should include valid timestamp', () => {
      const response = formatErrorResponse('Test error');
      const timestamp = new Date(response.error.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });

  describe('formatSuccessResponse', () => {
    test('should format success response with data and message', () => {
      const data = { id: 1, name: 'Test' };
      const response = formatSuccessResponse(data, 'Operation successful');

      expect(response).toEqual({
        success: true,
        message: 'Operation successful',
        data: data,
        timestamp: expect.any(String)
      });
    });

    test('should use default message', () => {
      const data = { test: 'data' };
      const response = formatSuccessResponse(data);

      expect(response.message).toBe('Success');
      expect(response.data).toBe(data);
    });

    test('should handle null/undefined data', () => {
      expect(formatSuccessResponse(null)).toHaveProperty('data', null);
      expect(formatSuccessResponse(undefined)).toHaveProperty('data', undefined);
    });
  });

  describe('generateRandomToken', () => {
    test('should generate token with default length', () => {
      const token = generateRandomToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(typeof token).toBe('string');
    });

    test('should generate token with custom length', () => {
      const token = generateRandomToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
    });

    test('should generate different tokens', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();
      expect(token1).not.toBe(token2);
    });

    test('should only contain hex characters', () => {
      const token = generateRandomToken();
      const hexRegex = /^[0-9a-f]+$/;
      expect(hexRegex.test(token)).toBe(true);
    });
  });

  describe('hashPassword', () => {
    test('should hash password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    test('should return true for correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);

      expect(isMatch).toBe(true);
    });

    test('should return false for incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(wrongPassword, hash);

      expect(isMatch).toBe(false);
    });
  });

  describe('getPaginationOptions', () => {
    test('should return correct pagination options with defaults', () => {
      const options = getPaginationOptions();
      
      expect(options).toEqual({
        page: 1,
        limit: 10,
        skip: 0
      });
    });

    test('should calculate correct skip value', () => {
      const options = getPaginationOptions(3, 20);
      
      expect(options).toEqual({
        page: 3,
        limit: 20,
        skip: 40
      });
    });

    test('should handle string inputs', () => {
      const options = getPaginationOptions('2', '15');
      
      expect(options).toEqual({
        page: 2,
        limit: 15,
        skip: 15
      });
    });

    test('should enforce minimum values', () => {
      const options = getPaginationOptions(0, -5);
      
      expect(options.page).toBe(1);
      expect(options.limit).toBe(1);
    });

    test('should enforce maximum limit', () => {
      const options = getPaginationOptions(1, 200);
      
      expect(options.limit).toBe(100);
    });

    test('should handle invalid inputs', () => {
      const options = getPaginationOptions('invalid', 'also-invalid');
      
      expect(options.page).toBe(1);
      expect(options.limit).toBe(10); // Should use default limit
    });
  });

  describe('logRequest', () => {
    test('should extract request information', () => {
      const mockReq = {
        method: 'POST',
        url: '/api/users',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        connection: { remoteAddress: '192.168.1.1' }
      };

      const logData = logRequest(mockReq);

      expect(logData).toEqual({
        method: 'POST',
        url: '/api/users',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp: expect.any(String)
      });

      expect(mockReq.get).toHaveBeenCalledWith('user-agent');
    });

    test('should fallback to connection.remoteAddress when ip is not available', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/test',
        get: jest.fn().mockReturnValue('TestAgent'),
        connection: { remoteAddress: '192.168.1.100' }
      };

      const logData = logRequest(mockReq);

      expect(logData.ip).toBe('192.168.1.100');
    });

    test('should include valid timestamp', () => {
      const mockReq = {
        method: 'GET',
        url: '/test',
        get: jest.fn(),
        connection: {}
      };

      const logData = logRequest(mockReq);
      const timestamp = new Date(logData.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });
});