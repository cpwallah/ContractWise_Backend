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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPremiumConfirmationEmail = void 0;
const resend_1 = require("resend");
// Initialize Resend client
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const sendPremiumConfirmationEmail = (userEmail, userName) => __awaiter(void 0, void 0, void 0, function* () {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is not configured");
        throw new Error("Server configuration error: Missing Resend API key");
    }
    try {
        yield resend.emails.send({
            from: "Acme <onboarding@resend.dev>",
            to: userEmail,
            subject: "Welcome to Premium",
            html: `<p>Hi ${userName},</p><p>Welcome to Premium. You are now a premium user of ContractWise!</p>`,
        });
        console.log(`Premium confirmation email sent to ${userEmail}`);
    }
    catch (error) {
        console.error("Error sending premium confirmation email:", error.message, error.stack);
        throw new Error(`Failed to send premium confirmation email: ${error.message}`);
    }
});
exports.sendPremiumConfirmationEmail = sendPremiumConfirmationEmail;
