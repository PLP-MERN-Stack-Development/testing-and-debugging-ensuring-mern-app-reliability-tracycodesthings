import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { validateEmail } from '../utils/helpers';

const LoginForm = ({ onSubmit, isLoading = false, error = null }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="login-form" data-testid="login-form">
      <h2>Login</h2>
      
      {error && (
        <div className="error-message" data-testid="error-message" role="alert">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} data-testid="login-form-element">
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            data-testid="email-input"
            aria-describedby={validationErrors.email ? 'email-error' : undefined}
            disabled={isLoading}
          />
          {validationErrors.email && (
            <div id="email-error" className="field-error" data-testid="email-error" role="alert">
              {validationErrors.email}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            data-testid="password-input"
            aria-describedby={validationErrors.password ? 'password-error' : undefined}
            disabled={isLoading}
          />
          {validationErrors.password && (
            <div id="password-error" className="field-error" data-testid="password-error" role="alert">
              {validationErrors.password}
            </div>
          )}
        </div>

        <button
          type="submit"
          data-testid="submit-button"
          disabled={isLoading}
          aria-label={isLoading ? 'Logging in...' : 'Login'}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

LoginForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string
};

export default LoginForm;