import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface IConsultation extends Document {
  chartId: Types.ObjectId;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<ChatMessage>(
  {
    role:      { type: String, enum: ["user", "assistant"], required: true },
    content:   { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const ConsultationSchema = new Schema<IConsultation>(
  {
    chartId: { type: Schema.Types.ObjectId, ref: "Chart", required: true, index: true },
    userId:  { type: String, required: true, index: true },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

const Consultation: Model<IConsultation> =
  mongoose.models.Consultation ??
  mongoose.model<IConsultation>("Consultation", ConsultationSchema);

export default Consultation;
