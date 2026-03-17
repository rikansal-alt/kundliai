import mongoose, { Schema, Document, Model } from "mongoose";

export type ChartStyle = "south-indian" | "north-indian" | "bengali";
export type UserTier = "guest" | "registered" | "silver" | "gold";

export interface IUser extends Document {
  phone?: string;
  googleId?: string;
  email?: string;
  tier: UserTier;
  name: string;
  chartStyle: ChartStyle;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone:      { type: String, sparse: true, unique: true, index: true },
    googleId:   { type: String, sparse: true, unique: true, index: true },
    email:      { type: String, sparse: true },
    tier:       { type: String, enum: ["guest", "registered", "silver", "gold"], default: "registered" },
    name:       { type: String, required: true },
    chartStyle: {
      type:    String,
      enum:    ["south-indian", "north-indian", "bengali"],
      default: "south-indian",
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
