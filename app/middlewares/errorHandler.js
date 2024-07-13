// Custom error handling middleware
export const customError = (err, req, res, next) => {
  
  const error = new CustomError(err.status, err.message, err.additionalInfo);
  return res.status(error.status).json({
    // responseStatus: error.status,
    // message: error.status == 500 ? "Something went wrong" : error.message,
    error: err,
  });
};

// 404 error handling middleware
export const notFound = (req, res, next) => {
	const error = new CustomError(404, `Path not found`);
	next(error);
};



// errors.js

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

