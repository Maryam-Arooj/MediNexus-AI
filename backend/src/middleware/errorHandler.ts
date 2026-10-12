import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/httpError';

interface PrismaLikeError {
  name?: string;
  code?: string;
}

function zodDetails(err: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || 'body';
    if (!details[key]) details[key] = issue.message;
  }
  return details;
}

/**
 * Central error handler. Clients only ever receive safe, human-readable messages.
 * Logs contain the method, path, status and error type/code — never request bodies, tokens,
 * passwords, database URLs or raw database messages (which can include patient data).
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let details: Record<string, string> | undefined;

  if (err instanceof HttpError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    details = zodDetails(err);
    message = Object.values(details)[0] || 'Invalid input.';
  } else if ((err as { type?: string })?.type === 'entity.too.large') {
    status = 413;
    message = 'The upload is too large. The maximum file size is 4 MB.';
  } else if (err instanceof SyntaxError && 'body' in (err as object)) {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else {
    const code = (err as PrismaLikeError)?.code;
    if (code === 'P2002') {
      status = 409;
      message = 'This record already exists.';
    } else if (code === 'P2025') {
      status = 404;
      message = 'Not found.';
    } else if (code === 'P2028' || code === 'P2034') {
      status = 503;
      message = 'The server is busy. Please try again in a moment.';
    }
  }

  if (status >= 500) {
    const e = err as PrismaLikeError & { stack?: string };
    // Only the "at file:line" frames — never the message, which for database errors can echo patient data.
    const where = (e?.stack || '')
      .split('\n')
      .filter((l) => l.trimStart().startsWith('at '))
      .slice(0, 3)
      .map((l) => l.trim())
      .join(' | ');
    console.error(`[error] ${req.method} ${req.path} -> ${status} ${e?.name ?? 'Error'}${e?.code ? ` (${e.code})` : ''} ${where}`);
  }

  res.status(status).json({ success: false, error: message, ...(details ? { details } : {}) });
}
