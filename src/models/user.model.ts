import { Document, model, Schema } from "mongoose";
import { Types } from "mongoose"; // Import Types for ObjectId

export interface IUser extends Document {
  _id: Types.ObjectId; // Explicitly define _id
  googleId: string;
  email: string;
  displayName: string;
  profilePicture?: string; // Optional to match schema
  isPremium: boolean;
}

const UserSchema: Schema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true }, // Explicitly define _id (optional, Mongoose handles it automatically)
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }, // Fixed typo: require -> required
  displayName: { type: String, required: true }, // Changed to displayName to match interface
  profilePicture: { type: String }, // Optional, no required
  isPremium: { type: Boolean, default: false }, // Added default value
});

export default model<IUser>("User", UserSchema);
