import Stripe from "stripe";
import { Request, Response } from "express";
import mongoose from "mongoose";
import User, { IUser } from "../models/user.model";
import { sendPremiumConfirmationEmail } from "../services/email.service";

// Ensure process.env types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;
      CLIENT_URL: string;
    }
  }
}

// Initialize Stripe with type-safe environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil", // Ensure this matches your stripe package version
});

// Create a Stripe checkout session
export const createCheckoutSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = req.user as IUser | undefined; // Type-safe user from auth middleware

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
    const session = await stripe.checkout.sessions.create({
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
  } catch (error: any) {
    console.error(
      "Error creating Stripe checkout session:",
      error.message,
      error.stack
    );
    res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message,
    });
  }
};

// Handle Stripe webhook events
export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;

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

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    console.error(
      "Webhook signature verification failed:",
      error.message,
      error.stack
    );
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (userId) {
        const user = (await User.findByIdAndUpdate(
          userId,
          { isPremium: true },
          { new: true }
        )) as IUser | null;

        if (user && user.email) {
          await sendPremiumConfirmationEmail(
            user.email,
            user.displayName || "User"
          );
          console.log(`Premium confirmation email sent to ${user.email}`);
        } else {
          console.warn(`User not found or missing email for userId: ${userId}`);
        }
      } else {
        console.warn("No client_reference_id in session");
      }
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error.message, error.stack);
    res
      .status(500)
      .json({ error: "Failed to process webhook", details: error.message });
  }
};
export const getPremiumStatus = async (req: Request, res: Response) => {
  const user = req.user as IUser;
  if (user.isPremium) {
    res.json({ status: "active" });
  } else {
    res.json({ status: "inactive" });
  }
};
