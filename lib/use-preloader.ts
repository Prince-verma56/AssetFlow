import { create } from "zustand"; // npm install zustand

interface PreloaderStore {
  isLoading: boolean;
  runId: number;
  startLoading: () => void;
  finishLoading: () => void;
}

export const usePreloader = create<PreloaderStore>((set) => ({
  isLoading: false,
  runId: 0,
  startLoading: () => set((state) => ({ isLoading: true, runId: state.runId + 1 })),
  finishLoading: () => set({ isLoading: false }),
}));
