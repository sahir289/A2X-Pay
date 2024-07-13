    import bodyParser from "body-parser";
    import cors from "cors";
    import express from "express";

    import cookieParser from "cookie-parser"
    import router from "./app/routes/index.js";


    const app = express();
    app.use(cookieParser())

    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Use routes
    app.use("/a2x", router);
    app.use(express.static('public'))


    const PORT = process.env.PORT || 8080; // Use the environment variable PORT or default to 8080

    // Server configuration
    app.listen(PORT, () => {
        console.log("Server is listening on port " + PORT);
    });