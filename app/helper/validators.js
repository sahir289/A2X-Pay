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

export const userCreateValidator = [
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

export const merchantCreateValidator = [
  body('code')
    .notEmpty().withMessage('Code is required')
    .isString().withMessage('Code must be a string'),
  body('parent_id')
    .optional()
    .isInt().withMessage('Parent ID must be an integer'),
  body('payin_theme')
    .optional()
    .isString().withMessage('Payin theme must be a string'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string'),
  body('site_url')
    .notEmpty().withMessage('Site URL is required')
    .isURL().withMessage('Site URL must be a valid URL'),
  body('api_key')
    .notEmpty().withMessage('API key is required')
    .isString().withMessage('API key must be a string'),
  body('secret_key')
    .notEmpty().withMessage('Secret key is required')
    .isString().withMessage('Secret key must be a string'),
  body('notify_url')
    .notEmpty().withMessage('Notify URL is required')
    .isURL().withMessage('Notify URL must be a valid URL'),
  body('return_url')
    .notEmpty().withMessage('Return URL is required')
    .isURL().withMessage('Return URL must be a valid URL'),
  body('min_payin')
    .notEmpty().withMessage('Min payin is required')
    .isString().withMessage('Min payin must be a string'),
  body('max_payin')
    .notEmpty().withMessage('Max payin is required')
    .isString().withMessage('Max payin must be a string'),
  body('payin_commission')
    .notEmpty().withMessage('Payin commission is required')
    .isDecimal().withMessage('Payin commission must be a decimal'),
  body('min_payout')
    .notEmpty().withMessage('Min payout is required')
    .isString().withMessage('Min payout must be a string'),
  body('max_payout')
    .notEmpty().withMessage('Max payout is required')
    .isString().withMessage('Max payout must be a string'),
  body('payout_commission')
    .notEmpty().withMessage('Payout commission is required')
    .isDecimal().withMessage('Payout commission must be a decimal'),
  body('payout_notify_url')
    .optional()
    .isURL().withMessage('Payout notify URL must be a valid URL'),
  body('balance')
    .notEmpty().withMessage('Balance is required')
    .isString().withMessage('Balance must be a string'),
  body('is_test_mode')
    .optional()
    .isBoolean().withMessage('Is test mode must be a boolean'),
  body('is_enabled')
    .optional()
    .isBoolean().withMessage('Is enabled must be a boolean'),
  body('is_demo')
    .optional()
    .isBoolean().withMessage('Is demo must be a boolean')
];


export const bankAccountCreateValidator = [
  body('upi_id')
    .notEmpty().withMessage('UPI ID is required')
    .isString().withMessage('UPI ID must be a string'),
  body('upi_params')
    .optional()
    .isString().withMessage('UPI Params must be a string'),
  body('name')
    .notEmpty().withMessage('Name is required')
    .isString().withMessage('Name must be a string'),
  body('ac_no')
    .notEmpty().withMessage('Account Number is required')
    .isString().withMessage('Account Number must be a string'),
  body('ac_name')
    .notEmpty().withMessage('Account Name is required')
    .isString().withMessage('Account Name must be a string'),
  body('ifsc')
    .notEmpty().withMessage('IFSC is required')
    .isString().withMessage('IFSC must be a string'),
  body('bank_name')
    .notEmpty().withMessage('Bank Name is required')
    .isString().withMessage('Bank Name must be a string'),
  body('is_qr')
    .optional()
    .isBoolean().withMessage('Is QR must be a boolean'),
  body('is_bank')
    .optional()
    .isBoolean().withMessage('Is Bank must be a boolean'),
  body('min_payin')
    .notEmpty().withMessage('Min Payin is required')
    .isDecimal().withMessage('Min Payin must be a decimal'),
  body('max_payin')
    .notEmpty().withMessage('Max Payin is required')
    .isDecimal().withMessage('Max Payin must be a decimal'),
  body('is_enabled')
    .optional()
    .isBoolean().withMessage('Is Enabled must be a boolean'),
  body('payin_count')
    .optional()
    .isInt().withMessage('Payin Count must be an integer'),
  body('balance')
    .notEmpty().withMessage('Balance is required')
    .isDecimal().withMessage('Balance must be a decimal')
];


export const merchantBankValidator = [
  body('merchantId')
    .notEmpty().withMessage('Merchant ID is required')
    .isString().withMessage('Merchant ID must be a string'),
  body('bankAccountId')
    .notEmpty().withMessage('Bank Account ID is required')
    .isString().withMessage('Bank Account ID must be a string')
];


export const payInAssignValidator = [
  body('code')
    .notEmpty().withMessage('Code is required')
    .isString().withMessage('Code must be a string'),

  body('api_key')
    .notEmpty().withMessage('API key is required')
    .isString().withMessage('API key must be a string'),

  body('merchant_order_id')
    .notEmpty().withMessage('Merchant Order ID is required')
    .isString().withMessage('Merchant Order ID must be a string'),

  body('user_id')
    .notEmpty().withMessage('User ID is required')
    .isString().withMessage('User ID must be a string'),
];

export const validatePayInIdUrl = [
  param('payInId')
  .notEmpty()
  .withMessage('payInId must not be empty')
  .isUUID()
  .withMessage('payInId must be a valid UUID')
];

export const validatePayInIdAndAmountAssigned = [
  param('payInId')
    .notEmpty()
    .withMessage('payInId must not be empty')
    .isUUID()
    .withMessage('payInId must be a valid UUID'),

  body('amount')
    .notEmpty()
    .withMessage('amount must not be empty')
    .isFloat({ min: 0 })
    .withMessage('amount must be a valid number greater than or equal to 0')
];

export const validatePayInProcess = [
  param('payInId')
    .notEmpty()
    .withMessage('payInId must not be empty')
    .isUUID()
    .withMessage('payInId must be a valid UUID'),

  body('usrSubmittedUtr')
    .notEmpty()
    .withMessage('usrSubmittedUtr must not be empty'),

  body('code')
    .notEmpty()
    .withMessage('code must not be empty')
    .isLength({ min: 5, max: 5 })
    .withMessage('code must be 5 digits long'),

  body('amount')
    .notEmpty()
    .withMessage('amount must not be empty')
    .isFloat({ min: 0})
    .withMessage('amount must be a valid number between 0 and 100000')
];