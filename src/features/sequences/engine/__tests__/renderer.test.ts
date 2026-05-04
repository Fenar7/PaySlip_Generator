import { describe, expect, it } from "vitest";
import { render, buildRenderContext } from "../renderer";
import { tokenize } from "../tokenizer";

describe("render", () => {
  it("renders a simple prefix + year + number format", () => {
    const tokens = tokenize("INV/{YYYY}/{NNNNN}");
    const context = buildRenderContext(new Date("2026-04-28"), "INV", 42);
    expect(render(tokens, context)).toBe("INV/2026/00042");
  });

  it("renders with 3-digit padding", () => {
    const tokens = tokenize("VCH/{YYYY}/{NNN}");
    const context = buildRenderContext(new Date("2026-04-28"), "VCH", 7);
    expect(render(tokens, context)).toBe("VCH/2026/007");
  });

  it("renders month and day tokens", () => {
    const tokens = tokenize("REC/{YYYY}/{MM}/{DD}/{NNNNN}");
    const context = buildRenderContext(new Date("2026-04-28"), "REC", 1);
    expect(render(tokens, context)).toBe("REC/2026/04/28/00001");
  });

  it("renders FY token", () => {
    const tokens = tokenize("INV/FY{FY}/{NNNNN}");
    const context = buildRenderContext(new Date("2026-04-28"), "INV", 1);
    expect(render(tokens, context)).toBe("INV/FYFY26-27/00001");
  });

  it("renders large sequence numbers", () => {
    const tokens = tokenize("INV/{YYYY}/{NNNNN}");
    const context = buildRenderContext(new Date("2026-04-28"), "INV", 99999);
    expect(render(tokens, context)).toBe("INV/2026/99999");
  });
});
