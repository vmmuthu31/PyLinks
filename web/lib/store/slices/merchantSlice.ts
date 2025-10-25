import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Merchant {
  _id: string;
  merchantId: string;
  name: string;
  email: string;
  walletAddress?: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

interface MerchantState {
  merchant: Merchant | null;
  loading: boolean;
  error: string | null;
}

const initialState: MerchantState = {
  merchant: null,
  loading: false,
  error: null,
};

const merchantSlice = createSlice({
  name: 'merchant',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setMerchant: (state, action: PayloadAction<Merchant>) => {
      state.merchant = action.payload;
      state.error = null;
    },
    updateMerchant: (state, action: PayloadAction<Partial<Merchant>>) => {
      if (state.merchant) {
        state.merchant = { ...state.merchant, ...action.payload };
      }
    },
    clearMerchant: (state) => {
      state.merchant = null;
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
  setMerchant, 
  updateMerchant, 
  clearMerchant, 
  setError, 
  clearError 
} = merchantSlice.actions;
export default merchantSlice.reducer;
