/**
 * Password Strength Validator
 * Validates password strength according to security best practices
 */

class PasswordValidator {
  /**
   * Validate password strength
   * @param {string} password - The password to validate
   * @returns {object} - Validation result with isValid and errors array
   */
  static validate(password) {
    const errors = [];

    // Check minimum length (8 characters)
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Check maximum length (128 characters)
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords (basic list)
    const commonPasswords = [
      'password', 'password123', '12345678', 'qwerty123',
      'abc123', 'monkey', '123456789', 'welcome1',
      'admin123', 'letmein', 'trustno1', 'iloveyou'
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Express validator middleware for password validation
   */
  static validateMiddleware(req, res, next) {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required'
      });
    }

    const validation = this.validate(password);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: validation.errors
      });
    }

    next();
  }

  /**
   * Get password requirements for UI display
   */
  static getRequirements() {
    return [
      { text: 'At least 8 characters long', met: false },
      { text: 'Contains uppercase letter', met: false },
      { text: 'Contains lowercase letter', met: false },
      { text: 'Contains number', met: false },
      { text: 'Contains special character', met: false }
    ];
  }
}

module.exports = PasswordValidator;
