"use client";

import { useRef, createContext, useContext, ReactNode } from "react";
import LoadingBar, { LoadingBarRef } from "react-top-loading-bar";

interface LoadingBarContextType {
  start: () => void;
  complete: () => void;
  continuousStart: () => void;
  staticStart: () => void;
  increase: (value: number) => void;
  decrease: (value: number) => void;
  getProgress: () => number;
}

const LoadingBarContext = createContext<LoadingBarContextType | null>(null);

export const useLoadingBar = () => {
  const context = useContext(LoadingBarContext);
  if (!context) {
    throw new Error("useLoadingBar must be used within a LoadingBarProvider");
  }
  return context;
};

interface LoadingBarProviderProps {
  children: ReactNode;
}

export default function LoadingBarProvider({ children }: LoadingBarProviderProps) {
  const ref = useRef<LoadingBarRef>(null);

  const contextValue: LoadingBarContextType = {
    start: () => ref.current?.continuousStart(),
    complete: () => ref.current?.complete(),
    continuousStart: () => ref.current?.continuousStart(),
    staticStart: () => ref.current?.staticStart(),
    increase: (value: number) => ref.current?.increase(value),
    decrease: (value: number) => ref.current?.decrease(value),
    getProgress: () => ref.current?.getProgress() || 0,
  };

  return (
    <LoadingBarContext.Provider value={contextValue}>
      <LoadingBar
        color="#667eea"
        ref={ref}
        shadow={true}
        height={3}
        background="transparent"
        transitionTime={300}
        loaderSpeed={500}
        waitingTime={1000}
      />
      {children}
    </LoadingBarContext.Provider>
  );
}
