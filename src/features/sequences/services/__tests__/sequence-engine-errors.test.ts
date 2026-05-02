import { describe, expect, it } from "vitest";
import {
  SequenceEngineError,
  SequenceExhaustionError,
  SequenceNotFoundError,
  SequenceIdempotencyConflictError,
  SequenceContentionError,
  SequencePeriodLockError,
} from "../sequence-engine-errors";

describe("sequence-engine errors", () => {
  it("SequenceEngineError has correct name and message", () => {
    const err = new SequenceEngineError("test message");
    expect(err.name).toBe("SequenceEngineError");
    expect(err.message).toBe("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("SequenceExhaustionError inherits from SequenceEngineError", () => {
    const err = new SequenceExhaustionError();
    expect(err).toBeInstanceOf(SequenceEngineError);
    expect(err.name).toBe("SequenceExhaustionError");
    expect(err.message).toContain("safe integer bounds");
  });

  it("SequenceNotFoundError includes the sequence id", () => {
    const err = new SequenceNotFoundError("seq-123");
    expect(err).toBeInstanceOf(SequenceEngineError);
    expect(err.message).toContain("seq-123");
  });

  it("SequenceIdempotencyConflictError includes the idempotency key", () => {
    const err = new SequenceIdempotencyConflictError("doc-abc");
    expect(err).toBeInstanceOf(SequenceEngineError);
    expect(err.message).toContain("doc-abc");
  });

  it("SequenceContentionError includes the operation name", () => {
    const err = new SequenceContentionError("period creation");
    expect(err).toBeInstanceOf(SequenceEngineError);
    expect(err.message).toContain("period creation");
    expect(err.message).toContain("may be retried safely");
  });

  it("SequenceContentionError includes original error cause when provided", () => {
    const original = new Error("P2002 constraint violation");
    const err = new SequenceContentionError("period creation", original);
    expect(err.message).toContain("P2002 constraint violation");
  });

  it("SequencePeriodLockError includes the period id", () => {
    const err = new SequencePeriodLockError("period-42");
    expect(err).toBeInstanceOf(SequenceEngineError);
    expect(err.message).toContain("period-42");
    expect(err.message).toContain("lock");
  });
});
