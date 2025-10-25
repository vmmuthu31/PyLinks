"use client";

import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "../store";

function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
        clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || ""}
        config={{
          loginMethods: ["wallet", "google", "email"],
          appearance: {
            theme: "light",
            accentColor: "#6366f1",
            walletChainType: "ethereum-only",
          },
          supportedChains: [
            {
              id: 11155111,
              name: "Sepolia",
              network: "sepolia",
              nativeCurrency: {
                decimals: 18,
                name: "Ethereum",
                symbol: "ETH",
              },
              rpcUrls: {
                default: {
                  http: ["https://ethereum-sepolia-rpc.publicnode.com"],
                },
                public: {
                  http: ["https://ethereum-sepolia-rpc.publicnode.com"],
                },
              },
              blockExplorers: {
                default: {
                  name: "Etherscan",
                  url: "https://sepolia.etherscan.io",
                },
              },
            },
          ],
        }}
      >
        {children}
      </PrivyProvider>
    </ReduxProvider>
  );
}

export default ClientProvider;
