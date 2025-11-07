const request = require('supertest');
const { app } = require('../../src/index');

// Import test setup
require('../integration-mock-setup');

// Mock the User model
const mockUser = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByCredentials: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn()
};

// Mock the user constructor
const MockUserConstructor = jest.fn().mockImplementation((userData) => ({
  ...userData,
  _id: 'mock-id-' + Date.now(),
  save: jest.fn().mockResolvedValue(true),
  generateAuthToken: jest.fn().mockReturnValue('mock-jwt-token'),
  comparePassword: jest.fn(),
  toJSON: jest.fn().mockImplementation(function() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  })
}));

Object.assign(MockUserConstructor, mockUser);

jest.mock('../../src/models/User', () => MockUserConstructor);

describe('Auth API Integration Tests (Mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.integrationUtils.mockDatabase.clear();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      // Setup mocks
      MockUserConstructor.findOne.mockResolvedValue(null); // User doesn't exist
      
      const mockUserInstance = new MockUserConstructor({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        data: {
          user: expect.objectContaining({
            name: 'Test User',
            email: 'test@example.com'
          }),
          token: 'mock-jwt-token'
        },
        timestamp: expect.any(String)
      });

      expect(MockUserConstructor.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    test('should not register user with existing email', async () => {
      // Setup mocks - user already exists
      MockUserConstructor.findOne.mockResolvedValue({
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'User already exists with this email',
          code: 'USER_EXISTS',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const mockUser = {
        _id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        lastLogin: null,
        save: jest.fn().mockResolvedValue(true),
        generateAuthToken: jest.fn().mockReturnValue('mock-jwt-token'),
        toJSON: jest.fn().mockReturnValue({
          _id: 'user-id-123',
          email: 'test@example.com',
          name: 'Test User'
        })
      };

      MockUserConstructor.findByCredentials.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          user: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User'
          }),
          token: 'mock-jwt-token'
        },
        timestamp: expect.any(String)
      });

      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should reject login with invalid credentials', async () => {
      MockUserConstructor.findByCredentials.mockRejectedValue(
        new Error('Invalid login credentials')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Please provide email and password',
          code: 'MISSING_CREDENTIALS',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('GET /api/auth/me', () => {
    test('should get user profile with valid token', async () => {
      const mockUser = {
        _id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        toJSON: jest.fn().mockReturnValue({
          _id: 'user-id-123',
          email: 'test@example.com',
          name: 'Test User'
        })
      };

      MockUserConstructor.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User'
      }));
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toEqual({
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

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Server is running',
        timestamp: expect.any(String),
        environment: 'test'
      });
    });
  });

  describe('404 Routes', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Route /api/non-existent-route not found',
          code: 'ROUTE_NOT_FOUND',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });
  });
});