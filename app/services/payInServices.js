import payInRepo from "../repository/payInRepo.js"
import { nanoid } from 'nanoid'



class PayInService {

    async generatePayInUrl(getMerchantRes, bankAccountLinkRes, payInData) {

        const _10_MINUTES = 1000 * 60 * 10;
        const expirationDate = new Date(new Date().getTime() + _10_MINUTES);

        const data = {
            upi_short_code: nanoid(5),       // code added by us
            amount: 0,   // as starting amount will be zero
            status: "ASSIGNED",
            currency: "INR",
            merchant_order_id: payInData?.merchant_order_id,  // for time being we are using this
            user_id: payInData?.user_id,
            bank_acc_id: bankAccountLinkRes?.bankAccountId,
            payin_commission: getMerchantRes?.payin_commission,
            return_url: getMerchantRes?.return_url,
            notify_url: getMerchantRes?.notify_url,
            merchant_id: getMerchantRes?.id,
        }
        const payInUrlRes = await payInRepo.generatePayInUrl(data)
        const updatePayInUrlRes ={
            ...payInUrlRes,
            expirationDate
        }
        return updatePayInUrlRes

    }
}

export default new PayInService()