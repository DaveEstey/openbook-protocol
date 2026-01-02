/**
 * Input validation utilities for API endpoints
 * Prevents injection attacks and ensures data integrity
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate positive integer
 */
export function validatePositiveInt(value: any, name: string, max?: number): number {
  const num = parseInt(value, 10);

  if (isNaN(num)) {
    throw new ValidationError(`${name} must be a valid number`);
  }

  if (num < 0) {
    throw new ValidationError(`${name} must be positive`);
  }

  if (max && num > max) {
    throw new ValidationError(`${name} must not exceed ${max}`);
  }

  return num;
}

/**
 * Validate limit parameter (for pagination)
 */
export function validateLimit(limit: any): number {
  return validatePositiveInt(limit, 'limit', 100); // Max 100 items per page
}

/**
 * Validate offset parameter (for pagination)
 */
export function validateOffset(offset: any): number {
  return validatePositiveInt(offset, 'offset', 10000); // Max offset 10k
}

/**
 * Validate sort column against allowed list
 */
export function validateSortColumn(sort: any, allowedColumns: string[]): string {
  if (typeof sort !== 'string') {
    return allowedColumns[0]; // Default to first allowed column
  }

  if (!allowedColumns.includes(sort)) {
    throw new ValidationError(
      `Invalid sort column. Allowed: ${allowedColumns.join(', ')}`
    );
  }

  return sort;
}

/**
 * Validate sort order
 */
export function validateSortOrder(order: any): 'ASC' | 'DESC' {
  if (typeof order !== 'string') {
    return 'DESC'; // Default
  }

  const normalized = order.toUpperCase();
  if (normalized !== 'ASC' && normalized !== 'DESC') {
    throw new ValidationError('Sort order must be ASC or DESC');
  }

  return normalized as 'ASC' | 'DESC';
}

/**
 * Validate Solana public key (base58)
 */
export function validatePublicKey(key: any): string {
  if (typeof key !== 'string') {
    throw new ValidationError('Public key must be a string');
  }

  // Solana public keys are 32-44 chars in base58
  if (key.length < 32 || key.length > 44) {
    throw new ValidationError('Invalid public key length');
  }

  // Base58 alphabet (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(key)) {
    throw new ValidationError('Invalid public key format');
  }

  return key;
}

/**
 * Validate string field (prevent SQL injection, XSS)
 */
export function validateString(
  value: any,
  name: string,
  maxLength: number = 1000
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${name} must be a string`);
  }

  if (value.length === 0) {
    throw new ValidationError(`${name} cannot be empty`);
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${name} must not exceed ${maxLength} characters`);
  }

  // Remove null bytes (potential SQL injection)
  if (value.includes('\0')) {
    throw new ValidationError(`${name} contains invalid characters`);
  }

  return value.trim();
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: any,
  name: string,
  allowedValues: readonly T[]
): T {
  if (typeof value !== 'string') {
    throw new ValidationError(`${name} must be a string`);
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${name}. Allowed: ${allowedValues.join(', ')}`
    );
  }

  return value as T;
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: any): string {
  if (typeof query !== 'string') {
    throw new ValidationError('Search query must be a string');
  }

  const trimmed = query.trim();

  if (trimmed.length < 2) {
    throw new ValidationError('Search query must be at least 2 characters');
  }

  if (trimmed.length > 200) {
    throw new ValidationError('Search query must not exceed 200 characters');
  }

  // Remove any SQL-like syntax for safety
  const dangerousPatterns = [
    /--/,           // SQL comments
    /;/,            // Statement terminator
    /\/\*/,         // Block comments
    /\*\//,
    /xp_/i,         // Extended stored procedures
    /sp_/i,         // System stored procedures
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      throw new ValidationError('Search query contains invalid characters');
    }
  }

  return trimmed;
}

/**
 * Sanitize SQL LIKE pattern (for PostgreSQL)
 * Escapes special characters: % _ \
 */
export function sanitizeLikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape %
    .replace(/_/g, '\\_');   // Escape _
}
