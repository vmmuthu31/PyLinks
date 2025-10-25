import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Payment {
  sessionId: string;
  merchantId: string;
  amount: number;
  currency: string;
  description?: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  txHash?: string;
  createdAt: string;
  expiresAt: string;
}

interface PaymentState {
  payments: Payment[];
  currentPayment: Payment | null;
  loading: boolean;
  error: string | null;
}

const initialState: PaymentState = {
  payments: [],
  currentPayment: null,
  loading: false,
  error: null,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setPayments: (state, action: PayloadAction<Payment[]>) => {
      state.payments = action.payload;
      state.error = null;
    },
    addPayment: (state, action: PayloadAction<Payment>) => {
      state.payments.unshift(action.payload);
    },
    updatePayment: (state, action: PayloadAction<{ sessionId: string; updates: Partial<Payment> }>) => {
      const { sessionId, updates } = action.payload;
      const paymentIndex = state.payments.findIndex(p => p.sessionId === sessionId);
      if (paymentIndex !== -1) {
        state.payments[paymentIndex] = { ...state.payments[paymentIndex], ...updates };
      }
      if (state.currentPayment?.sessionId === sessionId) {
        state.currentPayment = { ...state.currentPayment, ...updates };
      }
    },
    setCurrentPayment: (state, action: PayloadAction<Payment | null>) => {
      state.currentPayment = action.payload;
    },
    clearPayments: (state) => {
      state.payments = [];
      state.currentPayment = null;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { 
  setLoading, 
  setPayments, 
  addPayment, 
  updatePayment, 
  setCurrentPayment, 
  clearPayments, 
  setError, 
  clearError 
} = paymentSlice.actions;
export default paymentSlice.reducer;
