import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICompatibility extends Document {
  chartId?:         Types.ObjectId;
  userId:           string;
  partner: {
    name:  string;
    dob:   string;
    time?: string;
    city:  string;
  };
  partnerMoonSign:  string;
  gunMilan: {
    totalScore:   number;
    rating:       string;
    ratingColor:  string;
    summary:      string;
    nadiDosha:    boolean;
    bhakutDosha:  boolean;
    koots: {
      name:    string;
      score:   number;
      maxPts:  number;
      status:  string;
      detail:  string;
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const KootSchema = new Schema(
  {
    name:   { type: String, required: true },
    score:  { type: Number, required: true },
    maxPts: { type: Number, required: true },
    status: { type: String, required: true },
    detail: { type: String, default: "" },
  },
  { _id: false }
);

const CompatibilitySchema = new Schema<ICompatibility>(
  {
    chartId: { type: Schema.Types.ObjectId, ref: "Chart", index: true },
    userId:  { type: String, required: true, index: true },

    partner: {
      name:  { type: String, required: true },
      dob:   { type: String, required: true },
      time:  String,
      city:  { type: String, required: true },
    },

    partnerMoonSign: { type: String, default: "" },

    gunMilan: {
      totalScore:  { type: Number, required: true },
      rating:      { type: String, required: true },
      ratingColor: { type: String, default: "" },
      summary:     { type: String, default: "" },
      nadiDosha:   { type: Boolean, default: false },
      bhakutDosha: { type: Boolean, default: false },
      koots:       [KootSchema],
    },
  },
  { timestamps: true }
);

const Compatibility: Model<ICompatibility> =
  mongoose.models.Compatibility ??
  mongoose.model<ICompatibility>("Compatibility", CompatibilitySchema);

export default Compatibility;
