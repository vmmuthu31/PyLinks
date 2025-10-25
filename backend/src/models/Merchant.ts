import mongoose, { Document, Schema } from "mongoose";

export interface IMerchant extends Document {
  email: string;
  name: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  webhookSecret?: string;
  walletAddress?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const merchantSchema = new Schema<IMerchant>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    apiKey: {
      type: String,
      sparse: true,
    },
    apiSecret: {
      type: String,
      sparse: true,
    },
    webhookUrl: {
      type: String,
      trim: true,
    },
    webhookSecret: {
      type: String,
    },
    walletAddress: {
      type: String,
      required: false,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

merchantSchema.index({ apiKey: 1 }, { unique: true, sparse: true });
merchantSchema.index({ walletAddress: 1 }, { unique: true, sparse: true });
merchantSchema.index({ email: 1 }, { unique: true });

export const Merchant = mongoose.model<IMerchant>("Merchant", merchantSchema);
