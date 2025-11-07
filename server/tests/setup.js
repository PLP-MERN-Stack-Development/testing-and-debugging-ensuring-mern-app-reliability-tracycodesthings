const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup before all tests - only for integration tests
const isIntegrationTest = process.env.TEST_TYPE === 'integration';

if (isIntegrationTest) {
  beforeAll(async () => {
    try {
      mongoServer = await MongoMemoryServer.create({
        binary: {
          downloadDir: process.env.MONGODB_MEMORY_SERVER_DOWNLOAD_DIR || './mongodb-binaries',
          version: '6.0.0'
        }
      });
      const mongoUri = mongoServer.getUri();
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } catch (error) {
      console.error('MongoDB Memory Server setup failed:', error);
      throw error;
    }
  }, 60000); // Increased timeout for MongoDB setup

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
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);
}

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

// Jest timeout for database operations
jest.setTimeout(60000);

// Mock console methods during tests unless explicitly needed
if (!process.env.VERBOSE_TESTS) {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
}