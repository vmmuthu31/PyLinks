import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  merchantId: mongoose.Types.ObjectId;
  txHash: string;
  amount: string;
  userWallet: string;
  memo?: string;
  status: "success" | "failed" | "pending";
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    txHash: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: String,
      required: true,
    },
    userWallet: {
      type: String,
      required: true,
      index: true,
    },
    memo: {
      type: String,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for merchant queries
paymentSchema.index({ merchantId: 1, createdAt: -1 });
paymentSchema.index({ merchantId: 1, status: 1 });

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
