import { create } from "zustand";

type CanvasStore = {
    zoom: number;
    position: { x: number; y: number };
    changeZoom: (amount: number) => void;
    move: (x: number, y: number) => void;
    reset: (position?: { x: number; y: number }) => void;
};

export const useCanvasStore = create<CanvasStore>((set) => ({
    zoom: 0.5,
    position: { x: 0, y: 0 },
    changeZoom: (amount) => set((state) => ({
        zoom: Math.min(1.5, Math.max(0.5, Number((state.zoom + amount).toFixed(1)))),
    })),
    move: (x, y) => set((state) => ({
        position: { x: state.position.x + x, y: state.position.y + y },
    })),
    reset: (position = { x: 0, y: 0 }) => set({ zoom: 0.5, position }),
}));
