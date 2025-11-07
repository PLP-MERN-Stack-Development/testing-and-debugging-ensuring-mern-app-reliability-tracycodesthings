import {
  validateEmail,
  validatePassword,
  formatCurrency,
  debounce,
  deepClone,
  generateId,
  formatDate,
  capitalizeWords
} from '../../utils/helpers';

describe('Client Utility Functions', () => {
  describe('validateEmail', () => {
    test('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    test('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com',
        'test@example.',
        '',
        ' ',
        null,
        undefined
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    test('should handle non-string inputs', () => {
      expect(validateEmail(123)).toBe(false);
      expect(validateEmail({})).toBe(false);
      expect(validateEmail([])).toBe(false);
    });

    test('should trim whitespace before validation', () => {
      expect(validateEmail(' test@example.com ')).toBe(true);
      expect(validateEmail('  test@example.com  ')).toBe(true);
    });
  });

  describe('validatePassword', () => {
    test('should return valid for strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng@Password',
        'C0mplex$Pass'
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should return errors for weak passwords', () => {
      const testCases = [
        {
          password: 'weak',
          expectedErrors: [
            'Password must be at least 8 characters long',
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character'
          ]
        },
        {
          password: 'password',
          expectedErrors: [
            'Password must contain at least one uppercase letter',
            'Password must contain at least one number',
            'Password must contain at least one special character'
          ]
        },
        {
          password: 'Password',
          expectedErrors: [
            'Password must contain at least one number',
            'Password must contain at least one special character'
          ]
        },
        {
          password: 'Password123',
          expectedErrors: [
            'Password must contain at least one special character'
          ]
        }
      ];

      testCases.forEach(({ password, expectedErrors }) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(expectedErrors);
      });
    });

    test('should handle invalid inputs', () => {
      const invalidInputs = [null, undefined, '', 123, {}, []];

      invalidInputs.forEach(input => {
        const result = validatePassword(input);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });
    });
  });

  describe('formatCurrency', () => {
    test('should format valid currency amounts', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    test('should handle invalid amounts', () => {
      expect(formatCurrency('invalid')).toBe('$0.00');
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });

    test('should support different currencies', () => {
      expect(formatCurrency(100, 'EUR')).toContain('100.00');
      expect(formatCurrency(100, 'GBP')).toContain('100.00');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should delay function execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should cancel previous calls when called multiple times', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should pass arguments to the debounced function', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2');
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('deepClone', () => {
    test('should clone primitive values', () => {
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
      expect(deepClone(123)).toBe(123);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
    });

    test('should clone dates', () => {
      const date = new Date('2023-01-01');
      const clonedDate = deepClone(date);
      
      expect(clonedDate).toEqual(date);
      expect(clonedDate).not.toBe(date);
    });

    test('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const clonedArr = deepClone(arr);
      
      expect(clonedArr).toEqual(arr);
      expect(clonedArr).not.toBe(arr);
      expect(clonedArr[2]).not.toBe(arr[2]);
    });

    test('should clone objects', () => {
      const obj = {
        a: 1,
        b: {
          c: 2,
          d: [3, 4]
        }
      };
      const clonedObj = deepClone(obj);
      
      expect(clonedObj).toEqual(obj);
      expect(clonedObj).not.toBe(obj);
      expect(clonedObj.b).not.toBe(obj.b);
      expect(clonedObj.b.d).not.toBe(obj.b.d);
    });
  });

  describe('generateId', () => {
    test('should generate id with default length', () => {
      const id = generateId();
      expect(id).toHaveLength(8);
      expect(typeof id).toBe('string');
    });

    test('should generate id with custom length', () => {
      const id = generateId(12);
      expect(id).toHaveLength(12);
    });

    test('should generate different ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    test('should only contain valid characters', () => {
      const id = generateId(100);
      const validChars = /^[A-Za-z0-9]+$/;
      expect(validChars.test(id)).toBe(true);
    });
  });

  describe('formatDate', () => {
    test('should format valid dates', () => {
      const date = new Date('2023-01-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2023');
    });

    test('should handle string dates', () => {
      const formatted = formatDate('2023-01-15');
      expect(formatted).toContain('January');
    });

    test('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
    });

    test('should respect locale parameter', () => {
      const date = new Date('2023-01-15');
      const usFormat = formatDate(date, 'en-US');
      const ukFormat = formatDate(date, 'en-GB');
      
      expect(typeof usFormat).toBe('string');
      expect(typeof ukFormat).toBe('string');
    });
  });

  describe('capitalizeWords', () => {
    test('should capitalize each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World');
      expect(capitalizeWords('HELLO WORLD')).toBe('Hello World');
      expect(capitalizeWords('hello WORLD test')).toBe('Hello World Test');
    });

    test('should handle single words', () => {
      expect(capitalizeWords('hello')).toBe('Hello');
      expect(capitalizeWords('HELLO')).toBe('Hello');
    });

    test('should handle invalid inputs', () => {
      expect(capitalizeWords('')).toBe('');
      expect(capitalizeWords(null)).toBe('');
      expect(capitalizeWords(undefined)).toBe('');
      expect(capitalizeWords(123)).toBe('');
    });

    test('should handle extra spaces', () => {
      expect(capitalizeWords('  hello   world  ')).toBe('  Hello   World  ');
    });
  });
});