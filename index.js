import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser"
import router from "./app/routes/index.js";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(cookieParser())

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // List all frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use routes
app.use("/a2x", router);
app.use(express.static('public'))

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: [
            "http://localhost:3000",
            "http://localhost:5173" ,
            // Add any other origins you need here
        ],
        methods: ["GET", "POST"], // Specify the methods if needed
    },
});


const PORT = process.env.PORT || 8080; 


io.on('connection', (socket) => {
    console.log('Client connected with socket ID:', socket.id);

    // Emit a test message to the client
    socket.emit('new-entry', { message: 'Hello from server!', data: {} });

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