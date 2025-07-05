import express, { Router } from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  createCheckoutSession,
  getPremiumStatus,
} from "../controllers/payment.controller";
const router = express.Router();
router.get("/create-checkout-session", isAuthenticated, createCheckoutSession);
router.get("membershipe-status", isAuthenticated, getPremiumStatus);
export default router;
