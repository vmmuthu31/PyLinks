import mongoose, { Document, Schema } from "mongoose";

export interface ICustomer extends Document {
  customerId: string;
  name: string;
  email: string;
  walletAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    walletAddress: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Customer = mongoose.model<ICustomer>("Customer", CustomerSchema);
