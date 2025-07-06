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

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import "./config/passport";

import authRoute from "./routes/auth";
import contractsRoute from "./routes/contracts";
import paymentRoute from "./routes/payment";
import { handleWebhook } from "./controllers/payment.controller";

const app = express();

// ✅ Connect MongoDB
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("connected to MongoDB"))
  .catch((err) => console.error(err));

// ✅ Setup CORS (allow both localhost + deployed frontend)
const allowedOrigins = [
  "http://localhost:3000",
  "https://contract-wise-et6d.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ Security and logging
app.use(helmet());
app.use(morgan("dev"));

// ✅ Handle Stripe webhooks before body parsing
app.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// ✅ Standard body parsing
app.use(express.json());

// ✅ Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI! }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use("/auth", authRoute);
app.use("/contracts", contractsRoute);
app.use("/payments", paymentRoute);

// ✅ Start server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server started on Port ${PORT}`);
});
