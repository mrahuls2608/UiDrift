export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`);
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'You do not have access to this.');
export const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Please log in.');
