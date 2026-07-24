import { ApiError } from "../errors.js";

export type ValidatedCategoryCreate = {
  name: string;
  monthlyBudgetLimit: number;
};

export type ValidatedCategoryUpdate = ValidatedCategoryCreate;

function requireNonEmptyString(
  value: unknown,
  field: string,
  label: string,
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `${label} is required`, field);
  }
  return value.trim();
}

function requireNonNegativeInt(
  value: unknown,
  field: string,
  label: string,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ApiError(
      400,
      `${label} must be an integer greater than or equal to 0`,
      field,
    );
  }
  return value;
}

export function validateCategoryCreate(body: unknown): ValidatedCategoryCreate {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Request body must be a JSON object");
  }
  const data = body as Record<string, unknown>;
  return {
    name: requireNonEmptyString(data.name, "name", "Name"),
    monthlyBudgetLimit: requireNonNegativeInt(
      data.monthlyBudgetLimit,
      "monthlyBudgetLimit",
      "Monthly budget limit",
    ),
  };
}

export function validateCategoryUpdate(body: unknown): ValidatedCategoryUpdate {
  return validateCategoryCreate(body);
}
