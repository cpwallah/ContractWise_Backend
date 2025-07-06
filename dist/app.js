"use strict";
// import dotenv from "dotenv";
// dotenv.config();
// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import morgan from "morgan";
// import mongoose from "mongoose";
// import passport from "passport";
// import session from "express-session";
// import MongoStore from "connect-mongo";
// import "./config/passport";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import authRoute from "./routes/auth";
// import contractsRoute from "./routes/contracts";
// import paymentRoute from "./routes/payment";
// import { handleWebhook } from "./controllers/payment.controller";
// const app = express();
// mongoose
//   .connect(process.env.MONGODB_URI!)
//   .then(() => console.log("connected to Mongodb"))
//   .catch((err) => {
//     console.log(err);
//   });
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL,
//     credentials: true,
//   })
// );
// app.use(helmet());
// app.use(morgan("dev"));
// app.post(
//   "/payments/webhook",
//   express.raw({ type: "application/json" }),
//   handleWebhook
// );
// app.use(express.json());
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET!,
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI! }),
//     cookie: {
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//       maxAge: 24 * 60 * 60 * 1000,
//     },
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());
// app.use("/auth", authRoute);
// app.use("/contracts", contractsRoute);
// app.use("/payments", paymentRoute);
// const PORT = 8080;
// app.listen(PORT, () => {
//   console.log(`Server started on Port ${PORT}`);
// });
// // okay
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const passport_1 = __importDefault(require("passport"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
require("./config/passport");
const auth_1 = __importDefault(require("./routes/auth"));
const contracts_1 = __importDefault(require("./routes/contracts"));
const payment_1 = __importDefault(require("./routes/payment"));
const payment_controller_1 = require("./controllers/payment.controller");
const app = (0, express_1.default)();
// ✅ Connect MongoDB
mongoose_1.default
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("connected to MongoDB"))
    .catch((err) => console.error(err));
// ✅ Setup CORS (allow both localhost + deployed frontend)
const allowedOrigins = [
    // "http://localhost:3000",
    "https://contract-wise-et6d.vercel.app",
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
// ✅ Security and logging
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
// ✅ Handle Stripe webhooks before body parsing
app.post("/payments/webhook", express_1.default.raw({ type: "application/json" }), payment_controller_1.handleWebhook);
// ✅ Standard body parsing
app.use(express_1.default.json());
// ✅ Session setup
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
}));
// ✅ Passport
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// ✅ Routes
app.use("/auth", auth_1.default);
app.use("/contracts", contracts_1.default);
app.use("/payments", payment_1.default);
// ✅ Start server
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server started on Port ${PORT}`);
});
