import { create } from 'zustand';

interface TickerStore {
  tick: number;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export const useTickerStore = create<TickerStore>(() => ({
  tick: Date.now(),
}));

export function useTicker() {
  const tick = useTickerStore((s) => s.tick);

  if (typeof window !== 'undefined' && intervalId === null) {
    intervalId = setInterval(() => {
      useTickerStore.setState({ tick: Date.now() });
    }, 1000);
  }

  return tick;
}
