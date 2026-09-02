import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Unexpected server error.';
  let details = error.details;

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier.';
  }

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation failed.';
    details = error.errors;
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate record conflict.';
    details = error.keyValue;
  }

  if (statusCode >= 500) {
    console.error(
      JSON.stringify({
        requestId: req.id,
        message,
        stack: error.stack,
        details
      })
    );
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: statusCode >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error.' : message,
      details
    }
  });
}
