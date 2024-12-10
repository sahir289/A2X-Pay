import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser"
import router from "./app/routes/index.js";
import { createServer } from "http";
import { Server } from "socket.io";
import config from "./config.js";
import "./app/cron/index.js";
import loggingMiddleware from "./app/middlewares/loggingMiddleware.js";
import { logger } from "./app/utils/logger.js";

const app = express();
app.use(cookieParser())
app.use(cors({
    origin: [`${config?.reactFrontOrigin}`, `${config?.reactPaymentOrigin}`], // List all frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(loggingMiddleware);

// Use routes
app.set('trust proxy', true);
app.use("/", router);
app.get('/test', (req, res) => {
    res.send('This is a test endpoint.');
});
app.use(express.static('public'))
app.use((err, req, res, next) => {
    logger.error(`Error occurred: ${err.message} - Request ID: ${req.id}`);
    res.status(500).send('Internal Server Error');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: [`${config?.reactFrontOrigin}`, `${config?.reactPaymentOrigin}`],
        methods: ["GET", "POST"], // Specify the methods if needed
    },
});


const PORT = process.env.PORT || 8080; 


io.on('connection', (socket) => {
    console.log('Client connected with socket ID:', socket.id);

    // Emit a test message to the client
    socket.emit('new-entry', { message: 'Hello from server!!!', data: {} });

    // Optional: Broadcast to all clients
    io.emit('broadcast-message', { message: 'A new client has connected!' });

    // Listen for client events
    socket.on('client-message', (data) => {
        console.log('Received from client:', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

export { io };


httpServer.listen(PORT, () => {
    console.log(`app is running on Port ${PORT}`);
});