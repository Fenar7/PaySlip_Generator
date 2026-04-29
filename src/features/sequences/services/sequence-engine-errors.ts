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
