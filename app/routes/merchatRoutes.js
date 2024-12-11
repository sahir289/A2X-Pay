import express from "express";
import merchantController from "../controller/merchantController.js";
import { merchantCreateValidator } from "../helper/validators.js";
import isAuthenticated from "../middlewares/authMiddleware.js";
import { prisma } from '../client/prisma.js'

import { v4 as uuidv4 } from "uuid";



const merchantRouter = express();

merchantRouter.post(
  "/create-merchant",isAuthenticated,
  merchantCreateValidator,
  merchantController.createMerchant
);

merchantRouter.put(
  "/update-merchant",
  isAuthenticated,
  merchantController.updateMerchant
);

merchantRouter.get(
  "/get-merchant",
  isAuthenticated,
  merchantController.getMerchants
);

merchantRouter.get(
  "/getall-merchant",
  isAuthenticated,
  merchantController.getAllMerchants
);

merchantRouter.get(
  "/getall-merchant-grouping",
  isAuthenticated,
  merchantController.getAllMerchantsGrouping
);

merchantRouter.get(
  "/getall-merchant-data",
  isAuthenticated,
  merchantController.getAllMerchantsData
);

merchantRouter.delete(
  "/delete-merchant",
  isAuthenticated,
  merchantController.deleteMerchant
)

merchantRouter.post('/populate-api-keys', async (req, res) => {
  try {
    const merchants = await prisma.merchant.findMany({
      where: { public_api_key: null }, 
    });

    for (const merchant of merchants) {
      const upd = await prisma.merchant.update({
        where: { id: merchant.id },
        data: { public_api_key: uuidv4() }, 
      });
    }

    res.status(200).send('Successfully updated');
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to update');
  }
});

export default merchantRouter;
