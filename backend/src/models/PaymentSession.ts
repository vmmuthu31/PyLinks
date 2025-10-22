import mongoose, { Document, Schema } from "mongoose";

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  EXPIRED = "expired",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export interface IPaymentSession extends Document {
  sessionId: string;
  merchantId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  description?: string;
  recipientAddress: string;
  status: PaymentStatus;
  txHash?: string;
  blockNumber?: number;
  paidAt?: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
  webhookAttempts: number;
  webhookLastAttempt?: Date;
  webhookDelivered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSessionSchema = new Schema<IPaymentSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "PYUSD",
    },
    description: {
      type: String,
      trim: true,
    },
    recipientAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    txHash: {
      type: String,
      index: true,
    },
    blockNumber: {
      type: Number,
    },
    paidAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    webhookAttempts: {
      type: Number,
      default: 0,
    },
    webhookLastAttempt: {
      type: Date,
    },
    webhookDelivered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

paymentSessionSchema.index({ merchantId: 1, status: 1 });
paymentSessionSchema.index({ status: 1, expiresAt: 1 });
paymentSessionSchema.index({ recipientAddress: 1, amount: 1 });

export const PaymentSession = mongoose.model<IPaymentSession>(
  "PaymentSession",
  paymentSessionSchema
);
