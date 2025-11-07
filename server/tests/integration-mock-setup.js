// Mock integration setup that doesn't require MongoDB Memory Server
// For CI/CD environments where download timeouts occur

const mongoose = require('mongoose');

let isConnected = false;

// Setup before all tests
beforeAll(async () => {
  try {
    // Skip actual MongoDB setup in test environment
    // Use mocked mongoose connection for integration tests
    if (process.env.NODE_ENV === 'test' || process.env.CI) {
      // Mock mongoose methods
      mongoose.connect = jest.fn().mockResolvedValue(true);
      mongoose.connection = {
        collections: {},
        dropDatabase: jest.fn().mockResolvedValue(true),
        close: jest.fn().mockResolvedValue(true)
      };
      isConnected = true;
      console.log('Using mocked MongoDB for integration tests');
    }
  } catch (error) {
    console.error('Integration setup error:', error);
    throw error;
  }
}, 30000);

// Cleanup after each test
afterEach(async () => {
  if (isConnected && mongoose.connection.collections) {
    // Mock clearing collections
    Object.keys(mongoose.connection.collections).forEach(key => {
      mongoose.connection.collections[key] = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
      };
    });
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
  }
});

// Global test utilities for integration tests
global.integrationUtils = {
  createMockApp: () => {
    const express = require('express');
    const app = express();
    app.use(express.json());
    return app;
  },
  
  mockDatabase: {
    users: [],
    clear: function() {
      this.users = [];
    },
    findUser: function(query) {
      return this.users.find(user => {
        if (query.email) return user.email === query.email;
        if (query._id) return user._id === query._id;
        return false;
      });
    },
    createUser: function(userData) {
      const user = {
        _id: 'mock-id-' + Date.now(),
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.users.push(user);
      return user;
    }
  }
};

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';