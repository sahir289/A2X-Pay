const { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand, CreateLogStreamCommand, DescribeLogStreamsCommand, DescribeLogGroupsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const { createLogger, format, transports } = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');

const cloudWatchClient = new CloudWatchLogsClient({ region: 'eu-north-1' });
const logGroupName = '/trustpay-stg-log';
const logStreamName = 'trustpay-log-stream';

// Create Winston logger
const logger = createLogger({
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
async function logMessageToCloudWatch(message) {
  await ensureLogGroupExists();
  await ensureLogStreamExists();

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
const info = (...args) => logger.info(...args);
const error = (...args) => logger.error(...args);

module.exports = { info, error, logMessageToCloudWatch };
