import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  getSchemaDriftActionMessage,
  isModelMissingTableError,
} from "@/lib/prisma-errors";

function makeKnownRequestError(code: string, modelName?: string) {
  const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as {
    code: string;
    meta?: { modelName?: string };
  };
  error.code = code;
  error.meta = modelName ? { modelName } : undefined;
  return error;
}

describe("prisma error helpers", () => {
  it("detects missing-table errors for the requested model", () => {
    const error = makeKnownRequestError("P2021", "Invoice");

    expect(isModelMissingTableError(error, "Invoice")).toBe(true);
    expect(isModelMissingTableError(error, "Notification")).toBe(false);
  });

  it("ignores non-missing-table errors", () => {
    const error = makeKnownRequestError("P2002", "Invoice");

    expect(isModelMissingTableError(error, "Invoice")).toBe(false);
    expect(isModelMissingTableError(new Error("boom"), "Invoice")).toBe(false);
  });

  it("returns an actionable schema drift message", () => {
    expect(getSchemaDriftActionMessage("save the invoice")).toBe(
      "Failed to save the invoice. The database schema is not up to date. Run the Prisma migrations and try again.",
    );
  });
});
