import { prisma } from "../client/prisma.js";
import { logger } from "../utils/logger.js";

class BotResponseRepo {
  async botResponse(data) {
    try {
      const botRes = await prisma.telegramResponse.create({
        data: data,
      });

      return botRes;  // Return the created bot response
    } catch (error) {
      logger.info("Error creating bot response", error);
    }
  }

  async getBotData(code) {
    try {
      const botRes = await prisma.telegramResponse.findFirst({
        where: {
          amount_code: code,
        },
      });

      return botRes;
    } catch (error) {
      logger.info(`Error fetching bot data for amount_code: ${code}`, error);
    }
  }

  async updateBotResponse(amount_code) {
    try {
      const updateBotRes = await prisma.telegramResponse.update({
        where: {
          amount_code: amount_code, // Identify the record by amount_code
        },
        data: {
          is_used: true,  // Update the 'is_used' field to true
        },
      });

      return updateBotRes;  // Return the updated response
    } catch (error) {
      logger.info(`Error updating bot response for amount_code: ${amount_code}`, error);
    }
  }

  async getBotResByUtr(usrSubmittedUtr) {
    try {
      const botRes = await prisma.telegramResponse.findFirst({
        where: {
          utr: usrSubmittedUtr, // Search by user-submitted UTR
        },
      });

      return botRes; // Return the found bot response, or null if not found
    } catch (error) {
      logger.info(`Error fetching bot response for UTR: ${usrSubmittedUtr}`, error);
    }
  }

  async updateStatusBotResponse(utr) {
    try {
      const payInUrlRes = await prisma.telegramResponse.update({
        where: {
          utr: utr,
        },
        data: {
          // is_used: true,  
          status: "DUPLICATE",
        },
      })
      console.log('payInUrlRes', payInUrlRes)

      return payInUrlRes
    } catch (error) {
      logger.info('Payin data did not updated', error);
    }
  }


  async getBotResDataByUtr(usrSubmittedUtr) {
    try {
      const botRes = await prisma.telegramResponse.findMany({
        where: {
          utr: usrSubmittedUtr, // Fetch all responses matching the UTR
        },
      });

      return botRes; // Return the list of responses, could be empty if none found
    } catch (error) {
      logger.info(`Error fetching bot responses for UTR: ${usrSubmittedUtr}`, error);
    }
  }

  async updateBotResponseByUtr(id) {
    try {
      const updateBotRes = await prisma.telegramResponse.update({
        where: {
          id: id, // Ensure we're updating the record with the given ID
        },
        data: {
          is_used: true, // Mark the response as used
        },
      });

      return updateBotRes; // Return the updated bot response
    } catch (error) {
      logger.info(`Error updating bot response for ID: ${id}`, error);
    }
  }

  async updateBotResponseToUnusedUtr(id) {
    try {
      const updateBotRes = await prisma.telegramResponse.update({
        where: {
          id: id, // Ensure we're updating the record with the given ID
        },
        data: {
          is_used: false, // Mark the response as unused
        },
      });

      return updateBotRes; // Return the updated bot response
    } catch (error) {
      logger.info(`Error updating bot response to unused for ID: ${id}`, error);
    }
  }

  async getBotResponse(query) {
    try {
      const sno = !isNaN(Number(query.sno)) ? Number(query.sno) : 0;
      const status = query.status || "";
      const amount = !isNaN(Number(query.amount)) ? Number(query.amount) : 0;
      const amount_code = query.amount_code || "";
      const utr = query.utr || "";
      const bankName = query.bankName || "";
      const page = parseInt(query.page) || 1;
      const pageSize = parseInt(query.pageSize) || 10;

      // Ensure pagination values are not negative
      const skip = Math.max(0, (page - 1) * pageSize);
      const take = Math.max(1, pageSize);

      let filter = {
        ...(sno > 0 && { sno: sno }),
        ...(status && { status: status }),
        ...(amount > 0 && { amount: amount }),
        ...(amount_code && { amount_code: { contains: amount_code, mode: "insensitive" } }),
        ...(utr && { utr: utr }),
        ...(bankName && { bankName: bankName }),
      };

      if (query.is_used !== undefined) {
        filter.is_used = query.is_used === 'Used' ? true : query.is_used === 'Unused' ? false : true;
      }

      // Query for bot responses
      const botRes = await prisma.telegramResponse.findMany({
        where: filter,
        skip: skip,
        take: take,
        orderBy: { sno: "desc" },
      });

      // Get total count of records matching the filter
      const totalRecords = await prisma.telegramResponse.count({ where: filter });

      return {
        botRes,
        pagination: {
          page,
          pageSize,
          total: totalRecords,
        },
      };
    } catch (error) {
      logger.info('Failed to get bot responses', error);
    }
  }

  async getBankDataByBankName(bankName) {
    try {

      const res = await prisma.bankAccount.findFirst({
        where: {
          ac_name: bankName,
        },
        include: {
          Merchant_Bank: true, // Includes related Merchant_Bank data
        },
      });

      return res;
    } catch (error) {
      logger.info('Error fetching bank data by name', error);
    }
  }

  async getBankRecordsByBankName(bankName, startDate, endDate) {
    try {
      // Initialize dateFilter object
      const dateFilter = {};

      // Validate and parse startDate and endDate
      if (startDate) {
        const parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate)) {
          throw new Error('Invalid start date');
        }
        dateFilter.gte = parsedStartDate;
      }

      if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate)) {
          throw new Error('Invalid end date');
        }
        dateFilter.lte = parsedEndDate;
      }

      // Query the records with the specified filters
      const res = await prisma.telegramResponse.findMany({
        where: {
          bankName: bankName,
          createdAt: dateFilter,
        },
      });

      // Handle the case where no records are found
      if (!res || res.length === 0) {
        throw new Error('No records found for the given criteria');
      }

      return res;
    } catch (error) {
      logger.info('Error fetching bank records by bank name and date range', error);
    }
  }

  async getBotResponseByID(id) {
    try {
      // Fetch bot response by ID
      const botRes = await prisma.telegramResponse.findFirst({
        where: {
          id: id,
        },
      });

      // Check if the response is found, if not, throw an error or return a message
      if (!botRes) {
        throw new Error(`Bot response with ID ${id} not found.`);
      }

      return botRes;
    } catch (error) {
      logger.info(`Error fetching bot response by ID ${id}`, error);
    }
  }

  async updateBotResponse(id, data) {
    try {
      // Attempt to update the bot response
      const updateBotRes = await prisma.telegramResponse.update({
        where: {
          id: id,
        },
        data: data,
      });

      return updateBotRes;
    } catch (error) {
      logger.info(`Error updating bot response with ID ${id}`, error);
    }
  }

}

export default new BotResponseRepo();
