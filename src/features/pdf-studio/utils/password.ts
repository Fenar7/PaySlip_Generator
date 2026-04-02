"use client";

import type { PasswordSettings, PasswordValidation } from "../types";

/**
 * Calculates password strength using 18-point scoring system
 * 
 * Scoring breakdown:
 * - Length: 1 point per character (max 10 points)
 * - Uppercase letters: +2 points if present
 * - Lowercase letters: +2 points if present
 * - Numbers: +2 points if present
 * - Symbols: +2 points if present
 * 
 * Strength thresholds:
 * - 0-5: Weak (red)
 * - 6-8: Fair (yellow)
 * - 9-11: Good (light green)
 * - 12+: Strong (green)
 * 
 * @param password - The password to evaluate
 * @returns PasswordValidation object with strength assessment
 */
export function calculatePasswordStrength(password: string): PasswordValidation {
  let score = 0;
  const errors: string[] = [];
  
  // Length scoring (up to 10 points)
  score += Math.min(password.length, 10);
  
  // Character variety scoring (2 points each)
  if (/[A-Z]/.test(password)) score += 2; // Uppercase
  if (/[a-z]/.test(password)) score += 2; // Lowercase  
  if (/[0-9]/.test(password)) score += 2; // Numbers
  if (/[^A-Za-z0-9]/.test(password)) score += 2; // Symbols
  
  // Determine strength based on score thresholds
  let strength: PasswordValidation['strength'];
  if (score < 6) strength = 'weak';
  else if (score < 9) strength = 'fair';
  else if (score < 12) strength = 'good';
  else strength = 'strong';
  
  // Basic validation
  const isValid = password.length > 0;
  if (!isValid) {
    errors.push("Password is required");
  }
  
  return {
    isValid,
    errors,
    strength,
    score
  };
}

/**
 * Validates that passwords meet requirements and match each other
 * 
 * @param userPassword - The main password
 * @param confirmPassword - The confirmation password
 * @returns PasswordValidation object with combined validation results
 */
export function validatePasswords(
  userPassword: string, 
  confirmPassword: string
): PasswordValidation {
  const strengthResult = calculatePasswordStrength(userPassword);
  const errors = [...strengthResult.errors];
  
  // Check if passwords match
  if (userPassword !== confirmPassword) {
    errors.push("Passwords do not match");
  }
  
  // Check if confirm password is provided when user password exists
  if (userPassword && !confirmPassword) {
    errors.push("Please confirm your password");
  }
  
  const isValid = strengthResult.isValid && userPassword === confirmPassword;
  
  return {
    isValid,
    errors,
    strength: strengthResult.strength,
    score: strengthResult.score
  };
}

/**
 * Simple equality check for passwords with proper handling of edge cases
 * 
 * @param pass1 - First password
 * @param pass2 - Second password
 * @returns true if passwords are equal
 */
export function arePasswordsEqual(pass1: string, pass2: string): boolean {
  // Handle null/undefined cases
  if (!pass1 && !pass2) return true;
  if (!pass1 || !pass2) return false;
  
  return pass1 === pass2;
}

/**
 * Returns appropriate CSS color class for password strength indicators
 * 
 * @param strength - The password strength level
 * @returns CSS color string for UI styling
 */
export function getPasswordStrengthColor(strength: PasswordValidation['strength']): string {
  switch (strength) {
    case 'weak':
      return 'red';
    case 'fair':
      return 'yellow';
    case 'good':
      return 'lightgreen';
    case 'strong':
      return 'green';
    default:
      return 'gray';
  }
}

/**
 * Returns array of user-friendly validation error messages
 * 
 * @param userPassword - The main password
 * @param confirmPassword - The confirmation password
 * @returns Array of error messages
 */
export function getPasswordErrors(userPassword: string, confirmPassword: string): string[] {
  const validation = validatePasswords(userPassword, confirmPassword);
  return validation.errors;
}

/**
 * Checks if password settings are valid and complete
 * 
 * @param settings - The password settings to validate
 * @returns true if settings are valid for PDF encryption
 */
export function isPasswordSettingsValid(settings: PasswordSettings): boolean {
  if (!settings.enabled) return true; // Disabled is valid
  
  const validation = validatePasswords(settings.userPassword, settings.confirmPassword);
  return validation.isValid;
}

/**
 * Sanitizes password settings to ensure they meet security requirements
 * 
 * @param settings - Raw password settings
 * @returns Sanitized password settings with proper defaults
 */
export function sanitizePasswordSettings(settings: Partial<PasswordSettings>): PasswordSettings {
  return {
    enabled: typeof settings?.enabled === 'boolean' ? settings.enabled : false,
    userPassword: typeof settings?.userPassword === 'string' ? settings.userPassword : '',
    confirmPassword: typeof settings?.confirmPassword === 'string' ? settings.confirmPassword : '',
    ownerPassword: typeof settings?.ownerPassword === 'string' ? settings.ownerPassword : undefined,
    permissions: {
      printing: typeof settings?.permissions?.printing === 'boolean' ? settings.permissions.printing : true,
      copying: typeof settings?.permissions?.copying === 'boolean' ? settings.permissions.copying : true, 
      modifying: typeof settings?.permissions?.modifying === 'boolean' ? settings.permissions.modifying : true,
    },
  };
}

/**
 * Gets password strength description for accessibility and UI
 * 
 * @param strength - The password strength level
 * @returns Human-readable strength description
 */
export function getPasswordStrengthDescription(strength: PasswordValidation['strength']): string {
  switch (strength) {
    case 'weak':
      return 'Weak - Consider adding more characters and variety';
    case 'fair':
      return 'Fair - Add uppercase, numbers, or symbols for better security';
    case 'good':
      return 'Good - Your password has decent strength';
    case 'strong':
      return 'Strong - Excellent password security';
    default:
      return 'Unknown strength level';
  }
}