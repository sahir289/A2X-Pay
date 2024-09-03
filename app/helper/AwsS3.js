import { S3Client } from "@aws-sdk/client-s3";
import config from "../../config.js";
export const s3 = new S3Client({
    credentials: {
        accessKeyId: config?.accessKeyS3,
        secretAccessKey: config?.secretKeyS3
    },
    region: config?.bucketRegion
})

