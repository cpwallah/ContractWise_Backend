"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.ObjectId, auto: true }, // Explicitly define _id (optional, Mongoose handles it automatically)
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // Fixed typo: require -> required
    displayName: { type: String, required: true }, // Changed to displayName to match interface
    profilePicture: { type: String }, // Optional, no required
    isPremium: { type: Boolean, default: false }, // Added default value
});
exports.default = (0, mongoose_1.model)("User", UserSchema);
