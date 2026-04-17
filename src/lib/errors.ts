export class AppError extends Error {
  status: number;
  code: string;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    options?: {
      params?: Record<string, string | number>;
      headers?: Record<string, string>;
    },
  ) {
    super(code);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.params = options?.params;
    this.headers = options?.headers;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function badRequest(
  code = "bad_request",
  options?: {
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
  },
) {
  return new AppError(400, code, options);
}

export function unauthorized(
  code = "unauthorized",
  options?: {
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
  },
) {
  return new AppError(401, code, options);
}

export function forbidden(
  code = "forbidden",
  options?: {
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
  },
) {
  return new AppError(403, code, options);
}

export function notFound(
  code = "not_found",
  options?: {
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
  },
) {
  return new AppError(404, code, options);
}

export function conflict(
  code = "conflict",
  options?: {
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
  },
) {
  return new AppError(409, code, options);
}

export function tooManyRequests(
  code: string,
  retryAfterSeconds: number,
  options?: {
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
  },
) {
  return new AppError(429, code, {
    params: options?.params,
    headers: {
      "Retry-After": String(retryAfterSeconds),
      ...options?.headers,
    },
  });
}

export function serviceUnavailable(
  code = "service_unavailable",
  options?: {
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
  },
) {
  return new AppError(503, code, options);
}
