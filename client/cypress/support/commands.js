// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command for API requests
Cypress.Commands.add('apiRequest', (method, endpoint, body = null) => {
  const token = localStorage.getItem('token');
  
  return cy.request({
    method,
    url: `http://localhost:5000/api${endpoint}`,
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    failOnStatusCode: false
  });
});

// Custom command to seed test data
Cypress.Commands.add('seedTestUser', () => {
  return cy.apiRequest('POST', '/auth/register', {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  });
});

// Custom command to clean up test data
Cypress.Commands.add('cleanupTestData', () => {
  // In a real app, you would have an admin endpoint to clean test data
  cy.log('Test data cleanup would happen here');
});