import { BaseError } from '../../shared/errors/BaseError';

export class DomainError extends BaseError {
  constructor(message: string) {
    super(message, 400);
  }
}
