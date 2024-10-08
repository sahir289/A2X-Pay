 import config from "../../config.js";
import {
    CloudWatchLogsClient,
    PutLogEventsCommand,
    CreateLogGroupCommand,
    CreateLogStreamCommand,
    DescribeLogStreamsCommand,
    DescribeLogGroupsCommand
} from "@aws-sdk/client-cloudwatch-logs";
import { createLogger, format, transports } from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const environment = config.nodeProductionLogs || 'staging'; // Default to 'staging'
const cloudWatchClient = new CloudWatchLogsClient({ region: 'eu-north-1' });

// Set log group and stream names based on environment
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
            awsRegion: 'eu-north-1',
            jsonMessage: true,
            createLogGroup: true,
            createLogStream: true,
        }),
    ],
});

// Function to create log group if it does not exist
async function ensureLogGroupExists() {
    try {
        const describeLogGroupsCommand = new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName });
        const response = await cloudWatchClient.send(describeLogGroupsCommand);

        const logGroupExists = response.logGroups && response.logGroups.some(group => group.logGroupName === logGroupName);
        if (!logGroupExists) {
            const createLogGroupCommand = new CreateLogGroupCommand({ logGroupName });
            await cloudWatchClient.send(createLogGroupCommand);
        }
    } catch (error) {
        console.error(`Error ensuring log group exists: ${error.message}`);
    }
}

// Function to create log stream if it does not exist
async function ensureLogStreamExists() {
    try {
        const describeLogStreamsCommand = new DescribeLogStreamsCommand({
            logGroupName,
            logStreamNamePrefix: logStreamName,
        });
        const response = await cloudWatchClient.send(describeLogStreamsCommand);

        const logStreamExists = response.logStreams && response.logStreams.some(stream => stream.logStreamName === logStreamName);
        if (!logStreamExists) {
            const createLogStreamCommand = new CreateLogStreamCommand({ logGroupName, logStreamName });
            await cloudWatchClient.send(createLogStreamCommand);
        }
    } catch (error) {
        console.error(`Error ensuring log stream exists: ${error.message}`);
    }
}

// Function to log messages to CloudWatch manually using AWS SDK v3
export  async function logMessageToCloudWatch(message) {
    await ensureLogGroupExists();
    await ensureLogStreamExists();

    const maxLogMessageSize = 256 * 1024; // 256 KB

    // Check message size and truncate if necessary
    if (Buffer.byteLength(message) > maxLogMessageSize) {
        message = message.slice(0, maxLogMessageSize - 3) + '...'; // Truncate and indicate it was truncated
    }

    const params = {
        logGroupName,
        logStreamName,
        logEvents: [
            {
                message,
                timestamp: Date.now(),
            },
        ],
    };

    try {
        const command = new PutLogEventsCommand(params);
        await cloudWatchClient.send(command);
    } catch (error) {
        console.error('Error sending log to CloudWatch:', error);
    }
}

// Convenience methods for Winston logger
export const info = (...args) => logger.info(...args);
export const error = (...args) => logger.error(...args);


