export class SequenceEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SequenceEngineError";
  }
}

export class SequenceExhaustionError extends SequenceEngineError {
  constructor() {
    super("Sequence counter has exceeded safe integer bounds");
    this.name = "SequenceExhaustionError";
  }
}

export class SequenceNotFoundError extends SequenceEngineError {
  constructor(sequenceId: string) {
    super(`Sequence not found: ${sequenceId}`);
    this.name = "SequenceNotFoundError";
  }
}

export class SequenceIdempotencyConflictError extends SequenceEngineError {
  constructor(idempotencyKey: string) {
    super(
      `Idempotency conflict: a sequence number was already consumed for key "${idempotencyKey}"`
    );
    this.name = "SequenceIdempotencyConflictError";
  }
}

export class SequenceContentionError extends SequenceEngineError {
  constructor(operation: string, originalError?: Error) {
    const cause = originalError ? ` (cause: ${originalError.message})` : "";
    super(`Concurrent ${operation} detected; this may be retried safely${cause}`);
    this.name = "SequenceContentionError";
  }
}

export class SequencePeriodLockError extends SequenceEngineError {
  constructor(periodId: string) {
    super(
      `Cannot acquire lock on sequence period ${periodId}; another operation is in progress`
    );
    this.name = "SequencePeriodLockError";
  }
}
