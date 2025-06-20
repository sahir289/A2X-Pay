import axios from "axios";
import { io } from "../../index.js";
import { DefaultResponse } from "../helper/customResponse.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js";
import { checkValidation } from "../helper/validationHelper.js";
import merchantRepo from "../repository/merchantRepo.js";
import { calculateCommission } from "../helper/utils.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";
import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";

class BotResponseController {
  async botResponse(req, res, next) {
    try {
      const data = req.body?.message?.text;
      const splitData = data.split(" ");

      const status = splitData[0];
      const amount = parseFloat(splitData[1]);
      const amount_code = splitData[2];
      const utr = splitData[3];
      const bankName = splitData[4];

      // Validate amount, amount_code, and utr
      const isValidAmount = amount;
      const isValidAmountCode =
        amount_code !== "nil" && amount_code.length === 5;
      const isValidUtr = utr.length === 12;
      const acceptedStatus = ["SUCCESS", "DISPUTE", "BANK_MISMATCH", "FAILED", "DUPLICATE"] //assinged pening dropped



      if (isValidAmount) {
        const utrAlreadyExist = await botResponseRepo.getBotResByUtr(utr);
        const updatedData = {
          status: utrAlreadyExist ? "/repeated" : "/success",
          amount,
          utr,
          bankName
        };
        if (isValidAmountCode) {
          updatedData.amount_code = amount_code;
        }

        const isAmountCodeExist = await botResponseRepo.getBotData(amount_code)

        if (isAmountCodeExist) {
          const botRes = await botResponseRepo.botResponse(updatedData);
          throw new CustomError(400, "Amount code already exist")
        }
        let botRes
        const utrinternalTransfer = await botResponseRepo.getEntryByReferenceIDRepo(utr);

        // We are adding the data in the bot res.
        if (utrinternalTransfer) {
          const updatedData = {
            status: "/repeated",
            amount,
            utr,
            bankName
          };
          botRes = await botResponseRepo.botResponse(updatedData);
        } else {
          botRes = await botResponseRepo.botResponse(updatedData);
        }
        
        if (updatedData.status === "REPEATED") {
          throw new CustomError(400, "Entry with REPEATED UTR Added")
        }


        // We are getting the payin data
        const checkPayInUtr = await payInRepo.getPayInDataByUtrOrUpi(
          utr,
          amount_code,
        );

        if (checkPayInUtr?.length > 0) {
          if (amount_code && isValidAmountCode) {
            let dataUtr = checkPayInUtr[0]?.utr ? checkPayInUtr[0]?.utr : checkPayInUtr[0]?.user_submitted_utr
            const getDataByUtr = await botResponseRepo.getBotResDataByUtr(dataUtr)
            const botUtrIsUsed = getDataByUtr?.some((item) => item.is_used);
            if (acceptedStatus.includes(checkPayInUtr[0]?.status) && botUtrIsUsed) {
              throw new CustomError(400, `The entry with ${amount_code} Amount Code is already ${checkPayInUtr[0]?.status} with ${dataUtr} UTR`);
            }

            else {
              if (!botUtrIsUsed) {

                // We check bank exist here as we have to add the data to the res no matter what comes.
                const isBankExist = await botResponseRepo?.getBankDataByBankName(bankName)
                if (!isBankExist) {
                  if (checkPayInUtr.at(0)?.user_submitted_utr) {
                    if (checkPayInUtr.at(0)?.user_submitted_utr == utr) {
                      const payInData = {
                        confirmed: botRes?.amount,
                        status: "BANK_MISMATCH",
                        is_notified: true,
                        utr: botRes?.utr,
                        approved_at: new Date(),
                      };

                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        checkPayInUtr[0]?.id,
                        payInData
                      );

                      const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                      // We are adding the amount to the bank as we want to update the balance of the bank
                      // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                      //   isBankExist?.id,
                      //   parseFloat(amount)
                      // );

                      const notifyData = {
                        status: "BANK_MISMATCH",
                        merchantOrderId: updatePayInDataRes?.merchant_order_id,
                        payinId: updatePayInDataRes?.id,
                        amount: updatePayInDataRes?.confirmed,
                        req_amount: updatePayInDataRes?.amount,
                        utr_id: updatePayInDataRes?.utr
                      };

                      try {
                        logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                          logger.error("Error sending notification:", error.message);
                      }

                      return DefaultResponse(
                        res,
                        200,
                        "Bank mismatch",
                        updatePayInDataRes
                      );
                    } else {
                      return DefaultResponse(
                        res,
                        200,
                        `⛔ UTR: ${utr} does not match with User Submitted UTR: ${checkPayInUtr.at(0)?.user_submitted_utr}`
                      );
                    }
                  }
                  else {
                    const payInData = {
                      confirmed: botRes?.amount,
                      status: "BANK_MISMATCH",
                      is_notified: true,
                      utr: botRes?.utr,
                      approved_at: new Date(),
                    };

                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      checkPayInUtr[0]?.id,
                      payInData
                    );

                    const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                    // We are adding the amount to the bank as we want to update the balance of the bank
                    // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                    //   isBankExist?.id,
                    //   parseFloat(amount)
                    // );

                    const notifyData = {
                      status: "BANK_MISMATCH",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      req_amount: updatePayInDataRes?.amount,
                      utr_id: updatePayInDataRes?.utr
                    };

                    try {
                      logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                    } catch (error) {
                        logger.error("Error sending notification:", error.message);
                    }

                    return DefaultResponse(
                      res,
                      200,
                      "Bank mismatch",
                      updatePayInDataRes
                    );
                  }
                }

                // if (isBankExist?.Merchant_Bank.length === 1) {

                if (checkPayInUtr[0].bank_acc_id !== isBankExist?.id) {
                  if (checkPayInUtr.at(0)?.user_submitted_utr) {
                    if (checkPayInUtr.at(0)?.user_submitted_utr == utr) {
                      const payInData = {
                        confirmed: botRes?.amount,
                        status: "BANK_MISMATCH",
                        is_notified: true,
                        utr: botRes?.utr,
                        approved_at: new Date(),
                      };

                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        checkPayInUtr[0]?.id,
                        payInData
                      );

                      const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                      // We are adding the amount to the bank as we want to update the balance of the bank
                      // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                      //   isBankExist?.id,
                      //   parseFloat(amount)
                      // );

                      const notifyData = {
                        status: "BANK_MISMATCH",
                        merchantOrderId: updatePayInDataRes?.merchant_order_id,
                        payinId: updatePayInDataRes?.id,
                        amount: updatePayInDataRes?.confirmed,
                        req_amount: updatePayInDataRes?.amount,
                        utr_id: updatePayInDataRes?.utr
                      };

                      try {
                        logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                          logger.error("Error sending notification:", error.message);
                      }

                      return DefaultResponse(
                        res,
                        200,
                        "Bank mismatch",
                        updatePayInDataRes
                      );
                    } else {
                      return DefaultResponse(
                        res,
                        200,
                        `⛔ UTR: ${utr} does not match with User Submitted UTR: ${checkPayInUtr.at(0)?.user_submitted_utr}`
                      );
                    }
                  } else {
                    const payInData = {
                      confirmed: botRes?.amount,
                      status: "BANK_MISMATCH",
                      is_notified: true,
                      utr: botRes?.utr,
                      approved_at: new Date(),
                    };

                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      checkPayInUtr[0]?.id,
                      payInData
                    );

                    const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                    // We are adding the amount to the bank as we want to update the balance of the bank
                    // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                    //   isBankExist?.id,
                    //   parseFloat(amount)
                    // );

                    const notifyData = {
                      status: "BANK_MISMATCH",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      req_amount: updatePayInDataRes?.amount,
                      utr_id: updatePayInDataRes?.utr
                    };

                    try {
                      logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                    } catch (error) {
                        logger.error("Error sending notification:", error.message);
                    }

                    return DefaultResponse(
                      res,
                      200,
                      "Bank mismatch",
                      updatePayInDataRes
                    );
                  }
                }

                // }

                // check if duplicate and return error
                const existingResponse = await prisma.telegramResponse.findMany({
                  where: {
                    utr,
                    is_used: true
                  }
                });

                if (existingResponse?.length > 0) {
                  throw new CustomError(400, "The UTR already exists");
                }
                const getMerchantToGetPayinCommissionRes = await merchantRepo.getMerchantById(checkPayInUtr[0]?.merchant_id)
                const payinCommission = calculateCommission(botRes?.amount, getMerchantToGetPayinCommissionRes?.payin_commission);

                const durMs = new Date() - checkPayInUtr.at(0)?.createdAt;
                const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                const duration = `${durHours}:${durMinutes}:${durSeconds}`;

                if (checkPayInUtr.at(0)?.amount == amount
                ) {
                  if (checkPayInUtr.at(0)?.user_submitted_utr) {
                    if (checkPayInUtr.at(0)?.user_submitted_utr == utr) {
                      const payInData = {
                        confirmed: botRes?.amount,
                        status: "SUCCESS",
                        is_notified: true,
                        utr: botRes?.utr,
                        user_submitted_utr: checkPayInUtr.at(0)?.user_submitted_utr,
                        approved_at: new Date(),
                        duration: duration,
                        payin_commission: payinCommission
                      };

                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        checkPayInUtr[0]?.id,
                        payInData
                      );

                      if (checkPayInUtr[0]?.bank_acc_id) {
                        const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                          checkPayInUtr[0]?.bank_acc_id,
                          parseFloat(amount)
                        );
                      }
                      const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                      const updateMerchantData = await merchantRepo?.updateMerchant(checkPayInUtr[0]?.merchant_id, amount)
                      const notifyData = {
                        status: "SUCCESS",
                        merchantOrderId: updatePayInDataRes?.merchant_order_id,
                        payinId: updatePayInDataRes?.id,
                        amount: updatePayInDataRes?.confirmed,
                        utr_id: updatePayInDataRes?.utr
                      };
                      try {
                        logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                          logger.error("Error sending notification:", error.message);
                      }
                    } else {
                      return DefaultResponse(
                        res,
                        200,
                        `⛔ UTR: ${utr} does not match with User Submitted UTR: ${checkPayInUtr.at(0)?.user_submitted_utr}`
                      );
                    }
                  } else {
                    const payInData = {
                      confirmed: botRes?.amount,
                      status: "SUCCESS",
                      is_notified: true,
                      utr: botRes?.utr,
                      user_submitted_utr: checkPayInUtr.at(0)?.user_submitted_utr,
                      approved_at: new Date(),
                      duration: duration,
                      payin_commission: payinCommission
                    };

                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      checkPayInUtr[0]?.id,
                      payInData
                    );

                    if (checkPayInUtr[0]?.bank_acc_id) {
                      const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                        checkPayInUtr[0]?.bank_acc_id,
                        parseFloat(amount)
                      );
                    }
                    const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                    const updateMerchantData = await merchantRepo?.updateMerchant(checkPayInUtr[0]?.merchant_id, amount)
                    const notifyData = {
                      status: "SUCCESS",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      utr_id: updatePayInDataRes?.utr
                    };
                    try {
                      logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                    } catch (error) {
                      logger.error("Error sending notification:", error.message);
                    }
                  }
                }
                else {
                  if (checkPayInUtr.at(0)?.user_submitted_utr) {
                    if (checkPayInUtr.at(0)?.user_submitted_utr == utr) {
                      const payInData = {
                        confirmed: botRes?.amount,
                        status: "DISPUTE",
                        is_notified: true,
                        utr: botRes?.utr,
                        approved_at: new Date(),
                        duration: duration,
                        payin_commission: payinCommission
                      };
                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        checkPayInUtr[0]?.id,
                        payInData
                      );

                      // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                      //   checkPayInUtr[0]?.bank_acc_id,
                      //   parseFloat(amount)
                      // );


                      const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id);
                      const notifyData = {
                        status: "DISPUTE",
                        merchantOrderId: updatePayInDataRes?.merchant_order_id,
                        payinId: updatePayInDataRes?.id,
                        amount: updatePayInDataRes?.confirmed,
                        req_amount: updatePayInDataRes?.amount,
                        utr_id: updatePayInDataRes?.utr
                      };

                      try {
                        logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                        logger.error("Error sending notification:", error.message);
                      }
                    } else {
                      return DefaultResponse(
                        res,
                        200,
                        `⛔ UTR: ${utr} does not match with User Submitted UTR: ${checkPayInUtr.at(0)?.user_submitted_utr}`
                      );
                    }
                  } else {
                    const payInData = {
                      confirmed: botRes?.amount,
                      status: "DISPUTE",
                      is_notified: true,
                      utr: botRes?.utr,
                      approved_at: new Date(),
                      duration: duration,
                      payin_commission: payinCommission
                    };
                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      checkPayInUtr[0]?.id,
                      payInData
                    );

                    // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                    //   checkPayInUtr[0]?.bank_acc_id,
                    //   parseFloat(amount)
                    // );


                    const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id);
                    const notifyData = {
                      status: "DISPUTE",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      req_amount: updatePayInDataRes?.amount,
                      utr_id: updatePayInDataRes?.utr
                    };

                    try {
                      logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                    } catch (error) {
                      logger.error("Error sending notification:", error.message);
                    }
                  }
                }
              }
            }
          }
          else {
            if (!acceptedStatus.includes(checkPayInUtr[0]?.status)) {
              // We check bank exist here as we have to add the data to the res no matter what comes.
              const isBankExist = await botResponseRepo?.getBankDataByBankName(bankName)
              if (!isBankExist) {
                if (checkPayInUtr.at(0)?.user_submitted_utr) {
                  if (checkPayInUtr.at(0)?.user_submitted_utr == utr) {
                    const payInData = {
                      confirmed: botRes?.amount,
                      status: "BANK_MISMATCH",
                      is_notified: true,
                      utr: botRes?.utr,
                      approved_at: new Date(),
                    };

                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      checkPayInUtr[0]?.id,
                      payInData
                    );

                    const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                    // We are adding the amount to the bank as we want to update the balance of the bank
                    // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                    //   isBankExist?.id,
                    //   parseFloat(amount)
                    // );

                    const notifyData = {
                      status: "BANK_MISMATCH",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      req_amount: updatePayInDataRes?.amount,
                      utr_id: updatePayInDataRes?.utr
                    };

                    try {
                      logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                        logger.info('Notification sent successfully', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                    } catch (error) {
                      logger.error("Error sending notification:", error.message);
                    }

                    return DefaultResponse(
                      res,
                      200,
                      "Bank mismatch",
                      updatePayInDataRes
                    );
                  } else {
                    return DefaultResponse(
                      res,
                      200,
                      `⛔ UTR: ${utr} does not match with User Submitted UTR: ${checkPayInUtr.at(0)?.user_submitted_utr}`
                    );
                  }
                } else {
                  const payInData = {
                    confirmed: botRes?.amount,
                    status: "BANK_MISMATCH",
                    is_notified: true,
                    utr: botRes?.utr,
                    approved_at: new Date(),
                  };

                  const updatePayInDataRes = await payInRepo.updatePayInData(
                    checkPayInUtr[0]?.id,
                    payInData
                  );

                  const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                  // We are adding the amount to the bank as we want to update the balance of the bank
                  // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                  //   isBankExist?.id,
                  //   parseFloat(amount)
                  // );

                  const notifyData = {
                    status: "BANK_MISMATCH",
                    merchantOrderId: updatePayInDataRes?.merchant_order_id,
                    payinId: updatePayInDataRes?.id,
                    amount: updatePayInDataRes?.confirmed,
                    req_amount: updatePayInDataRes?.amount,
                    utr_id: updatePayInDataRes?.utr
                  };

                  try {
                    logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                    //When we get the notify url we will add it.
                    const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                    logger.info('Notification sent successfully', {
                      status: notifyMerchant.status,
                      data: notifyMerchant.data,
                    })
                  } catch (error) {
                    logger.error("Error sending notification:", error.message);
                  }

                  return DefaultResponse(
                    res,
                    200,
                    "Bank mismatch",
                    updatePayInDataRes
                  );
                }
              }

              // if (isBankExist?.Merchant_Bank.length === 1) {

              if (checkPayInUtr[0].bank_acc_id !== isBankExist?.id) {
                if (checkPayInUtr.at(0)?.user_submitted_utr) {
                  if (checkPayInUtr.at(0)?.user_submitted_utr == utr) {
                    const payInData = {
                      confirmed: botRes?.amount,
                      status: "BANK_MISMATCH",
                      is_notified: true,
                      utr: botRes?.utr,
                      approved_at: new Date(),
                    };

                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      checkPayInUtr[0]?.id,
                      payInData
                    );

                    const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                    // We are adding the amount to the bank as we want to update the balance of the bank
                    // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                    //   isBankExist?.id,
                    //   parseFloat(amount)
                    // );

                    const notifyData = {
                      status: "BANK_MISMATCH",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      req_amount: updatePayInDataRes?.amount,
                      utr_id: updatePayInDataRes?.utr
                    };

                    try {
                      logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                    //When we get the notify url we will add it.
                    const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                    logger.info('Notification sent successfully', {
                      status: notifyMerchant.status,
                      data: notifyMerchant.data,
                    })
                    } catch (error) {
                      logger.error("Error sending notification:", error.message);
                    }

                    return DefaultResponse(
                      res,
                      200,
                      "Bank mismatch",
                      updatePayInDataRes
                    );
                  } else {
                    return DefaultResponse(
                      res,
                      200,
                      `⛔ UTR: ${utr} does not match with User Submitted UTR: ${checkPayInUtr.at(0)?.user_submitted_utr}`
                    );
                  }
                } else {
                  const payInData = {
                    confirmed: botRes?.amount,
                    status: "BANK_MISMATCH",
                    is_notified: true,
                    utr: botRes?.utr,
                    approved_at: new Date(),
                  };

                  const updatePayInDataRes = await payInRepo.updatePayInData(
                    checkPayInUtr[0]?.id,
                    payInData
                  );

                  const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                  // We are adding the amount to the bank as we want to update the balance of the bank
                  // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                  //   isBankExist?.id,
                  //   parseFloat(amount)
                  // );

                  const notifyData = {
                    status: "BANK_MISMATCH",
                    merchantOrderId: updatePayInDataRes?.merchant_order_id,
                    payinId: updatePayInDataRes?.id,
                    amount: updatePayInDataRes?.confirmed,
                    req_amount: updatePayInDataRes?.amount,
                    utr_id: updatePayInDataRes?.utr
                  };

                  try {
                    logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                    //When we get the notify url we will add it.
                    const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                    logger.info('Notification sent successfully', {
                      status: notifyMerchant.status,
                      data: notifyMerchant.data,
                    })
                  } catch (error) {
                    logger.error("Error sending notification:", error.message);
                  }

                  return DefaultResponse(
                    res,
                    200,
                    "Bank mismatch",
                    updatePayInDataRes
                  );
                }
              }

              // }

              // check if duplicate and return error
              const existingResponse = await prisma.telegramResponse.findMany({
                where: {
                  utr,
                  is_used: true
                }
              });

              if (existingResponse?.length > 0) {
                throw new CustomError(400, "The UTR already exists");
              }
              const getMerchantToGetPayinCommissionRes = await merchantRepo.getMerchantById(checkPayInUtr[0]?.merchant_id)
              const payinCommission = calculateCommission(botRes?.amount, getMerchantToGetPayinCommissionRes?.payin_commission);

              const durMs = new Date() - checkPayInUtr.at(0)?.createdAt;
              const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
              const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
              const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
              const duration = `${durHours}:${durMinutes}:${durSeconds}`;

              if (checkPayInUtr.at(0)?.amount == amount
              ) {
                if (checkPayInUtr.at(0)?.user_submitted_utr) {
                  if (checkPayInUtr.at(0)?.user_submitted_utr == utr) {
                    const payInData = {
                      confirmed: botRes?.amount,
                      status: "SUCCESS",
                      is_notified: true,
                      utr: botRes?.utr,
                      user_submitted_utr: checkPayInUtr.at(0)?.user_submitted_utr,
                      approved_at: new Date(),
                      duration: duration,
                      payin_commission: payinCommission
                    };


                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      checkPayInUtr[0]?.id,
                      payInData
                    );


                    if (checkPayInUtr[0]?.bank_acc_id) {
                      const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                        checkPayInUtr[0]?.bank_acc_id,
                        parseFloat(amount)
                      );
                    }
                    const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                    const updateMerchantData = await merchantRepo?.updateMerchant(checkPayInUtr[0]?.merchant_id, amount)
                    const notifyData = {
                      status: "SUCCESS",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      utr_id: updatePayInDataRes?.utr
                    };
                    try {
                      //when we get the correct notify url;
                      logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                      const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                      logger.info('Notification sent successfully', {
                        status: notifyMerchant.status,
                        data: notifyMerchant.data,
                      })
                    } catch (error) {
                      logger.error("Error sending notification:", error.message);
                    }
                  } else {
                    return DefaultResponse(
                      res,
                      200,
                      `⛔ UTR: ${utr} does not match with User Submitted UTR: ${checkPayInUtr.at(0)?.user_submitted_utr}`
                    );
                  }
                } else {
                  const payInData = {
                    confirmed: botRes?.amount,
                    status: "SUCCESS",
                    is_notified: true,
                    utr: botRes?.utr,
                    user_submitted_utr: checkPayInUtr.at(0)?.user_submitted_utr,
                    approved_at: new Date(),
                    duration: duration,
                    payin_commission: payinCommission
                  };

                  const updatePayInDataRes = await payInRepo.updatePayInData(
                    checkPayInUtr[0]?.id,
                    payInData
                  );

                  if (checkPayInUtr[0]?.bank_acc_id) {
                    const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                      checkPayInUtr[0]?.bank_acc_id,
                      parseFloat(amount)
                    );
                  }
                  const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id)

                  const updateMerchantData = await merchantRepo?.updateMerchant(checkPayInUtr[0]?.merchant_id, amount)
                  const notifyData = {
                    status: "SUCCESS",
                    merchantOrderId: updatePayInDataRes?.merchant_order_id,
                    payinId: updatePayInDataRes?.id,
                    amount: updatePayInDataRes?.confirmed,
                    utr_id: updatePayInDataRes?.utr
                  };
                  try {
                    logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                    //when we get the correct notify url;
                    const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                    logger.info('Notification sent successfully', {
                      status: notifyMerchant.status,
                      data: notifyMerchant.data,
                    })
                  } catch (error) {
                      logger.error("Error sending notification:", error.message);
                  }
                }
              }
              else {
                if (checkPayInUtr.at(0)?.user_submitted_utr) {
                  if (checkPayInUtr.at(0)?.user_submitted_utr == utr) {
                    const payInData = {
                      confirmed: botRes?.amount,
                      status: "DISPUTE",
                      is_notified: true,
                      utr: botRes?.utr,
                      approved_at: new Date(),
                      duration: duration,
                      payin_commission: payinCommission
                    };
                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      checkPayInUtr[0]?.id,
                      payInData
                    );

                    // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                    //   checkPayInUtr[0]?.bank_acc_id,
                    //   parseFloat(amount)
                    // );


                    const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id);
                    const notifyData = {
                      status: "DISPUTE",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      req_amount: updatePayInDataRes?.amount,
                      utr_id: updatePayInDataRes?.utr
                    };

                    try {
                      logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                      //when we get the correct notify url;
                      const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                      logger.info('Notification sent successfully', {
                        status: notifyMerchant.status,
                        data: notifyMerchant.data,
                      })
                    } catch (error) {
                        logger.error("Error sending notification:", error.message);
                    }
                  } else {
                    return DefaultResponse(
                      res,
                      200,
                      `⛔ UTR: ${utr} does not match with User Submitted UTR: ${checkPayInUtr.at(0)?.user_submitted_utr}`
                    );
                  }
                } else {
                  const payInData = {
                    confirmed: botRes?.amount,
                    status: "DISPUTE",
                    is_notified: true,
                    utr: botRes?.utr,
                    approved_at: new Date(),
                    duration: duration,
                    payin_commission: payinCommission
                  };
                  const updatePayInDataRes = await payInRepo.updatePayInData(
                    checkPayInUtr[0]?.id,
                    payInData
                  );

                  // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                  //   checkPayInUtr[0]?.bank_acc_id,
                  //   parseFloat(amount)
                  // );


                  const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id);
                  const notifyData = {
                    status: "DISPUTE",
                    merchantOrderId: updatePayInDataRes?.merchant_order_id,
                    payinId: updatePayInDataRes?.id,
                    amount: updatePayInDataRes?.confirmed,
                    req_amount: updatePayInDataRes?.amount,
                    utr_id: updatePayInDataRes?.utr
                  };

                  try {
                    logger.info('Sending notification to merchant', { notify_url: checkPayInUtr[0]?.notify_url, notify_data: notifyData });
                      //when we get the correct notify url;
                      const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
                      logger.info('Notification sent successfully', {
                        status: notifyMerchant.status,
                        data: notifyMerchant.data,
                      })
                  } catch (error) {
                      logger.error("Error sending notification:", error.message);
                  }
                }
              }
            }
          }
        }
        // Notify all connected clients about the new entry
        io.emit("new-entry", {
          message: 'New entry added',
          data: updatedData
        });

        res.status(201).json({
          success: true,
          message: "Response received successfully",
          data: updatedData,
        });
      }


      else {
        res.status(400).json({
          success: false,
          message: "Invalid data received",
        });
      }
    } catch (err) {
      logger.info(err);
      next(err);
    }
  }

  async getBotResponse(req, res, next) {
    try {
      checkValidation(req);
      const query = req.query;

      const botRes = await botResponseRepo.getBotResponse(query);

      return DefaultResponse(
        res,
        200,
        "Bot response fetched successful",
        botRes
      );
    } catch (error) {
      logger.info(error);
      next(error);
    }
  }

  async getBotResponseByBank(req, res, next) {
    try {
      checkValidation(req);
      const { bankName, startDate, endDate } = req.query;

      const botRes = await botResponseRepo.getBankRecordsByBankName(bankName, startDate, endDate);

      return DefaultResponse(
        res,
        200,
        "Bot response fetched successful",
        botRes
      );
    } catch (error) {
      logger.info(error);
      next(error);
    }
  }

  async resetResponse(req, res, next) {
    try {
      checkValidation(req);
      const { id } = req.body;
      const botRes = await botResponseRepo.getBotResponseByID(id);
      let getallPayinDataByUtr
      getallPayinDataByUtr = await payInRepo.getPayinDataByUtr(botRes.utr);
      if (getallPayinDataByUtr.length === 0) {
        getallPayinDataByUtr = await payInRepo.getPayinDataByUsrSubmittedUtr(botRes.utr);
      }

      const hasSuccess = getallPayinDataByUtr?.some((item) => item.status === 'SUCCESS');

      if (!hasSuccess) {
        const data = {
          amount_code: null,
          is_used: false,
        }

        await botResponseRepo.updateBotResponse(id, data);

        const isEqualUTR = getallPayinDataByUtr?.some((item) => item.utr === botRes.utr);
        if (isEqualUTR) {
          const updatePayinID = getallPayinDataByUtr?.filter((item) => item.utr === botRes.utr && item.status !== 'FAILED');
          const updatePayinData = {
            status: "ASSIGNED",
            utr: null,
          }

          await payInRepo.updatePayInData(updatePayinID[0]?.id, updatePayinData)
        }


        return DefaultResponse(
          res,
          200,
          "Bot response Reset successful"
        );
      }
      else {
        const successPayinDataID = getallPayinDataByUtr?.filter((item) => item.status === 'SUCCESS');
        return DefaultResponse(res, 400, `UTR of this entry is already used with ${successPayinDataID[0]?.merchant_order_id} Merchant Order ID, No Changes Applied`);
      }
    } catch (error) {
      logger.info(error);
      next(error);
    }
  }
}

export default new BotResponseController();
