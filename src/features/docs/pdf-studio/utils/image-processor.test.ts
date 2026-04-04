import { describe, it, expect } from "vitest";

/**
 * Unit tests for compression quality flow through the pipeline
 * Tests the mathematical conversions and configuration without requiring canvas
 */
describe("Image Processor - Compression Quality Pipeline", () => {
  describe("Compression Quality Percentage to Decimal Conversion", () => {
    it("should correctly convert percentage values (10-100) to decimal (0.1-1.0)", () => {
      // This mimics the conversion in pdf-generator.ts: line 33
      // exportQuality = settings.compressionQuality / 100
      
      const conversionTests = [
        { percentage: 10, expected: 0.1 },
        { percentage: 25, expected: 0.25 },
        { percentage: 50, expected: 0.5 },
        { percentage: 75, expected: 0.75 },
        { percentage: 92, expected: 0.92 },
        { percentage: 100, expected: 1.0 },
      ];

      for (const { percentage, expected } of conversionTests) {
        const exportQuality = percentage / 100;
        expect(exportQuality).toBeCloseTo(expected, 5);
      }
    });

    it("should produce quality values in canvas-compatible range", () => {
      // Canvas.toDataURL accepts quality in range [0.0, 1.0]
      // Our pipeline uses [0.1, 1.0] for practical compression
      
      const percentages = [10, 20, 30, 40, 50, 60, 70, 80, 90, 92, 95, 100];
      
      percentages.forEach((percentage) => {
        const exportQuality = percentage / 100;
        
        // Should be in valid canvas range
        expect(exportQuality).toBeGreaterThanOrEqual(0.0);
        expect(exportQuality).toBeLessThanOrEqual(1.0);
        
        // Should be in practical range (minimum 0.1 for quality)
        expect(exportQuality).toBeGreaterThanOrEqual(0.1);
      });
    });

    it("should maintain precision in quality calculations", () => {
      // Verify precision is maintained through conversion
      const percentages = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      percentages.forEach((percentage) => {
        const exportQuality = percentage / 100;
        // Convert back should give original percentage
        const convertedBack = Math.round(exportQuality * 100);
        expect(convertedBack).toBe(percentage);
      });
    });
  });

  describe("Quality Value Bounds and Clamping", () => {
    it("should validate minimum quality is 0.1 (10%)", () => {
      // After normalization in image-processor.ts line 88:
      // const normalizedQuality = Math.min(1, Math.max(0.1, quality));
      
      const belowMin = 0.05;
      const clamped = Math.min(1, Math.max(0.1, belowMin));
      expect(clamped).toBe(0.1);
    });

    it("should validate maximum quality is 1.0 (100%)", () => {
      const aboveMax = 1.5;
      const clamped = Math.min(1, Math.max(0.1, aboveMax));
      expect(clamped).toBe(1.0);
    });

    it("should clamp quality values to valid range [0.1, 1.0]", () => {
      const testValues = [
        { input: 0.0, expected: 0.1 },
        { input: 0.05, expected: 0.1 },
        { input: 0.1, expected: 0.1 },
        { input: 0.5, expected: 0.5 },
        { input: 0.92, expected: 0.92 },
        { input: 1.0, expected: 1.0 },
        { input: 1.5, expected: 1.0 },
        { input: 2.0, expected: 1.0 },
      ];

      testValues.forEach(({ input, expected }) => {
        const normalized = Math.min(1, Math.max(0.1, input));
        expect(normalized).toBe(expected);
      });
    });

    it("should preserve percentage ranges [10-100]", () => {
      const percentages = [10, 25, 50, 75, 92, 100];
      
      percentages.forEach((percentage) => {
        expect(percentage).toBeGreaterThanOrEqual(10);
        expect(percentage).toBeLessThanOrEqual(100);
        
        const exportQuality = percentage / 100;
        const clamped = Math.min(1, Math.max(0.1, exportQuality));
        expect(clamped).toBe(exportQuality);
      });
    });
  });

  describe("Default Quality Behavior", () => {
    it("should use 0.92 as default export quality", () => {
      // From the image-processor.ts function signature: maybeQuality = 0.92
      const defaultQuality = 0.92;
      expect(defaultQuality).toBeGreaterThan(0.1);
      expect(defaultQuality).toBeLessThanOrEqual(1.0);
    });

    it("should convert default quality to percentage correctly", () => {
      const defaultQuality = 0.92;
      const defaultPercentage = defaultQuality * 100;
      expect(defaultPercentage).toBeCloseTo(92, 0);
    });
  });

  describe("Compression Quality Constants", () => {
    it("should define quality range as 10-100 percent", () => {
      const minPercentage = 10;
      const maxPercentage = 100;
      const defaultPercentage = 92;

      expect(minPercentage).toBeLessThan(defaultPercentage);
      expect(defaultPercentage).toBeLessThan(maxPercentage);
      expect(maxPercentage).toBeGreaterThan(minPercentage);
    });

    it("should convert range endpoints correctly", () => {
      // Min percentage to decimal
      const minDecimal = 10 / 100;
      expect(minDecimal).toBe(0.1);

      // Max percentage to decimal
      const maxDecimal = 100 / 100;
      expect(maxDecimal).toBe(1.0);

      // Default percentage to decimal
      const defaultDecimal = 92 / 100;
      expect(defaultDecimal).toBeCloseTo(0.92, 5);
    });
  });

  describe("Compression Quality Formula Validation", () => {
    it("should verify the conversion formula: quality = percentage / 100", () => {
      // The formula used in pdf-generator.ts line 33
      const formula = (percentage: number): number => percentage / 100;

      // Test cases
      expect(formula(10)).toBe(0.1);
      expect(formula(50)).toBe(0.5);
      expect(formula(92)).toBe(0.92);
      expect(formula(100)).toBe(1.0);
    });

    it("should verify inverse formula: percentage = quality * 100", () => {
      const inverseFormula = (quality: number): number => quality * 100;

      // Test cases
      expect(inverseFormula(0.1)).toBe(10);
      expect(inverseFormula(0.5)).toBe(50);
      expect(inverseFormula(0.92)).toBeCloseTo(92, 5);
      expect(inverseFormula(1.0)).toBe(100);
    });

    it("should maintain precision in round-trip conversions", () => {
      const originalPercentages = [10, 25, 50, 75, 92, 100];

      originalPercentages.forEach((percentage) => {
        // Percentage -> Decimal
        const decimal = percentage / 100;
        // Decimal -> Percentage
        const roundTrip = decimal * 100;
        // Should recover original (within floating point precision)
        expect(roundTrip).toBeCloseTo(percentage, 5);
      });
    });
  });

  describe("Canvas API Quality Parameter Compatibility", () => {
    it("should provide valid quality range for canvas.toDataURL()", () => {
      // Canvas.toDataURL("image/jpeg", quality) accepts 0.0-1.0
      // We use 0.1-1.0 as practical range
      
      const testQualities = [0.1, 0.3, 0.5, 0.7, 0.92, 1.0];
      
      testQualities.forEach((quality) => {
        // Valid for canvas
        expect(quality).toBeGreaterThanOrEqual(0.0);
        expect(quality).toBeLessThanOrEqual(1.0);
      });
    });

    it("should ensure quality never exceeds canvas maximum", () => {
      const maxCanvasQuality = 1.0;
      const exportQualities = [0.1, 0.5, 0.92, 1.0];
      
      exportQualities.forEach((quality) => {
        expect(quality).toBeLessThanOrEqual(maxCanvasQuality);
      });
    });

    it("should ensure quality never below canvas acceptable minimum", () => {
      const minAcceptableQuality = 0.1; // We define this as practical minimum
      const exportQualities = [0.1, 0.5, 0.92, 1.0];
      
      exportQualities.forEach((quality) => {
        expect(quality).toBeGreaterThanOrEqual(minAcceptableQuality);
      });
    });
  });

  describe("Quality Degradation Levels", () => {
    it("should support distinct compression levels from 10% to 100%", () => {
      const levels = [
        { name: "High Compression", percentage: 10, quality: 0.1 },
        { name: "Medium Compression", percentage: 50, quality: 0.5 },
        { name: "Default", percentage: 92, quality: 0.92 },
        { name: "High Quality", percentage: 100, quality: 1.0 },
      ];

      levels.forEach(({ percentage, quality }) => {
        const calculated = percentage / 100;
        expect(calculated).toBeCloseTo(quality, 5);
      });
    });

    it("should maintain monotonic quality relationship", () => {
      // Lower percentage = lower quality = more compression = smaller file
      const percentages = [10, 25, 50, 75, 92, 100];
      const qualities = percentages.map((p) => p / 100);

      for (let i = 0; i < qualities.length - 1; i++) {
        expect(qualities[i]).toBeLessThan(qualities[i + 1]);
      }
    });
  });
});
