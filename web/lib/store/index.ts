import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice";
import merchantSlice from "./slices/merchantSlice";
import paymentSlice from "./slices/paymentSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    merchant: merchantSlice,
    payment: paymentSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
