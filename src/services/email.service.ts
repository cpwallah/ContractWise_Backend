import { Resend } from "resend";

// Type declaration for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      RESEND_API_KEY: string;
    }
  }
}

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPremiumConfirmationEmail = async (
  userEmail: string,
  userName: string
): Promise<void> => {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    throw new Error("Server configuration error: Missing Resend API key");
  }

  try {
    await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: userEmail,
      subject: "Welcome to Premium",
      html: `<p>Hi ${userName},</p><p>Welcome to Premium. You are now a premium user of ContractWise!</p>`,
    });
    console.log(`Premium confirmation email sent to ${userEmail}`);
  } catch (error: any) {
    console.error(
      "Error sending premium confirmation email:",
      error.message,
      error.stack
    );
    throw new Error(
      `Failed to send premium confirmation email: ${error.message}`
    );
  }
};
