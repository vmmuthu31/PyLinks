import mongoose, { Document, Schema } from 'mongoose';

export enum DisputeStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  REFUND_FAILED = 'refund_failed'
}

export enum DisputeResolution {
  FAVOR_MERCHANT = 'favor_merchant',
  FAVOR_CUSTOMER = 'favor_customer',
  PARTIAL_REFUND = 'partial_refund',
  REFUND_CUSTOMER = 'refund_customer'
}

export interface DisputeDocument extends Document {
  paymentId: mongoose.Types.ObjectId;
  customerAddress: string;
  merchantAddress: string;
  reason: string;
  description: string;
  evidence: string[];
  amount: string;
  status: DisputeStatus;
  resolution?: DisputeResolution;
  adminNotes?: string;
  refundAmount?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  expiresAt: Date;
}

const disputeSchema = new Schema<DisputeDocument>({
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
    index: true
  },
  customerAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  merchantAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'product_not_received',
      'product_defective',
      'service_not_provided',
      'unauthorized_charge',
      'duplicate_charge',
      'billing_error',
      'other'
    ]
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  evidence: [{
    type: String,
    maxlength: 500
  }],
  amount: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(DisputeStatus),
    default: DisputeStatus.PENDING,
    index: true
  },
  resolution: {
    type: String,
    enum: Object.values(DisputeResolution)
  },
  adminNotes: {
    type: String,
    maxlength: 2000
  },
  refundAmount: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
disputeSchema.index({ paymentId: 1, status: 1 });
disputeSchema.index({ customerAddress: 1, createdAt: -1 });
disputeSchema.index({ merchantAddress: 1, createdAt: -1 });
disputeSchema.index({ status: 1, expiresAt: 1 });

// Middleware to update updatedAt on save
disputeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Dispute = mongoose.model<DisputeDocument>('Dispute', disputeSchema);
