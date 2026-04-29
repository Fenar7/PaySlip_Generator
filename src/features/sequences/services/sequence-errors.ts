export class SequenceAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SequenceAdminError";
  }
}
