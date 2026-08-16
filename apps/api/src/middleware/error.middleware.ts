import { ErrorRequestHandler } from 'express';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }

  if ((error as { code?: string }).code === 'P2002') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with this value already exists' } });
  }

  return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } });
};
