import { validationResult } from "express-validator";


// Check Validation For Requests
export const checkValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = {
      statusCode: 400,
      message: errors.errors[0].msg,
    };
    throw validationError;
  }
};