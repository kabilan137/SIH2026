export class AppError extends Error {
  constructor(statusCode, message, details = undefined, code = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.isOperational = true;
  }
}
