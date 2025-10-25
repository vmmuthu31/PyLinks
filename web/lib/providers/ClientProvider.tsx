"use client";

import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";

function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || ""}
      config={{
        loginMethods: ["wallet", "google", "email"],
        appearance: {
          theme: "dark",
          accentColor: "#ff6b35",
          walletChainType: "ethereum-only",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

export default ClientProvider;
