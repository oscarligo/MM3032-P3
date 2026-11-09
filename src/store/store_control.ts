import { create } from "zustand";

export type ProcedureRegistration = { totalSteps: number; order: number };

type ProcedureStore = {
    procedures: Record<string, ProcedureRegistration>;
    totalSteps: number;
    stepIndex: number;
    isPlaying: boolean;
    registerProcedure: (procedureId: string, totalSteps: number, order: number) => void;
    unregisterProcedure: (procedureId: string) => void;
    previous: () => void;
    next: () => void;
    restart: () => void;
    togglePlaying: () => void;
};

const sumSteps = (procedures: Record<string, ProcedureRegistration>) =>
    Object.values(procedures).reduce((total, procedure) => total + procedure.totalSteps, 0);

export const procedureOffset = (procedures: Record<string, ProcedureRegistration>, procedureId: string) => {
    const procedure = procedures[procedureId];
    if (!procedure) return 0;
    return Object.entries(procedures).reduce(
        (offset, [id, candidate]) => id !== procedureId && candidate.order < procedure.order
            ? offset + candidate.totalSteps
            : offset,
        0,
    );
};

export const useProcedureStore = create<ProcedureStore>((set) => ({
    procedures: {}, totalSteps: 0, stepIndex: -1, isPlaying: false,
    registerProcedure: (procedureId, count, order) => set((state) => {
        const current = state.procedures[procedureId];
        if (current?.totalSteps === count && current.order === order) return state;
        const procedures = { ...state.procedures, [procedureId]: { totalSteps: count, order } };
        return { procedures, totalSteps: sumSteps(procedures), stepIndex: -1, isPlaying: false };
    }),
    unregisterProcedure: (procedureId) => set((state) => {
        if (!state.procedures[procedureId]) return state;
        const procedures = { ...state.procedures };
        delete procedures[procedureId];
        return { procedures, totalSteps: sumSteps(procedures), stepIndex: -1, isPlaying: false };
    }),
    previous: () => set((state) => ({ stepIndex: Math.max(-1, state.stepIndex - 1), isPlaying: false })),
    next: () => set((state) => state.stepIndex >= state.totalSteps - 1
        ? { isPlaying: false }
        : { stepIndex: state.stepIndex + 1 }),
    restart: () => set({ stepIndex: -1, isPlaying: false }),
    togglePlaying: () => set((state) => {
        if (state.totalSteps === 0) return state;
        if (state.stepIndex >= state.totalSteps - 1 || state.stepIndex < 0) return { stepIndex: 0, isPlaying: true };
        return { isPlaying: !state.isPlaying };
    }),
}));
