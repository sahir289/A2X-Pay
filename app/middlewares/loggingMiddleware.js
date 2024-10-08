import { info, error } from '../utils/log.cjs'; // Adjust the path if needed
import { randomUUID } from 'crypto';

const loggingMiddleware = (req, res, next) => {
  const start = Date.now();
  req.id = randomUUID();
  res.locals.body = {};

  const incomingRequestLog = {
    level: 'info',
    message: 'Incoming request',
    method: req.method,
    url: req.url,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    body: req.body, // Consider filtering out sensitive data
    params: req.params,
    query: req.query,
    headers: {
      host: req.headers.host,
      'user-agent': req.headers['user-agent'],
    },
    clientIp: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
  };

  info(incomingRequestLog);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    const logResponse = {
      level: statusCode >= 400 ? 'error' : 'info',
      message: 'Response sent',
      method: req.method,
      url: req.url,
      status: statusCode,
      duration: `${duration}ms`,
      requestId: req.id,
      responseBody: res.locals.body,
      timestamp: new Date().toISOString(),
    };

    info(logResponse);
  });

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    res.locals.body = body;
    return originalSend(body);
  };

  next();
};

export default loggingMiddleware;
