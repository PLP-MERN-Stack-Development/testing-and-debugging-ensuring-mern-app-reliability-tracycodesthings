describe('Authentication Flow E2E Tests', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should allow new user registration', () => {
      cy.visit('/register');
      
      // Check if registration form exists
      cy.get('[data-testid="name-input"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      
      // Fill out registration form
      cy.get('[data-testid="name-input"]').type('John Doe');
      cy.get('[data-testid="email-input"]').type('john@example.com');
      cy.get('[data-testid="password-input"]').type('securePassword123');
      
      // Submit form
      cy.get('[data-testid="submit-button"]').click();
      
      // Check for successful registration
      cy.url().should('include', '/dashboard');
      cy.contains('Welcome').should('be.visible');
    });

    it('should show validation errors for invalid inputs', () => {
      cy.visit('/register');
      
      // Try to submit empty form
      cy.get('[data-testid="submit-button"]').click();
      
      // Check for validation errors
      cy.get('[data-testid="name-error"]').should('contain', 'required');
      cy.get('[data-testid="email-error"]').should('contain', 'required');
      cy.get('[data-testid="password-error"]').should('contain', 'required');
    });

    it('should prevent registration with existing email', () => {
      // First, register a user
      cy.register('John Doe', 'john@example.com', 'password123');
      
      // Try to register again with same email
      cy.clearAuth();
      cy.visit('/register');
      
      cy.get('[data-testid="name-input"]').type('Jane Doe');
      cy.get('[data-testid="email-input"]').type('john@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="submit-button"]').click();
      
      // Check for error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .should('contain', 'already exists');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Seed test user
      cy.seedTestUser();
    });

    it('should allow user login with valid credentials', () => {
      cy.login('test@example.com', 'password123');
      
      // Check successful login
      cy.url().should('include', '/dashboard');
      cy.contains('Welcome').should('be.visible');
      
      // Check that token is stored
      cy.window().its('localStorage').invoke('getItem', 'token').should('exist');
    });

    it('should reject login with invalid credentials', () => {
      cy.login('test@example.com', 'wrongpassword');
      
      // Check for error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .should('contain', 'Invalid');
      
      // Should stay on login page
      cy.url().should('include', '/login');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');
      cy.get('[data-testid="submit-button"]').click();
      
      // Check for validation errors
      cy.get('[data-testid="email-error"]').should('contain', 'required');
      cy.get('[data-testid="password-error"]').should('contain', 'required');
    });

    it('should validate email format', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="submit-button"]').click();
      
      // Check for email validation error
      cy.get('[data-testid="email-error"]').should('contain', 'valid email');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      cy.seedTestUser();
      cy.login('test@example.com', 'password123');
    });

    it('should allow user logout', () => {
      // Click logout button
      cy.get('[data-testid="logout-button"]').click();
      
      // Check redirect to home page
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      
      // Check that token is removed
      cy.window().its('localStorage').invoke('getItem', 'token').should('not.exist');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/dashboard');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should allow authenticated users to access protected routes', () => {
      cy.seedTestUser();
      cy.login('test@example.com', 'password123');
      
      // Should be able to access dashboard
      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Navigation', () => {
    it('should navigate between public pages', () => {
      // Test home page
      cy.visit('/');
      cy.contains('Home').should('be.visible');
      
      // Navigate to login
      cy.get('[data-testid="login-link"]').click();
      cy.url().should('include', '/login');
      
      // Navigate to register
      cy.get('[data-testid="register-link"]').click();
      cy.url().should('include', '/register');
      
      // Navigate back to home
      cy.get('[data-testid="home-link"]').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('should show different navigation for authenticated users', () => {
      cy.seedTestUser();
      cy.login('test@example.com', 'password123');
      
      // Should show authenticated navigation
      cy.get('[data-testid="dashboard-link"]').should('be.visible');
      cy.get('[data-testid="profile-link"]').should('be.visible');
      cy.get('[data-testid="logout-button"]').should('be.visible');
      
      // Should not show login/register links
      cy.get('[data-testid="login-link"]').should('not.exist');
      cy.get('[data-testid="register-link"]').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Intercept API calls and force network error
      cy.intercept('POST', '/api/auth/login', { forceNetworkError: true });
      
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="submit-button"]').click();
      
      // Should show network error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .should('contain', 'network');
    });

    it('should handle server errors gracefully', () => {
      // Intercept API calls and return server error
      cy.intercept('POST', '/api/auth/login', { statusCode: 500 });
      
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="submit-button"]').click();
      
      // Should show server error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .should('contain', 'server');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.visit('/login');
      
      // Tab through form elements
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'email-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'password-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'submit-button');
    });

    it('should have proper ARIA labels and roles', () => {
      cy.visit('/login');
      
      // Check form accessibility
      cy.get('[data-testid="login-form"]').should('have.attr', 'role');
      cy.get('[data-testid="email-input"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="password-input"]').should('have.attr', 'aria-label');
      
      // Check error messages have proper roles
      cy.get('[data-testid="submit-button"]').click();
      cy.get('[data-testid="email-error"]').should('have.attr', 'role', 'alert');
      cy.get('[data-testid="password-error"]').should('have.attr', 'role', 'alert');
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});