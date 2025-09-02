import "./bootstrap.js";
import "k-utilities/load-env.js";
import { mkdirSync } from "fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import authRoute from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import errorHandlerMiddleware from "./middlewares/error.js";
import { RequestRateLimiter } from "k-utilities/express-middleware.js";
// import ProductNotifier from "./models/ProductNotifier";

const port = process.env.PORT || 3000;
const methods = process.env.ALLOWED_METHODS || "GET,PUT,POST,DELETE";
const origin = process.env.CORS_ORIGIN?.split(",") || "*";
const envMode = process.env.NODE_ENV || "development";
const app = express();

mkdirSync("./uploads/", { recursive: true });

app.set("trust proxy", true);

app.use(new RequestRateLimiter(1, 150).limitRate);

// Security middleware
app.use(helmet());
app.use(cors({ origin, methods, credentials: false }));

// Request parsing
app.use(express.json({ limit: "1200kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());
app.use(helmet.xssFilter());

// Routes
app.use("/api/auth", authRoute);
app.use("/api", apiRoutes);
app.use("/*", (req, res, next) => next("NOT_FOUND"));
app.use(errorHandlerMiddleware);

// Register observers with the subject
// const productNotifier = new ProductNotifier();
// const shoppingCartObserver = new ShoppingCartObserver();

// productNotifier.addObserver(shoppingCartObserver);

// // Notify observers with some data
// subject.notify("Hello observers!");

app.listen(port, (error) => {
  if (!error) return console.log(`Server running on http://localhost:${port} in ${envMode} mode`);
  console.log("Failed to start server:", error);
  process.exit(1);
});
