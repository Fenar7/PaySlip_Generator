import { describe, it, expect } from "vitest";
import {
  calculatePasswordStrength,
  validatePasswords,
  validateOwnerPassword,
  validatePasswordPermissions,
  validatePasswordSettings,
  arePasswordsEqual,
  getPasswordStrengthColor,
  getPasswordErrors,
  isPasswordSettingsValid,
  sanitizePasswordSettings,
  getPasswordStrengthDescription,
  INVALID_PASSWORD_PERMISSIONS_MESSAGE,
  PDF_STUDIO_PASSWORD_MAX_LENGTH,
} from "./password";
import type { PasswordSettings, PasswordValidation } from "../types";

describe("Password Utility Functions", () => {
  describe("calculatePasswordStrength", () => {
    it("should return weak strength for empty password", () => {
      const result = calculatePasswordStrength("");
      expect(result.strength).toBe("weak");
      expect(result.score).toBe(0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password is required");
    });

    it("should calculate correct scores for various password types", () => {
      // Single character: 1 length + 2 lowercase = 3 points
      expect(calculatePasswordStrength("a").score).toBe(3);

      // Simple word: 8 length + 2 lowercase = 10 points
      expect(calculatePasswordStrength("password").score).toBe(10);

      // Mixed case with numbers: 9 length + 2 upper + 2 lower + 2 numbers = 15 points
      expect(calculatePasswordStrength("Password1").score).toBe(15);

      // Full variety: 10 length + 2 upper + 2 lower + 2 numbers + 2 symbols = 18 points (max)
      expect(calculatePasswordStrength("Password1!").score).toBe(18);

      // Long password caps at 10 length points: 10 length + 2 upper + 2 lower + 2 numbers + 2 symbols = 18 points
      expect(calculatePasswordStrength("VeryLongPassword123!").score).toBe(18);
    });

    it("should assign correct strength levels based on score thresholds", () => {
      expect(calculatePasswordStrength("a").strength).toBe("weak"); // score: 3
      expect(calculatePasswordStrength("hello").strength).toBe("fair"); // score: 7
      expect(calculatePasswordStrength("password").strength).toBe("good"); // score: 10
      expect(calculatePasswordStrength("Password1!").strength).toBe("strong"); // score: 18
    });

    it("should mark non-empty passwords as valid", () => {
      expect(calculatePasswordStrength("test").isValid).toBe(true);
      expect(calculatePasswordStrength("test").errors).not.toContain("Password is required");
    });
  });

  describe("validatePasswords", () => {
    it("should validate matching passwords", () => {
      const result = validatePasswords("test123", "test123");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect password mismatch", () => {
      const result = validatePasswords("test123", "different");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Passwords do not match");
    });

    it("should detect missing confirmation", () => {
      const result = validatePasswords("test123", "");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Please confirm your password");
    });

    it("should handle empty passwords correctly", () => {
      const result = validatePasswords("", "");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password is required");
    });

    it("should reject passwords exceeding max length", () => {
      const tooLong = "a".repeat(PDF_STUDIO_PASSWORD_MAX_LENGTH + 1);
      const result = validatePasswords(tooLong, tooLong);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Password must be ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters or fewer`,
      );
    });

    it("should accept passwords at exactly max length", () => {
      const atLimit = "a".repeat(PDF_STUDIO_PASSWORD_MAX_LENGTH);
      const result = validatePasswords(atLimit, atLimit);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("validateOwnerPassword", () => {
    it("should accept empty owner password", () => {
      const result = validateOwnerPassword("");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept owner password within max length", () => {
      const result = validateOwnerPassword("owner-pass");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject owner password exceeding max length", () => {
      const tooLong = "o".repeat(PDF_STUDIO_PASSWORD_MAX_LENGTH + 1);
      const result = validateOwnerPassword(tooLong);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Owner password must be ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters or fewer`,
      );
    });
  });

  describe("validatePasswordSettings", () => {
    it("should return valid for disabled settings", () => {
      const settings: PasswordSettings = {
        enabled: false,
        userPassword: "",
        confirmPassword: "",
        permissions: { printing: true, copying: true, modifying: true },
      };
      const result = validatePasswordSettings(settings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return valid for matching user password and valid owner password", () => {
      const settings: PasswordSettings = {
        enabled: true,
        userPassword: "test123",
        confirmPassword: "test123",
        ownerPassword: "owner",
        permissions: { printing: true, copying: true, modifying: true },
      };
      const result = validatePasswordSettings(settings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should combine user and owner password errors", () => {
      const tooLong = "x".repeat(PDF_STUDIO_PASSWORD_MAX_LENGTH + 1);
      const settings: PasswordSettings = {
        enabled: true,
        userPassword: tooLong,
        confirmPassword: tooLong,
        ownerPassword: tooLong,
        permissions: { printing: true, copying: true, modifying: true },
      };
      const result = validatePasswordSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Password must be ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters or fewer`,
      );
      expect(result.errors).toContain(
        `Owner password must be ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters or fewer`,
      );
    });

    it("should reject malformed permission values", () => {
      const settings = {
        enabled: true,
        userPassword: "test123",
        confirmPassword: "test123",
        permissions: {
          printing: "yes",
          copying: true,
          modifying: true,
        } as unknown as PasswordSettings["permissions"],
      } satisfies PasswordSettings;
      const result = validatePasswordSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(INVALID_PASSWORD_PERMISSIONS_MESSAGE);
    });
  });

  describe("validatePasswordPermissions", () => {
    it("should accept full boolean permission objects", () => {
      const result = validatePasswordPermissions({
        printing: true,
        copying: false,
        modifying: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should allow missing permission fields when requested", () => {
      const result = validatePasswordPermissions(
        {
          printing: false,
        },
        { allowMissing: true },
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject non-boolean permission values", () => {
      const result = validatePasswordPermissions({
        printing: "no",
        copying: true,
        modifying: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(INVALID_PASSWORD_PERMISSIONS_MESSAGE);
    });
  });

  describe("arePasswordsEqual", () => {
    it("should return true for identical passwords", () => {
      expect(arePasswordsEqual("test", "test")).toBe(true);
    });

    it("should return false for different passwords", () => {
      expect(arePasswordsEqual("test", "different")).toBe(false);
    });

    it("should handle empty/null cases", () => {
      expect(arePasswordsEqual("", "")).toBe(true);
      expect(arePasswordsEqual("test", "")).toBe(false);
      expect(arePasswordsEqual("", "test")).toBe(false);
    });
  });

  describe("getPasswordStrengthColor", () => {
    it("should return correct colors for each strength level", () => {
      expect(getPasswordStrengthColor("weak")).toBe("red");
      expect(getPasswordStrengthColor("fair")).toBe("yellow");
      expect(getPasswordStrengthColor("good")).toBe("lightgreen");
      expect(getPasswordStrengthColor("strong")).toBe("green");
    });

    it("should handle invalid strength levels", () => {
      const invalidStrength = "invalid" as PasswordValidation['strength'];
      expect(getPasswordStrengthColor(invalidStrength)).toBe("gray");
    });
  });

  describe("getPasswordErrors", () => {
    it("should return empty array for valid passwords", () => {
      const errors = getPasswordErrors("test123", "test123");
      expect(errors).toHaveLength(0);
    });

    it("should return appropriate errors for invalid cases", () => {
      expect(getPasswordErrors("", "")).toContain("Password is required");
      expect(getPasswordErrors("test", "different")).toContain("Passwords do not match");
    });
  });

  describe("isPasswordSettingsValid", () => {
    it("should return true for disabled password settings", () => {
      const settings: PasswordSettings = {
        enabled: false,
        userPassword: "",
        confirmPassword: "",
        permissions: { printing: true, copying: true, modifying: true },
      };
      expect(isPasswordSettingsValid(settings)).toBe(true);
    });

    it("should validate enabled password settings", () => {
      const validSettings: PasswordSettings = {
        enabled: true,
        userPassword: "test123",
        confirmPassword: "test123",
        permissions: { printing: true, copying: true, modifying: true },
      };
      expect(isPasswordSettingsValid(validSettings)).toBe(true);

      const invalidSettings: PasswordSettings = {
        enabled: true,
        userPassword: "test123",
        confirmPassword: "different",
        permissions: { printing: true, copying: true, modifying: true },
      };
      expect(isPasswordSettingsValid(invalidSettings)).toBe(false);
    });

    it("should invalidate enabled settings with too-long owner password", () => {
      const settings: PasswordSettings = {
        enabled: true,
        userPassword: "test123",
        confirmPassword: "test123",
        ownerPassword: "o".repeat(PDF_STUDIO_PASSWORD_MAX_LENGTH + 1),
        permissions: { printing: true, copying: true, modifying: true },
      };
      expect(isPasswordSettingsValid(settings)).toBe(false);
    });
  });

  describe("sanitizePasswordSettings", () => {
    it("should provide proper defaults for partial settings", () => {
      const result = sanitizePasswordSettings({});
      expect(result).toEqual({
        enabled: false,
        userPassword: "",
        confirmPassword: "",
        ownerPassword: undefined,
        permissions: {
          printing: true,
          copying: true,
          modifying: true,
        },
      });
    });

    it("should preserve valid settings", () => {
      const input = {
        enabled: true,
        userPassword: "test",
        confirmPassword: "test",
        permissions: { printing: false, copying: false, modifying: false },
      };
      const result = sanitizePasswordSettings(input);
      expect(result.enabled).toBe(true);
      expect(result.userPassword).toBe("test");
      expect(result.permissions.printing).toBe(false);
    });

    it("should handle invalid types gracefully", () => {
      const invalidSettings = {
        enabled: "invalid",
        userPassword: 123,
        permissions: "invalid",
      } as unknown as Partial<PasswordSettings>;
      const result = sanitizePasswordSettings(invalidSettings);
      expect(result.enabled).toBe(false);
      expect(result.userPassword).toBe("");
      expect(result.permissions.printing).toBe(true); // default
    });
  });

  describe("getPasswordStrengthDescription", () => {
    it("should return appropriate descriptions for each strength level", () => {
      expect(getPasswordStrengthDescription("weak")).toContain("Weak");
      expect(getPasswordStrengthDescription("fair")).toContain("Fair");
      expect(getPasswordStrengthDescription("good")).toContain("Good");
      expect(getPasswordStrengthDescription("strong")).toContain("Strong");
    });

    it("should handle invalid strength levels", () => {
      const invalidStrength = "invalid" as PasswordValidation['strength'];
      expect(getPasswordStrengthDescription(invalidStrength)).toBe("Unknown strength level");
    });
  });
});
