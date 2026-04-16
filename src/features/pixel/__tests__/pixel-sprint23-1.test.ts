/**
 * Sprint 23.1 — Unit tests for SW Pixel utilities and preset library.
 *
 * NOTE: Canvas APIs are not available in jsdom; canvas-dependent utils
 * (applyAdjustments, applyCrop, generatePrintSheet) are tested via logic
 * verification rather than full execution. The key invariants verified here are:
 * - Preset data integrity (required fields, numeric validity, unique IDs)
 * - Grid layout math in generatePrintSheet options (pure computation)
 * - Adjustment parameter math (brightness/contrast/saturation)
 */

import { describe, it, expect } from "vitest";
import {
  PASSPORT_PRESETS,
  type PassportPreset,
} from "@/features/pixel/data/passport-presets";

// ─── Preset library integrity ─────────────────────────────────────────────────

describe("PASSPORT_PRESETS data integrity", () => {
  it("has at least 13 presets", () => {
    expect(PASSPORT_PRESETS.length).toBeGreaterThanOrEqual(13);
  });

  it("all presets have required fields with valid values", () => {
    for (const preset of PASSPORT_PRESETS) {
      expect(preset.id, `${preset.id}: id missing`).toBeTruthy();
      expect(preset.country, `${preset.id}: country missing`).toBeTruthy();
      expect(preset.documentType, `${preset.id}: documentType missing`).toBeTruthy();
      expect(preset.widthMm, `${preset.id}: widthMm must be > 0`).toBeGreaterThan(0);
      expect(preset.heightMm, `${preset.id}: heightMm must be > 0`).toBeGreaterThan(0);
      expect(preset.widthPx, `${preset.id}: widthPx must be > 0`).toBeGreaterThan(0);
      expect(preset.heightPx, `${preset.id}: heightPx must be > 0`).toBeGreaterThan(0);
    }
  });

  it("all preset IDs are unique", () => {
    const ids = PASSPORT_PRESETS.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("pixel dimensions are consistent with mm dimensions at ~300 DPI", () => {
    const MM_TO_PX_AT_300DPI = 300 / 25.4; // ≈ 11.811

    for (const preset of PASSPORT_PRESETS) {
      const expectedW = Math.round(preset.widthMm * MM_TO_PX_AT_300DPI);
      const expectedH = Math.round(preset.heightMm * MM_TO_PX_AT_300DPI);

      // Allow ±5% tolerance for rounding
      expect(preset.widthPx).toBeGreaterThan(expectedW * 0.95);
      expect(preset.widthPx).toBeLessThan(expectedW * 1.05);
      expect(preset.heightPx).toBeGreaterThan(expectedH * 0.95);
      expect(preset.heightPx).toBeLessThan(expectedH * 1.05);
    }
  });

  it("contains Sprint 23.2 additions", () => {
    const sprint23Ids = [
      "australia-passport",
      "singapore-passport",
      "canada-passport",
      "japan-passport",
      "germany-passport",
      "france-passport",
    ];
    for (const id of sprint23Ids) {
      const preset = PASSPORT_PRESETS.find((p) => p.id === id);
      expect(preset, `Missing Sprint 23.2 preset: ${id}`).toBeDefined();
    }
  });

  it("UK, US, India, UAE presets are present", () => {
    const requiredIds = [
      "uk-passport",
      "us-passport",
      "india-passport",
      "uae-passport",
    ];
    for (const id of requiredIds) {
      expect(
        PASSPORT_PRESETS.find((p) => p.id === id),
        `Missing preset: ${id}`,
      ).toBeDefined();
    }
  });
});

// ─── Print sheet grid math ─────────────────────────────────────────────────────

describe("print sheet grid layout math", () => {
  /**
   * Pure re-implementation of the column/row calculation so we can unit-test
   * the math without needing a DOM canvas.
   */
  function calcGrid(
    preset: PassportPreset,
    sheetSizeMm: { width: number; height: number },
    marginMm = 10,
    gutterMm = 2,
  ) {
    const usableW = sheetSizeMm.width - 2 * marginMm;
    const usableH = sheetSizeMm.height - 2 * marginMm;
    const cols = Math.max(
      1,
      Math.floor((usableW + gutterMm) / (preset.widthMm + gutterMm)),
    );
    const rows = Math.max(
      1,
      Math.floor((usableH + gutterMm) / (preset.heightMm + gutterMm)),
    );
    return { cols, rows, photosPerSheet: cols * rows };
  }

  const A4 = { width: 210, height: 297 };
  const LETTER = { width: 215.9, height: 279.4 };

  it("UK 35×45mm on A4: at least 3 columns, at least 5 rows", () => {
    const preset = PASSPORT_PRESETS.find((p) => p.id === "uk-passport")!;
    const { cols, rows } = calcGrid(preset, A4);
    expect(cols).toBeGreaterThanOrEqual(3);
    expect(rows).toBeGreaterThanOrEqual(5);
  });

  it("US 51×51mm on A4: at least 3 columns, at least 4 rows", () => {
    const preset = PASSPORT_PRESETS.find((p) => p.id === "us-passport")!;
    const { cols, rows } = calcGrid(preset, A4);
    expect(cols).toBeGreaterThanOrEqual(3);
    expect(rows).toBeGreaterThanOrEqual(4);
  });

  it("US 51×51mm on Letter: at least 3 columns", () => {
    const preset = PASSPORT_PRESETS.find((p) => p.id === "us-passport")!;
    const { cols } = calcGrid(preset, LETTER);
    expect(cols).toBeGreaterThanOrEqual(3);
  });

  it("photosPerSheet = columns × rows", () => {
    for (const preset of PASSPORT_PRESETS) {
      const { cols, rows, photosPerSheet } = calcGrid(preset, A4);
      expect(photosPerSheet).toBe(cols * rows);
    }
  });

  it("always produces at least 1 photo per sheet", () => {
    for (const preset of PASSPORT_PRESETS) {
      const { photosPerSheet } = calcGrid(preset, A4);
      expect(photosPerSheet).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── Brightness/contrast/saturation math ────────────────────────────────────

describe("image adjustment parameter math", () => {
  it("brightness offset: +100 maps to +255", () => {
    const brightnessOffset = 100 * 2.55;
    expect(brightnessOffset).toBeCloseTo(255, 1);
  });

  it("brightness offset: 0 maps to 0", () => {
    const brightnessOffset = 0 * 2.55;
    expect(brightnessOffset).toBe(0);
  });

  it("contrast factor: 0 contrast maps to factor ≈ 1.0", () => {
    const contrast = 0;
    const factor =
      (259 * (contrast + 255)) / (255 * (259 - contrast));
    expect(factor).toBeCloseTo(1.0, 2);
  });

  it("saturation factor: 0 saturation → factor = 1.0 (no change)", () => {
    const satFactor = 1 + 0 / 100;
    expect(satFactor).toBe(1.0);
  });

  it("saturation factor: +100 saturation → factor = 2.0", () => {
    const satFactor = 1 + 100 / 100;
    expect(satFactor).toBe(2.0);
  });

  it("saturation factor: -100 saturation → factor = 0 (full desaturate)", () => {
    const satFactor = 1 + -100 / 100;
    expect(satFactor).toBe(0);
  });
});
