import { param } from "express-validator";
import validator from "express-validator";
import ifsc from "ifsc";
const { body, query } = validator;

const methodEnums = ["BANK", "CASH", "CRYPTO", "AED"];
const walletEnums = ["WALLET1", "WALLET2", "WALLET3"];
const statusEnums = [
  "INITIATED",
  "ASSIGNED",
  "SUCCESS",
  "DROPPED",
  "DUPLICATE",
  "DISPUTE",
  "PENDING",
  "IMG_PENDING",
  "REJECTED",
  "REVERSED",
  "FAILED",
];

export const permissionValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("description").notEmpty().withMessage("Description is required"),
];

export const rolePermissionValidator = [
  body("role").notEmpty().withMessage("Role is required"),
  body("permissionId").notEmpty().withMessage("Permission Id is required"),
];

export const userCreateValidator = [
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isString()
    .withMessage("Full name must be a string"),
  body("userName")
    .notEmpty()
    .withMessage("Username is required")
    .isString()
    .withMessage("Username must be a string"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string"),
  body("isEnabled")
    .optional()
    .isBoolean()
    .withMessage("isEnabled must be a boolean"),
  body("tg_handle")
    .optional()
    .isString()
    .withMessage("Telegram handle must be a string"),
  body("tg_id")
    .optional()
    .isString()
    .withMessage("Telegram ID must be a string"),
  body("last_login")
    .optional()
    .isISO8601()
    .withMessage("Last login must be a valid date"),
  body("last_logout")
    .optional()
    .isISO8601()
    .withMessage("Last logout must be a valid date"),
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isString()
    .withMessage("Role must be a string")
    .isIn([
      "ADMIN",
      "CUSTOMER_SERVICE",
      "TRANSACTIONS",
      "OPERATIONS",
      "MERCHANT",
      "VENDOR",
      "VENDOR_OPERATIONS",
      "MERCHANT_OPERATIONS",
      "MERCHANT_ADMIN"
    ])
    .withMessage(
      "Role must be one of ADMIN, CUSTOMER_SERVICE, TRANSACTIONS, OPERATIONS, MERCHANT,VENDOR,VENDOR_OPERATIONS"
    ),
  // body("code").optional().isString().withMessage("Code must be a string"),
  body("createdBy")
    .notEmpty()
    .withMessage("Created By is required")
    .isString()
    .withMessage("Created By must be a string"),
];

export const merchantCreateValidator = [
  body("code")
    .notEmpty()
    .withMessage("Code is required")
    .isString()
    .withMessage("Code must be a string"),
  body("parent_id")
    .optional()
    .isInt()
    .withMessage("Parent ID must be an integer"),
  body("payin_theme")
    .optional()
    .isString()
    .withMessage("Payin theme must be a string"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
  body("site_url")
    .notEmpty()
    .withMessage("Site URL is required")
    .isURL()
    .withMessage("Site URL must be a valid URL"),
  body("notify_url")
    .notEmpty()
    .withMessage("Notify URL is required")
    .isURL()
    .withMessage("Notify URL must be a valid URL"),
  body("return_url")
    .notEmpty()
    .withMessage("Return URL is required")
    .isURL()
    .withMessage("Return URL must be a valid URL"),
  body("min_payin")
    .notEmpty()
    .withMessage("Min payin is required")
    .isString()
    .withMessage("Min payin must be a string"),
  body("max_payin")
    .notEmpty()
    .withMessage("Max payin is required")
    .isString()
    .withMessage("Max payin must be a string"),
  body("payin_commission")
    .notEmpty()
    .withMessage("Payin commission is required")
    .isDecimal()
    .withMessage("Payin commission must be a decimal"),
  body("min_payout")
    .notEmpty()
    .withMessage("Min payout is required")
    .isString()
    .withMessage("Min payout must be a string"),
  body("max_payout")
    .notEmpty()
    .withMessage("Max payout is required")
    .isString()
    .withMessage("Max payout must be a string"),
  body("payout_commission")
    .notEmpty()
    .withMessage("Payout commission is required")
    .isDecimal()
    .withMessage("Payout commission must be a decimal"),
  body("payout_notify_url")
    .optional()
    .isURL()
    .withMessage("Payout notify URL must be a valid URL"),
  body("balance")
    .notEmpty()
    .withMessage("Balance is required")
    .isString()
    .withMessage("Balance must be a string"),
  body("is_test_mode")
    .optional()
    .isBoolean()
    .withMessage("Is test mode must be a boolean"),
  body("is_enabled")
    .optional()
    .isBoolean()
    .withMessage("Is enabled must be a boolean"),
  body("is_demo")
    .optional()
    .isBoolean()
    .withMessage("Is demo must be a boolean"),
];

export const bankAccountCreateValidator = [
  body("upi_id")
    .notEmpty()
    .withMessage("UPI ID is required")
    .isString()
    .withMessage("UPI ID must be a string"),
  body("upi_params")
    .optional()
    .isString()
    .withMessage("UPI Params must be a string"),
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  body("ac_no")
    .notEmpty()
    .withMessage("Account Number is required")
    .isString()
    .withMessage("Account Number must be a string"),
  body("ac_name")
    .notEmpty()
    .withMessage("Account Name is required")
    .isString()
    .withMessage("Account Name must be a string"),
  body("ifsc")
    .notEmpty()
    .withMessage("IFSC is required")
    .isString()
    .withMessage("IFSC must be a string"),
  body("bank_name")
    .notEmpty()
    .withMessage("Bank Name is required")
    .isString()
    .withMessage("Bank Name must be a string"),
  body("is_qr").optional().isBoolean().withMessage("Is QR must be a boolean"),
  body("is_bank")
    .optional()
    .isBoolean()
    .withMessage("Is Bank must be a boolean"),
  body("min_payin")
    .notEmpty()
    .withMessage("Min Payin is required")
    .isDecimal()
    .withMessage("Min Payin must be a decimal"),
  body("max_payin")
    .notEmpty()
    .withMessage("Max Payin is required")
    .isDecimal()
    .withMessage("Max Payin must be a decimal"),
  body("is_enabled")
    .optional()
    .isBoolean()
    .withMessage("Is Enabled must be a boolean"),
  body("payin_count")
    .optional()
    .isInt()
    .withMessage("Payin Count must be an integer"),
  body("balance")
    .notEmpty()
    .withMessage("Balance is required")
    .isDecimal()
    .withMessage("Balance must be a decimal"),
];

export const merchantBankValidator = [
  body("merchantId")
    .notEmpty()
    .withMessage("Merchant ID is required")
    .isString()
    .withMessage("Merchant ID must be a string"),
  body("bankAccountId")
    .notEmpty()
    .withMessage("Bank Account ID is required")
    .isString()
    .withMessage("Bank Account ID must be a string"),
];

export const payInAssignValidator = [
  body("code")
    .notEmpty()
    .withMessage("Code is required")
    .isString()
    .withMessage("Code must be a string"),

  body("api_key")
    .notEmpty()
    .withMessage("API key is required")
    .isString()
    .withMessage("API key must be a string"),

  body("merchant_order_id")
    .notEmpty()
    .withMessage("Merchant Order ID is required")
    .isString()
    .withMessage("Merchant Order ID must be a string"),

  body("user_id")
    .notEmpty()
    .withMessage("User ID is required")
    .isString()
    .withMessage("User ID must be a string"),
];

export const validatePayInIdUrl = [
  param("payInId")
    .notEmpty()
    .withMessage("payInId must not be empty")
    .isUUID()
    .withMessage("payInId must be a valid UUID"),
];

export const validatePayInIdAndAmountAssigned = [
  param("payInId")
    .notEmpty()
    .withMessage("payInId must not be empty")
    .isUUID()
    .withMessage("payInId must be a valid UUID"),

  body("amount")
    .notEmpty()
    .withMessage("amount must not be empty")
    .isFloat({ min: 0 })
    .withMessage("amount must be a valid number greater than or equal to 0"),
];

export const validatePayInIdAndMerchant = [
  body("payinId")
    .notEmpty()
    .withMessage("payinId must not be empty")
    .isString()
    .withMessage("payinId must be a string"),
  body("merchantCode")
    .notEmpty()
    .withMessage("merchantCode must not be empty")
    .isString()
    .withMessage("merchantCode must be a string"),
  body("merchantOrderId")
    .notEmpty()
    .withMessage("merchantOrderId must not be empty")
    .isString()
    .withMessage("merchantOrderId must be a string"),
];

export const validatePayInProcess = [
  param("payInId")
    .notEmpty()
    .withMessage("payInId must not be empty")
    .isUUID()
    .withMessage("payInId must be a valid UUID"),

  body("usrSubmittedUtr")
    .notEmpty()
    .withMessage("usrSubmittedUtr must not be empty"),

  body("code")
    .notEmpty()
    .withMessage("code must not be empty")
    .isLength({ min: 5, max: 5 })
    .withMessage("code must be 5 digits long"),

  body("amount")
    .notEmpty()
    .withMessage("amount must not be empty")
    .isFloat({ min: 0 })
    .withMessage("amount must be a valid number between 0 and 100000"),
];

export const settlementCreateValidator = [
  body("amount")
    .trim()
    .notEmpty()
    .withMessage("Amount is required!")
    .isNumeric()
    .withMessage("Amount is invalid!"),
  body("method")
    .trim()
    .notEmpty()
    .withMessage("Method should be provided!")
    .custom((method, meta) => {
      if (!methodEnums.includes(method)) {
        return Promise.reject(
          `Method is invalid! Should be one of these ${methodEnums}`
        );
      }
      const body = meta.req.body;
      let validateFields = [];
      switch (method) {
        case "CRYPTO":
          validateFields = ["wallet", "wallet_address"];
          break;
        case "BANK":
          validateFields = ["acc_name", "acc_no", "ifsc"];
          break;
      }
      for (const field of validateFields) {
        const value = body[field];
        if (!value || (typeof value === "string" && !value.trim())) {
          return Promise.reject(`${field} is required!`);
        }
        // if (field == "ifsc" && !ifsc.validate(value)) {
        //   return Promise.reject(`ifsc is invalid!`);
        // }
      }
      return Promise.resolve();
    }),
];

export const validatePayOutId = [
  // body("payoutId")
  //   .notEmpty()
  //   .withMessage("payOutId must not be empty")
  //   .isString()
  //   .withMessage("payOutId must be a string"),
  body("merchantCode")
    .notEmpty()
    .withMessage("merchantCode must not be empty")
    .isString()
    .withMessage("merchantCode must be a string"),
  body("merchantOrderId")
    .notEmpty()
    .withMessage("merchantOrderId must not be empty")
    .isString()
    .withMessage("merchantOrderId must be a string"),
];

export const validatePayInId = [
  // body("payinId")
  //   .notEmpty()
  //   .withMessage("payinId must not be empty")
  //   .isString()
  //   .withMessage("payinId must be a string"),
  body("merchantCode")
    .notEmpty()
    .withMessage("merchantCode must not be empty")
    .isString()
    .withMessage("merchantCode must be a string"),
  body("merchantOrderId")
    .notEmpty()
    .withMessage("merchantOrderId must not be empty")
    .isString()
    .withMessage("merchantOrderId must be a string"),
];

export const settlementsGetValidator = [
  query("id").optional().trim().notEmpty().withMessage("Id is required!"),
  query("status")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("status is required!")
    .isIn(statusEnums)
    .withMessage(`Invalid status, Should be one of these ${statusEnums}`),
  query("method")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("method is required!")
    .isIn(methodEnums)
    .withMessage(`Invalid method, Should be one of these ${methodEnums}`),
  query("reference_id")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("reference_id is required!"),
  query("acc_no")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("acc_no is required!"),
  query("amount")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("amount is required!")
    .isNumeric()
    .withMessage("amount is invalid!"),
  query("code").optional().trim().notEmpty().withMessage("code is required!"),
  query("page")
    .optional()
    .notEmpty()
    .isNumeric()
    .isInt({ min: 0 })
    .withMessage("Invalid page!"),
  query("take").optional().notEmpty().isNumeric().withMessage("Invalid take"),
];

export const payoutCreateValidator = [
  body("code").trim().notEmpty().withMessage("Code is required!"),
  body("user_id").trim().notEmpty().withMessage("User ID is required!"),
  body("acc_no").trim().notEmpty().withMessage("Account number is required!"),
  body("acc_holder_name")
    .trim()
    .notEmpty()
    .withMessage("Account Holder Name is required!"),
  body("ifsc_code")
    .trim()
    .notEmpty()
    .withMessage("ifsc_code is required!")
    .custom((input, meta) => {
      if (ifsc.validate(input)) {
        return Promise.resolve();
      }
      return Promise.reject("IFSC is invalid!");
    }),
  body("amount")
    .trim()
    .notEmpty()
    .isNumeric()
    .withMessage("amount is invalid or required!"),
];

export const payoutGetValidator = [
  query("id").optional().trim().notEmpty().withMessage("Id is required!"),
  query("merchant_order_id")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("merchant_order_id is required!"),
  query("user_id")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("user_id is required!"),
  query("sno").optional().trim().notEmpty().withMessage("sno is required!"),
  query("payout_commision")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("payout_commision is required!"),
  query("utr_id")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("utr_id is required!"),
  query("status")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("status is required!")
    .isIn(statusEnums)
    .withMessage(`Invalid status, Should be one of these ${statusEnums}`),
  query("acc_no")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("acc_no is required!"),
  query("acc_holder_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("acc_holder_name is required!"),
  query("amount")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("amount is required!")
    .isNumeric()
    .withMessage("amount is invalid!"),
  query("method")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("method is required!"),
  query("code").optional().trim().notEmpty().withMessage("code is required!"),
  query("page")
    .optional()
    .notEmpty()
    .isNumeric()
    .isInt({ min: 0 })
    .withMessage("Invalid page!"),
  query("take").optional().notEmpty().isNumeric().withMessage("Invalid take"),
];

//new pay in validator
export const payOutInAllDataValidator = [
  body("merchantCode")
  .notEmpty()
  .withMessage("Code is required")
  .isArray()
  .withMessage("Invalid Merchant Code format!"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([...statusEnums, "All"])
    .withMessage(`Invalid status, Should be one of these ${[...statusEnums, "All"]}`),
  body("startDate").notEmpty().withMessage("Start date is required"),
  body("endDate").notEmpty().withMessage("End date is required"),
];

export const payInExpireURLValidator = [
  param("id")
    .notEmpty()
    .withMessage("payInId must not be empty")
    .isUUID()
    .withMessage("payInId must be a valid UUID"),
];
export const vendorCreateValidator = [
  query("vendor_code")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("vendor_code is required!"),
  query("vendor_commission")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("vendor_commission is required!"),
  query("createdBy")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("createdBy is required!"),
];

export const updateVendorCodeValidator = [
  body("vendorCode")
    .isString() // Validate that vendorCode is a string
    .withMessage("vendorCode must be a string")
    .bail()
    .trim(),

  body("withdrawId")
    .isArray()
    .withMessage("withdrawId must be an array")
    .bail()
    .custom((value) => value.every((item) => typeof item === "string"))
    .withMessage("Each Withdraw ID must be a string"),
];
