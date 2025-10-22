import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
  txHash: string;
  sessionId: string;
  merchantId: mongoose.Types.ObjectId;
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
  timestamp: Date;
  status: "confirmed" | "pending" | "failed";
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    blockNumber: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "pending", "failed"],
      default: "confirmed",
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

transactionSchema.index({ merchantId: 1, timestamp: -1 });
transactionSchema.index({ status: 1 });

export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema
);
