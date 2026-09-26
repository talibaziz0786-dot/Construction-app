export class DomainError extends Error {
  constructor(public readonly message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidMeasurementError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_MEASUREMENT');
  }
}

export class DimensionMismatchError extends DomainError {
  constructor(message: string) {
    super(message, 'DIMENSION_MISMATCH');
  }
}

export class InconsistentGeometryError extends DomainError {
  constructor(message: string) {
    super(message, 'INCONSISTENT_GEOMETRY');
  }
}
