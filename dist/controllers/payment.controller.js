"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPremiumStatus = exports.handleWebhook = exports.createCheckoutSession = void 0;
const stripe_1 = __importDefault(require("stripe"));
const user_model_1 = __importDefault(require("../models/user.model"));
const email_service_1 = require("../services/email.service");
// Initialize Stripe with type-safe environment variable
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-05-28.basil", // Ensure this matches your stripe package version
});
// Create a Stripe checkout session
const createCheckoutSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user; // Type-safe user from auth middleware
    if (!user) {
        console.error("User not authenticated");
        res.status(401).json({ error: "User not authenticated" });
        return;
    }
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error("STRIPE_SECRET_KEY is not configured");
        res
            .status(500)
            .json({ error: "Server configuration error: Missing Stripe secret key" });
        return;
    }
    if (!process.env.CLIENT_URL) {
        console.error("CLIENT_URL is not configured");
        res
            .status(500)
            .json({ error: "Server configuration error: Missing client URL" });
        return;
    }
    try {
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Lifetime Subscription",
                        },
                        unit_amount: 1000, // $10.00 (in cents)
                    },
                    quantity: 1,
                },
            ],
            customer_email: user.email,
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/payment-success`,
            cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
            client_reference_id: user._id.toString(), // Convert ObjectId to string
        });
        res
            .status(200)
            .json({ sessionId: session.id, message: "Checkout session created" });
    }
    catch (error) {
        console.error("Error creating Stripe checkout session:", error.message, error.stack);
        res.status(500).json({
            error: "Failed to create checkout session",
            details: error.message,
        });
    }
});
exports.createCheckoutSession = createCheckoutSession;
// Handle Stripe webhook events
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error("STRIPE_WEBHOOK_SECRET is not configured");
        res
            .status(500)
            .json({ error: "Server configuration error: Missing webhook secret" });
        return;
    }
    if (!sig) {
        console.error("Missing stripe-signature header");
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (error) {
        console.error("Webhook signature verification failed:", error.message, error.stack);
        res.status(400).json({ error: `Webhook Error: ${error.message}` });
        return;
    }
    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.client_reference_id;
            if (userId) {
                const user = (yield user_model_1.default.findByIdAndUpdate(userId, { isPremium: true }, { new: true }));
                if (user && user.email) {
                    yield (0, email_service_1.sendPremiumConfirmationEmail)(user.email, user.displayName || "User");
                    console.log(`Premium confirmation email sent to ${user.email}`);
                }
                else {
                    console.warn(`User not found or missing email for userId: ${userId}`);
                }
            }
            else {
                console.warn("No client_reference_id in session");
            }
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error("Error processing webhook:", error.message, error.stack);
        res
            .status(500)
            .json({ error: "Failed to process webhook", details: error.message });
    }
});
exports.handleWebhook = handleWebhook;
const getPremiumStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    if (user.isPremium) {
        res.json({ status: "active" });
    }
    else {
        res.json({ status: "inactive" });
    }
});
exports.getPremiumStatus = getPremiumStatus;
