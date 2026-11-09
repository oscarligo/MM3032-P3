import { create } from "zustand";

type CanvasStore = {
    zoom: number;
    position: { x: number; y: number };
    changeZoom: (amount: number, anchor?: { x: number; y: number }) => void;
    move: (x: number, y: number) => void;
    reset: (position?: { x: number; y: number }) => void;
};

export const useCanvasStore = create<CanvasStore>((set) => ({
    zoom: 0.5,
    position: { x: 0, y: 0 },
    changeZoom: (amount, anchor = { x: 0, y: 0 }) => set((state) => {
        const zoom = Math.min(1.5, Math.max(0.5, Number((state.zoom + amount).toFixed(1))));
        const ratio = zoom / state.zoom;
        return {
            zoom,
            position: {
                x: anchor.x - (anchor.x - state.position.x) * ratio,
                y: anchor.y - (anchor.y - state.position.y) * ratio,
            },
        };
    }),
    move: (x, y) => set((state) => ({
        position: { x: state.position.x + x, y: state.position.y + y },
    })),
    reset: (position = { x: 0, y: 0 }) => set({ zoom: 0.5, position }),
}));
