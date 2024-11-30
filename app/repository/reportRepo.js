import { prisma } from '../client/prisma.js';

class ReportRepo {
  async getReport(merchantCodes, startDate, endDate) {
    try {
      const merchantCodesList = merchantCodes.map(code => `'${code}'`).join(", ");

      const result = await prisma.$queryRawUnsafe(`
          WITH unified_data AS (
              -- Unified data structure for Payin, Payout, and Settlement
              SELECT p."approved_at", p."merchant_id", p."confirmed" AS "amount", p."payin_commission" AS "commission", 'Payin' AS "type"
              FROM public."Payin" p
              WHERE p.status = 'SUCCESS'
              
              UNION ALL
  
              SELECT po."updatedAt", po."merchant_id", po."amount" AS "amount", po."payout_commision" AS "commission", 'Payout' AS "type"
              FROM public."Payout" po
              WHERE po.status = 'SUCCESS'
  
              UNION ALL
  
              SELECT s."updatedAt", s."merchant_id", s."amount" AS "amount", NULL AS "commission", 'Settlement' AS "type"
              FROM public."Settlement" s
              WHERE s.status = 'SUCCESS'
  
              UNION ALL
  
              SELECT l."updatedAt", l."merchant_id", l."amount" AS "amount", NULL AS "commission", 'Lien' AS "type"
              FROM public."Lien" l
          ),
          data_with_results AS (
              SELECT 
                  DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS "date",
                  m."code" AS "merchant_code",
                  
                  -- Payin Data
                  COUNT(CASE WHEN data."type" = 'Payin' THEN data."amount" END) AS "payInCount",
                  ROUND(SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END), 2) AS "totalPayinAmount",
                  ROUND(SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END), 2) AS "payinCommission",
  
                  -- Payout Data
                  COUNT(CASE WHEN data."type" = 'Payout' THEN data."amount" END) AS "payOutCount",
                  ROUND(SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END), 2) AS "totalPayoutAmount",
                  ROUND(SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END), 2) AS "payoutCommission",
  
                  -- Settlement Data
                  COUNT(CASE WHEN data."type" = 'Settlement' THEN data."amount" END) AS "settlementCount",
                  ROUND(SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END), 2) AS "totalSettlementAmount",
  
                  -- Lien Data
                  COUNT(CASE WHEN data."type" = 'Lien' THEN data."amount" END) AS "lienCount",
                  ROUND(SUM(CASE WHEN data."type" = 'Lien' THEN data."amount" ELSE 0 END), 2) AS "totalLienAmount",
  
                  -- Net Balance
                  ROUND(
                      SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END) -
                          SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END) - 
                          (
                              SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END) + 
                              SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END)
                          )
                      - 
                      SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END) - 
                      SUM(CASE WHEN data."type" = 'Lien' THEN data."amount" ELSE 0 END), 
                  2) AS "netBalance"
              FROM unified_data data
              JOIN public."Merchant" m ON data."merchant_id" = m."id"
              WHERE 
                  DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') BETWEEN '${startDate}' AND '${endDate}'
                  AND (${merchantCodes.length > 0 ? `m."code" IN (${merchantCodesList})` : "TRUE"})
              GROUP BY 
                  DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), m."code"
          ),
          data_with_total_balance AS (
              SELECT 
                  *,
                  -- Total Balance
                  SUM("netBalance") OVER (
                      PARTITION BY "merchant_code" 
                      ORDER BY "date"
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                  ) AS "totalBalance"
              FROM data_with_results
          )
          SELECT * FROM data_with_total_balance
          ORDER BY 
              "merchant_code", "date" NULLS FIRST;
      `);
  
      return result;
  
    } catch (error) {
      console.log(error);
    }

  }
}

export default new ReportRepo()