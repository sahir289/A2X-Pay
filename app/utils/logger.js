import config from "../../config.js";
import { createLogger, format } from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const environment = config.nodeProductionLogs || 'staging'; // Default to 'staging'
const logGroupName = environment === 'production' ? '/trustpay-prod-log' : '/trustpay-stg-log';
const logStreamName = environment === 'production' ? 'trustpay-prod-log-stream' : 'trustpay-stg-log-stream';

// Create Winston logger
export const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new WinstonCloudWatch({
            logGroupName,
            logStreamName,
            awsRegion: 'us-east-1',
            jsonMessage: true,
            createLogGroup: true,
            createLogStream: true,
            credentials: {
                accessKeyId: config?.accessKeyS3,
                secretAccessKey: config?.secretKeyS3,
            },
        }),
    ],
});

// Convenience methods for Winston logger
export const info = (...args) => logger.info(...args);
export const error = (...args) => logger.error(...args);
