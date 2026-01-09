import { create } from 'zustand';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  counter: number;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: undefined,
  counter: 0,
  startLoading: (message?: string) =>
    set((state) => {
      const nextCounter = state.counter + 1;
      return {
        isLoading: true,
        message: message ?? state.message,
        counter: nextCounter,
      };
    }),
  stopLoading: () =>
    set((state) => {
      const nextCounter = Math.max(0, state.counter - 1);
      return {
        isLoading: nextCounter > 0,
        message: nextCounter > 0 ? state.message : undefined,
        counter: nextCounter,
      };
    }),
}));


