import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User, { IUser } from "../models/user.model";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // callbackURL:
      //   // process.env.GOOGLE_CALLBACK_URL ||
      //   `${process.env.GOOGLE_CALLBACK_URL}/auth/google/callback` ||
      //   "http://localhost:8080/auth/google/callback",
      callbackURL: process.env.GOOGLE_CALLBACK_URL
        ? `${process.env.GOOGLE_CALLBACK_URL.replace(
            /\/$/,
            ""
          )}/auth/google/callback`
        : "http://localhost:8080/auth/google/callback",
      scope: ["profile", "email"], // Explicitly request profile and email
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName || "Unknown User", // Fallback for undefined
            email: profile.emails?.[0]?.value, // Safe access
            profilePicture: profile.photos?.[0]?.value, // Safe access
          });
        }
        done(null, user);
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
