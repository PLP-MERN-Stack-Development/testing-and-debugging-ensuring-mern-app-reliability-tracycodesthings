import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';

// Test component that throws an error
const ThrowErrorComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="working-component">Working component</div>;
};

// Test component with componentStack
const NestedComponent = ({ shouldThrow = false }) => {
  return (
    <div>
      <ThrowErrorComponent shouldThrow={shouldThrow} />
    </div>
  );
};

describe('ErrorBoundary Component', () => {
  // Mock console.error to avoid noise in test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Operation', () => {
    test('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    test('should render multiple children successfully', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should render default error UI when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('We\'re sorry, but something unexpected happened.')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument();
    });

    test('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-details')).toBeInTheDocument();
      expect(screen.getByText('Error details (Development only)')).toBeInTheDocument();
      
      const errorStack = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'pre' && 
               content.includes('Error: Test error message');
      });
      expect(errorStack).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    test('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByTestId('error-details')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    test('should call onError callback when error occurs', () => {
      const mockOnError = jest.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledTimes(1);
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });
  });

  describe('Custom Fallback UI', () => {
    test('should render custom fallback when provided', () => {
      const customFallback = (error, reset) => (
        <div data-testid="custom-error">
          <h3>Custom Error UI</h3>
          <p>Error: {error.message}</p>
          <button onClick={reset} data-testid="custom-reset">
            Reset
          </button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.getByText('Error: Test error message')).toBeInTheDocument();
      expect(screen.getByTestId('custom-reset')).toBeInTheDocument();
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    test('should pass error info to custom fallback', () => {
      const customFallback = jest.fn(() => (
        <div data-testid="custom-fallback">Custom UI</div>
      ));

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(customFallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Function),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });
  });

  describe('Reset Functionality', () => {
    test('should reset error state when retry button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI should be shown
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      
      // Click retry button
      const retryButton = screen.getByTestId('retry-button');
      retryButton.click();

      // Rerender with working component
      rerender(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    test('should call onReset callback when reset is triggered', () => {
      const mockOnReset = jest.fn();

      render(
        <ErrorBoundary onReset={mockOnReset}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByTestId('retry-button');
      retryButton.click();

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    test('should reset from custom fallback UI', () => {
      const mockOnReset = jest.fn();
      const customFallback = (error, reset) => (
        <button onClick={reset} data-testid="custom-reset">
          Custom Reset
        </button>
      );

      render(
        <ErrorBoundary fallback={customFallback} onReset={mockOnReset}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const customResetButton = screen.getByTestId('custom-reset');
      customResetButton.click();

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Propagation', () => {
    test('should catch errors from nested components', () => {
      render(
        <ErrorBoundary>
          <NestedComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    test('should not catch errors from event handlers', () => {
      const EventHandlerComponent = () => {
        const handleClick = () => {
          throw new Error('Event handler error');
        };

        return (
          <button onClick={handleClick} data-testid="error-button">
            Click to throw error
          </button>
        );
      };

      render(
        <ErrorBoundary>
          <EventHandlerComponent />
        </ErrorBoundary>
      );

      const button = screen.getByTestId('error-button');
      
      // Event handler errors should not be caught by ErrorBoundary
      expect(() => {
        button.click();
      }).toThrow('Event handler error');
    });
  });

  describe('Component Lifecycle', () => {
    test('should handle multiple error-reset cycles', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      
      // Reset
      screen.getByTestId('retry-button').click();
      
      // Render working component
      rerender(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      
      // Throw error again
      rerender(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    test('should maintain error state across rerenders', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      
      // Rerender with same error component
      rerender(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should still show error UI
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });
});