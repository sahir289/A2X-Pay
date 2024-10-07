const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.simple()
  ),
  transports: [
    new transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: 'info',
    }),
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
  ],
});

const info = (...args) => logger.info(...args);
const error = (...args) => logger.error(...args);

module.exports = { info, error };
