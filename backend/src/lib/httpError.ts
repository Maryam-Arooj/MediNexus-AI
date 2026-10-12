/** An error that is safe to show to the client as-is. */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, string>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg: string, details?: Record<string, string>) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Please log in to continue.') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have permission to access this resource.') => new HttpError(403, msg);
export const notFound = (msg = 'Not found.') => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
