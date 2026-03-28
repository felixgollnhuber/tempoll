export class AppError extends Error {
  status: number;
  code: string;
  headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: {
      headers?: Record<string, string>;
    },
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.headers = options?.headers;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function badRequest(message: string, code = "bad_request") {
  return new AppError(400, code, message);
}

export function unauthorized(message: string, code = "unauthorized") {
  return new AppError(401, code, message);
}

export function forbidden(message: string, code = "forbidden") {
  return new AppError(403, code, message);
}

export function notFound(message: string, code = "not_found") {
  return new AppError(404, code, message);
}

export function conflict(message: string, code = "conflict") {
  return new AppError(409, code, message);
}

export function tooManyRequests(
  message: string,
  retryAfterSeconds: number,
  headers?: Record<string, string>,
) {
  return new AppError(429, "rate_limited", message, {
    headers: {
      "Retry-After": String(retryAfterSeconds),
      ...headers,
    },
  });
}
