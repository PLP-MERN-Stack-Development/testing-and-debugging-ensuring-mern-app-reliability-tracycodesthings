// Setup file for unit tests - no database connection needed

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

// Jest timeout for tests
jest.setTimeout(10000);

// Mock console methods during tests
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