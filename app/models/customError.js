export class CustomError {
    status;
    message;
    additionalInfo;
    constructor(
        status = 500,
        message = 'Something went wrong',
        additionalInfo = {}
    ) {
        this.status = status;
        this.message = message;
        this.additionalInfo = additionalInfo;
    }
}
