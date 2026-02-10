import { BaseError } from '../../shared/errors/BaseError';

export class ApplicationError extends BaseError {
    constructor(message: string, statusCode = 500) {
        super(message, statusCode);
    }
}