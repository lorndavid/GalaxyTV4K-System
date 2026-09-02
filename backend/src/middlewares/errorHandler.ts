import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Unhandled server error:', err);

  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction
    ? 'An unexpected internal server error occurred.'
    : err.message || 'Internal Server Error';

  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    message,
    500,
    isProduction ? undefined : { stack: err.stack }
  );
}
