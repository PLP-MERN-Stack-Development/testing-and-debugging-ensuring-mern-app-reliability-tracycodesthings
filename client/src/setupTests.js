import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure React Testing Library
configure({ testIdAttribute: 'data-testid' });

// Global test utilities for React components
global.testUtils = {
  // Mock localStorage
  mockLocalStorage: () => {
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    return localStorageMock;
  },

  // Mock sessionStorage
  mockSessionStorage: () => {
    const sessionStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock
    });
    return sessionStorageMock;
  },

  // Mock fetch API
  mockFetch: () => {
    global.fetch = jest.fn();
    return fetch;
  },

  // Mock window.matchMedia
  mockMatchMedia: () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  },

  // Mock IntersectionObserver
  mockIntersectionObserver: () => {
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  },

  // Create mock user for authentication tests
  createMockUser: (overrides = {}) => ({
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    ...overrides
  }),

  // Create mock API response
  createMockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  })
};

// Setup default mocks
global.testUtils.mockMatchMedia();
global.testUtils.mockIntersectionObserver();

// Suppress console warnings during tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  // Reset fetch mock if it exists
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }
});