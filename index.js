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
        origin: "http://localhost:3000",
    },
});


const PORT = process.env.PORT || 8080; 



io.on("connection", (socket) => {
    console.log(`${socket.id} user is just connected`);

})


export { io };

// Server configuration
// app.listen(PORT, () => {
//     console.log("Server is listening on port " + PORT);
// });

httpServer.listen(PORT, () => {
    console.log(`app is running on Port ${PORT}`);
});