import { info, error } from '../utils/log.cjs'; // Adjust the path if needed
import { randomUUID } from 'crypto';

const loggingMiddleware = (req, res, next) => {
  const start = Date.now(); // Capture the request start time
  req.id = randomUUID(); // Generate a unique ID for the request
  res.locals.body = {}; // Initialize a body property in res.locals to capture response data

  // Log the incoming request
  const incomingRequestLog = {
    level: 'info',
    message: 'Incoming request',
    method: req.method,
    url: req.url,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
  };
  info(JSON.stringify(incomingRequestLog));

  // Hook into the 'finish' event to log the response when it is sent
  res.on('finish', () => {
    const duration = Date.now() - start; // Calculate response time
    const { statusCode } = res;

    // Check if response has a body
    const responseBody = res.locals.body;

    // Log the response details
    const logResponse = {
      level: statusCode >= 400 ? 'error' : 'info', // Log as 'error' if status code is 400 or higher
      message: 'Response sent',
      method: req.method,
      url: req.url,
      status: statusCode,
      duration: `${duration}ms`,
      requestId: req.id,
      responseBody,
      timestamp: new Date().toISOString(),
    };

    info(JSON.stringify(logResponse));
  });

  // Capture the original send function
  const originalSend = res.send.bind(res);
  res.send = (body) => {
    // Store the response body in res.locals
    res.locals.body = body;
    return originalSend(body);
  };

  next();
};

export default loggingMiddleware;
