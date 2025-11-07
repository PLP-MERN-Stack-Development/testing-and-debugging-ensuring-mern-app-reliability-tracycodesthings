const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Auth Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    };

    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            _id: expect.any(String),
            name: validUserData.name,
            email: validUserData.email,
            role: 'user',
            isActive: true,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            __v: expect.any(Number)
          },
          token: expect.any(String)
        },
        timestamp: expect.any(String)
      });

      // Verify user was created in database
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(validUserData.name);
      expect(user.password).not.toBe(validUserData.password); // Should be hashed
    });

    test('should not register user with existing email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
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
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Name is required'),
          expect.stringContaining('Email is required'),
          expect.stringContaining('Password is required')
        ])
      );
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('valid email address')
        ])
      );
    });

    test('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          password: '123'
        })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('at least 6 characters')
        ])
      );
    });

    test('should validate name length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          name: 'A'
        })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('at least 2 characters')
        ])
      );
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123'
    };

    beforeEach(async () => {
      // Create user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            _id: expect.any(String),
            name: userData.name,
            email: userData.email,
            role: 'user',
            isActive: true,
            lastLogin: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            __v: expect.any(Number)
          },
          token: expect.any(String)
        },
        timestamp: expect.any(String)
      });

      // Verify lastLogin was updated
      const user = await User.findOne({ email: userData.email });
      expect(user.lastLogin).toBeTruthy();
    });

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password
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

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
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

      expect(response.body.error.message).toBe('Please provide email and password');
      expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
    });

    test('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: userData.password })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
    });

    test('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    let userId;
    const userData = {
      name: 'Auth User',
      email: 'auth@example.com',
      password: 'password123'
    };

    beforeEach(async () => {
      // Register and login to get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user._id;
    });

    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          _id: userId,
          name: userData.name,
          email: userData.email,
          role: 'user',
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          __v: expect.any(Number)
        },
        timestamp: expect.any(String)
      });
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'invalid-format')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('PUT /api/auth/me', () => {
    let authToken;
    const userData = {
      name: 'Update User',
      email: 'update@example.com',
      password: 'password123'
    };

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.token;
    });

    test('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);

      // Verify changes in database
      const user = await User.findOne({ email: updateData.email });
      expect(user.name).toBe(updateData.name);
    });

    test('should update only provided fields', async () => {
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Only Name Updated' })
        .expect(200);

      expect(response.body.data.name).toBe('Only Name Updated');
      expect(response.body.data.email).toBe(userData.email); // Should remain unchanged
    });

    test('should validate email format on update', async () => {
      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('valid email address')
        ])
      );
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/me')
        .send({ name: 'New Name' })
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let authToken;
    const userData = {
      name: 'Password User',
      email: 'password@example.com',
      password: 'oldpassword123'
    };

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.token;
    });

    test('should change password with valid current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.message).toBe('Password changed successfully');

      // Verify can login with new password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'newpassword123'
        })
        .expect(200);

      // Verify cannot login with old password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(401);
    });

    test('should reject with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.error.code).toBe('INCORRECT_PASSWORD');
    });

    test('should reject with missing passwords', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_PASSWORDS');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .send({
          currentPassword: userData.password,
          newPassword: 'newpassword123'
        })
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Logout User',
          email: 'logout@example.com',
          password: 'password123'
        });

      authToken = registerResponse.body.data.token;
    });

    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
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
        environment: expect.any(String)
      });
    });
  });

  describe('404 Routes', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Route /api/non-existent not found',
          code: 'ROUTE_NOT_FOUND',
          details: [],
          timestamp: expect.any(String)
        }
      });
    });
  });
});