// Setup file for integration tests - includes database setup
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  try {
    // Create MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create({
      binary: {
        downloadDir: './mongodb-binaries',
        version: '6.0.0'
      }
    });
    const mongoUri = mongoServer.getUri();
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Test database connected successfully');
  } catch (error) {
    console.error('MongoDB Memory Server setup failed:', error);
    throw error;
  }
}, 60000); // 60 second timeout for setup

// Cleanup after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, 30000);

// Global test utilities
global.testUtils = {
  createMockRequest: (options = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...options
  }),
  
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },
  
  createMockNext: () => jest.fn()
};

// Jest timeout
jest.setTimeout(30000);