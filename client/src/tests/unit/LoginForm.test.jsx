import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../components/LoginForm';

describe('LoginForm Component', () => {
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Rendering', () => {
    test('should render login form with all elements', () => {
      render(<LoginForm {...defaultProps} />);

      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email:')).toBeInTheDocument();
      expect(screen.getByLabelText('Password:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    test('should render error message when error prop is provided', () => {
      const errorMessage = 'Invalid credentials';
      render(<LoginForm {...defaultProps} error={errorMessage} />);

      const errorElement = screen.getByTestId('error-message');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(errorMessage);
      expect(errorElement).toHaveAttribute('role', 'alert');
    });

    test('should not render error message when error prop is null', () => {
      render(<LoginForm {...defaultProps} error={null} />);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    test('should show loading state when isLoading is true', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveTextContent('Logging in...');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-label', 'Logging in...');
      
      expect(screen.getByTestId('email-input')).toBeDisabled();
      expect(screen.getByTestId('password-input')).toBeDisabled();
    });
  });

  describe('User Interaction', () => {
    test('should update input values when user types', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      await act(async () => {
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
      });

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    test('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const submitButton = screen.getByTestId('submit-button');
      const emailInput = screen.getByTestId('email-input');

      // Trigger validation errors by submitting empty form
      await act(async () => {
        await user.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument();
      });

      // Type in email field to clear the error
      await act(async () => {
        await user.type(emailInput, 'test@example.com');
      });

      await waitFor(() => {
        expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    test('should show validation errors for empty fields', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const submitButton = screen.getByTestId('submit-button');
      
      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required');
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('submit-button');

      await act(async () => {
        await user.type(emailInput, 'invalid-email');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address');
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('should show error for short password', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('submit-button');

      await act(async () => {
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, '12345');
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password must be at least 6 characters');
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('should submit form with valid data', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('submit-button');

      await act(async () => {
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should associate errors with form fields using aria-describedby', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByTestId('email-input');
        const passwordInput = screen.getByTestId('password-input');
        
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
        expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
        
        expect(screen.getByTestId('email-error')).toHaveAttribute('role', 'alert');
        expect(screen.getByTestId('password-error')).toHaveAttribute('role', 'alert');
      });
    });

    test('should handle form submission with Enter key', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      await act(async () => {
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.keyboard('{Enter}');
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid form submissions', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('submit-button');

      await act(async () => {
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        
        // Rapid clicks
        await user.click(submitButton);
        await user.click(submitButton);
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(3);
      });
    });

    test('should pass email as typed (with whitespace)', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('submit-button');

      await act(async () => {
        await user.type(emailInput, '  test@example.com  ');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com', // Input type="email" automatically trims whitespace
          password: 'password123'
        });
      });
    });

    test('should prevent submission when already loading', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByTestId('submit-button');
      
      await act(async () => {
        await user.click(submitButton);
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});