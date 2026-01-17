import { Request, Response, NextFunction } from 'express';

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export class AppError extends Error implements ApiError {
  status: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Sunucu hatası oluştu',
  });
}
