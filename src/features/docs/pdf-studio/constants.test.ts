import { describe, expect, it } from "vitest";
import {
  PASSWORD_PERMISSION_PRESETS,
  WATERMARK_TEXT_PRESETS,
} from "@/features/docs/pdf-studio/constants";

describe("pdf studio Phase 32 constants", () => {
  it("keeps password permission presets explicit and operator-friendly", () => {
    expect(PASSWORD_PERMISSION_PRESETS.balanced.permissions).toEqual({
      printing: true,
      copying: true,
      modifying: false,
    });
    expect(PASSWORD_PERMISSION_PRESETS["view-only"].permissions).toEqual({
      printing: false,
      copying: false,
      modifying: false,
    });
    expect(PASSWORD_PERMISSION_PRESETS.restricted.permissions).toEqual({
      printing: true,
      copying: false,
      modifying: false,
    });
  });

  it("ships the dedicated watermark text presets required by Phase 32", () => {
    expect(WATERMARK_TEXT_PRESETS.draft).toMatchObject({
      id: "draft",
      text: "DRAFT",
    });
    expect(WATERMARK_TEXT_PRESETS.confidential).toMatchObject({
      id: "confidential",
      text: "CONFIDENTIAL",
    });
    expect(WATERMARK_TEXT_PRESETS.paid).toMatchObject({
      id: "paid",
      text: "PAID",
    });
    expect(WATERMARK_TEXT_PRESETS.copy).toMatchObject({
      id: "copy",
      text: "COPY",
    });
  });
});
