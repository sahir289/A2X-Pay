import { prisma } from '../client/prisma.js';

class ReportRepo {
    async getReport(merchantCodes, startDate, endDate, localIncludeSubMerchant) {
        try {
            const merchantCodesList = merchantCodes.map(code => `'${code}'`).join(", ");

            if (!localIncludeSubMerchant) {
                const result = await prisma.$queryRawUnsafe(`
                    WITH unified_data AS (
                        SELECT p."approved_at", p."merchant_id", p."confirmed" AS "amount", p."payin_commission" AS "commission", 'Payin' AS "type"
                        FROM public."Payin" p
                        WHERE p.status = 'SUCCESS'
                        
                        UNION ALL
                    
                        SELECT po."approved_at", po."merchant_id", po."amount" AS "amount", po."payout_commision" AS "commission", 'Payout' AS "type"
                        FROM public."Payout" po
                        WHERE po.status = 'SUCCESS' OR po.status = 'REJECTED'
                    
                        UNION ALL
                    
                        SELECT rpo."rejected_at", rpo."merchant_id", rpo."amount" AS "amount", rpo."payout_commision" AS "commission", 'ReversedPayout' AS "type"
                        FROM public."Payout" rpo
                        WHERE rpo.status = 'REJECTED'
                        AND rpo.approved_at IS NOT NULL
                    
                        UNION ALL
                    
                        SELECT s."updatedAt", s."merchant_id", s."amount" AS "amount", NULL AS "commission", 'Settlement' AS "type"
                        FROM public."Settlement" s
                        WHERE s.status = 'SUCCESS'
                    
                        UNION ALL
                    
                        SELECT l."updatedAt", l."merchant_id", l."amount" AS "amount", NULL AS "commission", 'Lien' AS "type"
                        FROM public."Lien" l
                    ),
                    merchant_mapping AS (
                        -- Map each merchant to its parent
                        SELECT 
                            m."code" AS "merchant_code",
                            COALESCE(
                                parent."code",
                                m."code"
                            ) AS "parent_code"
                        FROM public."Merchant" m
                        LEFT JOIN public."Merchant" parent
                        ON m."code" = ANY (parent."child_code")
                    ),
                    filtered_merchants AS (
                        -- Include all merchants matching the provided list or their children
                        SELECT DISTINCT 
                            mm."merchant_code", 
                            mm."parent_code"
                        FROM merchant_mapping mm
                        WHERE mm."parent_code" IN (${merchantCodesList}) 
                           OR mm."merchant_code" IN (${merchantCodesList})
                    ),
                    data_with_parent AS (
                        -- Assign parent merchant to each record
                        SELECT 
                            data.*,
                            mm."parent_code" AS "parent_merchant_code"
                        FROM unified_data data
                        JOIN public."Merchant" m ON data."merchant_id" = m."id"
                        JOIN merchant_mapping mm ON m."code" = mm."merchant_code"
                        WHERE mm."parent_code" IN (SELECT "parent_code" FROM filtered_merchants)
                    ),
                    
                    previous_balance AS (
                        SELECT
                            data."parent_merchant_code" AS "merchant_code",
                            ROUND(
                                (
                                    SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END) -
                                    SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END) - 
                                    (
                                        SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END) + 
                                        SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END) -
                                        SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END)
                                    ) - 
                                    SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END) - 
                                    SUM(CASE WHEN data."type" = 'Lien' THEN data."amount" ELSE 0 END) + 
                                    SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END)
                                ), 2
                            ) AS "previous_balance"
                        FROM data_with_parent data
                        WHERE 
                            DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') < '${startDate}'
                        GROUP BY 
                            data."parent_merchant_code"
                    ),
                    data_with_results AS (
                        SELECT 
                            DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS "date",
                            data."parent_merchant_code" AS "merchant_code",
                            
                            -- Payin Data
                            COUNT(CASE WHEN data."type" = 'Payin' THEN data."amount" END) AS "payInCount",
                            ROUND(SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END), 2) AS "totalPayinAmount",
                            ROUND(SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END), 2) AS "payinCommission",
                    
                            -- Payout Data
                            COUNT(CASE WHEN data."type" = 'Payout' THEN data."amount" END) AS "payOutCount",
                            ROUND(SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END), 2) AS "totalPayoutAmount",
                            ROUND(SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END), 2) AS "payoutCommission",
                    
                            -- Reversed Payout Data
                            COUNT(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" END) AS "reversedPayOutCount",
                            ROUND(SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END), 2) AS "reversedTotalPayoutAmount",
                            ROUND(SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END), 2) AS "reversedPayoutCommission",
                    
                            -- Settlement Data
                            COUNT(CASE WHEN data."type" = 'Settlement' THEN data."amount" END) AS "settlementCount",
                            ROUND(SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END), 2) AS "totalSettlementAmount",
                    
                            -- Lien Data
                            COUNT(CASE WHEN data."type" = 'Lien' THEN data."amount" END) AS "lienCount",
                            ROUND(SUM(CASE WHEN data."type" = 'Lien' THEN data."amount" ELSE 0 END), 2) AS "totalLienAmount",
                    
                            -- Net Balance
                            ROUND(
                                    (
                                        SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END) -
                                        SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END) - 
                                        (
                                            SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END) + 
                                            SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END) -
                                            SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END)
                                        ) - 
                                        SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END) - 
                                        SUM(CASE WHEN data."type" = 'Lien' THEN data."amount" ELSE 0 END) + 
                                        SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END)
                                    ), 2
                            ) AS "netBalance"
                        FROM data_with_parent data
                        WHERE 
                            DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') BETWEEN '${startDate}' AND '${endDate}'
                        GROUP BY 
                            DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), data."parent_merchant_code"
                    ),
                    data_with_total_balance AS (
                        SELECT 
                            dwr.*,
                            COALESCE(pb."previous_balance", 0) AS "previous_balance", -- Ensure previous_balance is never NULL
                            COALESCE(
                                SUM(dwr."netBalance") OVER (
                                    PARTITION BY dwr."merchant_code"
                                    ORDER BY dwr."date"
                                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                                ), 0
                            ) + COALESCE(pb."previous_balance", 0) AS "totalBalance" -- Ensure totalBalance is never NULL
                        FROM data_with_results dwr
                        LEFT JOIN previous_balance pb ON dwr."merchant_code" = pb."merchant_code"
                    )
                    SELECT * FROM data_with_total_balance
                    ORDER BY 
                        "merchant_code", "date" NULLS FIRST;
                `);

                return result;
            } else {
                const result = await prisma.$queryRawUnsafe(`
                   WITH unified_data AS (
                        -- Unified data structure for Payin, Payout, and Settlement
                        SELECT p."approved_at", p."merchant_id", p."confirmed" AS "amount", p."payin_commission" AS "commission", 'Payin' AS "type"
                        FROM public."Payin" p
                        WHERE p.status = 'SUCCESS'

                        UNION ALL

                        SELECT po."approved_at", po."merchant_id", po."amount" AS "amount", po."payout_commision" AS "commission", 'Payout' AS "type"
                        FROM public."Payout" po
                        WHERE po.status = 'SUCCESS' OR po.status = 'REJECTED'

                        UNION ALL

                        SELECT rpo."rejected_at", rpo."merchant_id", rpo."amount" AS "amount", rpo."payout_commision" AS "commission", 'ReversedPayout' AS "type"
                        FROM public."Payout" rpo
                        WHERE rpo.status = 'REJECTED'
                        AND rpo.approved_at IS NOT NULL

                        UNION ALL

                        SELECT s."updatedAt", s."merchant_id", s."amount" AS "amount", NULL AS "commission", 'Settlement' AS "type"
                        FROM public."Settlement" s
                        WHERE s.status = 'SUCCESS'

                        UNION ALL

                        SELECT l."updatedAt", l."merchant_id", l."amount" AS "amount", NULL AS "commission", 'Lien' AS "type"
                        FROM public."Lien" l
                    ),
                    filtered_merchants AS (
                        -- Include all merchants matching the provided list
                        SELECT DISTINCT 
                            m."code" AS "merchant_code"
                        FROM public."Merchant" m
                        WHERE m."code" IN (${merchantCodesList})
                    ),
                    data_with_merchant AS (
                        -- Assign merchant to each record
                        SELECT 
                            data.*,
                            m."code" AS "merchant_code"
                        FROM unified_data data
                        JOIN public."Merchant" m ON data."merchant_id" = m."id"
                        WHERE m."code" IN (SELECT "merchant_code" FROM filtered_merchants)
                    ),
                    previous_balance AS (
                        SELECT
                            data."merchant_code",
                            ROUND(
                                (
                                    SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END) -
                                    SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END) - 
                                    (
                                        SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END) + 
                                        SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END) -
                                        SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END)
                                    ) - 
                                    SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END) - 
                                    SUM(CASE WHEN data."type" = 'Lien' THEN data."amount" ELSE 0 END) + 
                                    SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END)
                                ), 2
                            ) AS "previous_balance"
                        FROM data_with_merchant data
                        WHERE 
                            DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') < '${startDate}'
                        GROUP BY 
                            data."merchant_code"
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

                            -- Reversed Payout Data
                            COUNT(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" END) AS "reversedPayOutCount",
                            ROUND(SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END), 2) AS "reversedTotalPayoutAmount",
                            ROUND(SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END), 2) AS "reversedPayoutCommission",

                            -- Settlement Data
                            COUNT(CASE WHEN data."type" = 'Settlement' THEN data."amount" END) AS "settlementCount",
                            ROUND(SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END), 2) AS "totalSettlementAmount",

                            -- Lien Data
                            COUNT(CASE WHEN data."type" = 'Lien' THEN data."amount" END) AS "lienCount",
                            ROUND(SUM(CASE WHEN data."type" = 'Lien' THEN data."amount" ELSE 0 END), 2) AS "totalLienAmount",

                            -- Net Balance
                            ROUND(
                                    (
                                        SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END) -
                                        SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END) - 
                                        (
                                            SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END) + 
                                            SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END) -
                                            SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END)
                                        ) - 
                                        SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END) - 
                                        SUM(CASE WHEN data."type" = 'Lien' THEN data."amount" ELSE 0 END) + 
                                        SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END)
                                    ), 2
                            ) AS "netBalance"
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
                            dwr.*,
                            COALESCE(pb."previous_balance", 0) AS "previous_balance", -- Ensure previous_balance is never NULL
                            COALESCE(
                                SUM(dwr."netBalance") OVER (
                                    PARTITION BY dwr."merchant_code"
                                    ORDER BY dwr."date"
                                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                                ), 0
                            ) + COALESCE(pb."previous_balance", 0) AS "totalBalance" -- Ensure totalBalance is never NULL
                        FROM data_with_results dwr
                        LEFT JOIN previous_balance pb ON dwr."merchant_code" = pb."merchant_code"
                    )
                    SELECT * FROM data_with_total_balance
                    ORDER BY 
                        "merchant_code", "date" NULLS FIRST;

                `);

                return result;
            }

        } catch (error) {
            console.log(error);
        }
    }

    async getVendorReport(vendorCodes, startDate, endDate) {
        try {
            const vendorCodesList = vendorCodes.map(vendor_code => `'${vendor_code}'`).join(", ");

            const result = await prisma.$queryRawUnsafe(`
                WITH unified_data AS (
    -- Unified data structure for Payin, Payout, and Settlement
    SELECT p."approved_at", b."vendor_code", p."confirmed" AS "amount", p."payin_commission" AS "commission", 'Payin' AS "type"
    FROM public."Payin" p
    JOIN "BankAccount" b ON p.bank_acc_id = b.id
    WHERE p.status = 'SUCCESS' AND b."vendor_code" IN (${vendorCodesList})

    UNION ALL

    SELECT po."approved_at", po."vendor_code", po."amount" AS "amount", po."payout_commision" AS "commission", 'Payout' AS "type"
    FROM public."Payout" po
    WHERE po.status = 'SUCCESS' OR po.status = 'REJECTED'

    UNION ALL

    SELECT rpo."rejected_at", rpo."vendor_code", rpo."amount" AS "amount", rpo."payout_commision" AS "commission", 'ReversedPayout' AS "type"
    FROM public."Payout" rpo
    WHERE rpo.status = 'REJECTED'
    AND rpo.approved_at IS NOT NULL

    UNION ALL

    SELECT vs."updatedAt", vs."vendor_code", vs."amount" AS "amount", NULL AS "commission", 'Settlement' AS "type"
    FROM public."VendorSettlement" vs
    WHERE vs.status = 'SUCCESS'
),
filtered_vendors AS (
    -- Include all vendors matching the provided list
    SELECT DISTINCT 
        v."vendor_code"
    FROM public."Vendor" v
    WHERE v."vendor_code" IN (${vendorCodesList})
),
data_with_vendor AS (
    -- Assign merchant to each record
    SELECT 
        data."approved_at",
        data."amount",
        data."commission",
        data."type",
        fv."vendor_code"  -- Only select vendor_code from filtered_vendors
    FROM unified_data data
    JOIN filtered_vendors fv ON data."vendor_code" = fv."vendor_code"
),
previous_balance AS (
    SELECT
        data."vendor_code",
        ROUND(
            (
                SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END) -
                SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END) - 
                (
                    SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END) + 
                    SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END) -
                    SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END)
                ) - 
                SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END) + 
                SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END)
            ), 2
        ) AS "previous_balance"
    FROM data_with_vendor data
    WHERE 
        DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') < '${startDate}'
    GROUP BY 
        data."vendor_code"
),
data_with_results AS (
    SELECT 
        DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS "date",
        data."vendor_code",

        -- Payin Data
        COUNT(CASE WHEN data."type" = 'Payin' THEN data."amount" END) AS "payInCount",
        ROUND(SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END), 2) AS "totalPayinAmount",
        ROUND(SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END), 2) AS "payinCommission",

        -- Payout Data
        COUNT(CASE WHEN data."type" = 'Payout' THEN data."amount" END) AS "payOutCount",
        ROUND(SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END), 2) AS "totalPayoutAmount",
        ROUND(SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END), 2) AS "payoutCommission",

        -- Reversed Payout Data
        COUNT(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" END) AS "reversedPayOutCount",
        ROUND(SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END), 2) AS "reversedTotalPayoutAmount",
        ROUND(SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END), 2) AS "reversedPayoutCommission",

        -- Settlement Data
        COUNT(CASE WHEN data."type" = 'Settlement' THEN data."amount" END) AS "settlementCount",
        ROUND(SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END), 2) AS "totalSettlementAmount",

        -- Net Balance
        ROUND(
                (
                    SUM(CASE WHEN data."type" = 'Payin' THEN data."amount" ELSE 0 END) -
                    SUM(CASE WHEN data."type" = 'Payout' THEN data."amount" ELSE 0 END) - 
                    (
                        SUM(CASE WHEN data."type" = 'Payin' THEN data."commission" ELSE 0 END) + 
                        SUM(CASE WHEN data."type" = 'Payout' THEN data."commission" ELSE 0 END) -
                        SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."commission" ELSE 0 END)
                    ) - 
                    SUM(CASE WHEN data."type" = 'Settlement' THEN data."amount" ELSE 0 END) + 
                    SUM(CASE WHEN data."type" = 'ReversedPayout' THEN data."amount" ELSE 0 END)
                ), 2
        ) AS "netBalance"
    FROM data_with_vendor data
    WHERE 
        DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') BETWEEN '${startDate}' AND '${endDate}'
        AND (${vendorCodes.length > 0 ? `data."vendor_code" IN (${vendorCodesList})` : "TRUE"})
    GROUP BY 
        DATE(data."approved_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'),
        data."vendor_code"
),
data_with_total_balance AS (
    SELECT 
        dwr.*,
        COALESCE(pb."previous_balance", 0) AS "previous_balance",
        COALESCE(
            SUM(dwr."netBalance") OVER (
                PARTITION BY dwr."vendor_code"
                ORDER BY dwr."date"
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ), 0
        ) + COALESCE(pb."previous_balance", 0) AS "totalBalance"
    FROM data_with_results dwr
    LEFT JOIN previous_balance pb ON dwr."vendor_code" = pb."vendor_code"
)
SELECT * 
FROM data_with_total_balance
ORDER BY 
    "vendor_code", "date" NULLS FIRST;

            `);

            return result;

        } catch (error) {
            console.log(error);
        }
    }
}

export default new ReportRepo()