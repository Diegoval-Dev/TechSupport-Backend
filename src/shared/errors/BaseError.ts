export abstract class BaseError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    protected constructor(
        message: string,
        statusCode: number,
        isOperational = true,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}