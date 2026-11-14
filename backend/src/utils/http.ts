import type { Response } from 'express';

const error = (code: string, message: string, details?: unknown) => {
  const result: { error: { code: string; message: string; details?: unknown } } = {
    error: { code, message },
  };
  if (details !== undefined) result.error.details = details;
  return result;
};

export function sendError(res: Response, status: number, code: string, message: string, details?: unknown) {
  res.status(status).json(error(code, message, details));
}
