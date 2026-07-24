export type ApiErrorBody = {
  error: string;
  field?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly field?: string;

  constructor(status: number, error: string, field?: string) {
    super(error);
    this.name = "ApiError";
    this.status = status;
    this.field = field;
  }

  toJSON(): ApiErrorBody {
    return this.field
      ? { error: this.message, field: this.field }
      : { error: this.message };
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
