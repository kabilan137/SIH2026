import { AppError } from '../utils/AppError.js';

export function validateRequest(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(
        new AppError(400, 'Request validation failed.', {
          fieldErrors: result.error.flatten().fieldErrors
        })
      );
    }

    req.validatedBody = result.data;
    return next();
  };
}
