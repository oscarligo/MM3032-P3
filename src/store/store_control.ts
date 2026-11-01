import { create } from "zustand";

type ProcedureStore = {
    procedureId: string | null;
    totalSteps: number;
    stepIndex: number;
    isPlaying: boolean;
    setProcedure: (procedureId: string, totalSteps: number) => void;
    clearProcedure: (procedureId: string) => void;
    previous: () => void;
    next: () => void;
    restart: () => void;
    togglePlaying: () => void;
};

export const useProcedureStore = create<ProcedureStore>((set) => ({
    procedureId: null,
    totalSteps: 0,
    stepIndex: -1,
    isPlaying: false,
    setProcedure: (procedureId, totalSteps) => set({ procedureId, totalSteps, stepIndex: -1, isPlaying: false }),
    clearProcedure: (procedureId) => set((state) => state.procedureId === procedureId
        ? { procedureId: null, totalSteps: 0, stepIndex: -1, isPlaying: false }
        : state),
    previous: () => set((state) => ({ stepIndex: Math.max(-1, state.stepIndex - 1), isPlaying: false })),
    next: () => set((state) => {
        if (state.stepIndex >= state.totalSteps) return { isPlaying: false };
        return { stepIndex: state.stepIndex + 1 };
    }),
    restart: () => set({ stepIndex: -1, isPlaying: false }),
    togglePlaying: () => set((state) => {
        if (state.totalSteps === 0) return state;
        if (state.stepIndex >= state.totalSteps) return { stepIndex: 0, isPlaying: true };
        if (state.stepIndex < 0) return { stepIndex: 0, isPlaying: true };
        return { isPlaying: !state.isPlaying };
    }),
}));
