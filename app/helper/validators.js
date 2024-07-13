import { param } from "express-validator";
import validator from 'express-validator'
const { body } = validator

export const permissionValidator = [
    body("name").notEmpty().withMessage("Name is required"),
    body("description").notEmpty().withMessage("Description is required"),
];

export const rolePermissionValidator = [
    body("role").notEmpty().withMessage("Role is required"),
    body("permissionId").notEmpty().withMessage("Permission Id is required"),
];

export const userCreateValidator =[
    body('fullName')
      .notEmpty().withMessage('Full name is required')
      .isString().withMessage('Full name must be a string'),
    body('userName')
      .notEmpty().withMessage('Username is required')
      .isString().withMessage('Username must be a string'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isString().withMessage('Password must be a string'),
    body('isEnabled')
      .optional()
      .isBoolean().withMessage('isEnabled must be a boolean'),
    body('tg_handle')
      .optional()
      .isString().withMessage('Telegram handle must be a string'),
    body('tg_id')
      .optional()
      .isString().withMessage('Telegram ID must be a string'),
    body('last_login')
      .optional()
      .isISO8601().withMessage('Last login must be a valid date'),
    body('last_logout')
      .optional()
      .isISO8601().withMessage('Last logout must be a valid date'),
    body('role')
      .notEmpty().withMessage('Role is required')
      .isString().withMessage('Role must be a string')
      .isIn(['ADMIN', 'CUSTOMER_SERVICE', 'TRANSACTIONS', 'OPERATIONS', 'MERCHANT'])
      .withMessage('Role must be one of ADMIN, CUSTOMER_SERVICE, TRANSACTIONS, OPERATIONS, MERCHANT'),
    body('code')
      .optional()
      .isString().withMessage('Code must be a string')
  ];