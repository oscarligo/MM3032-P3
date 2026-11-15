import { create } from "zustand";
import type { InterpretationDefinition } from "../features/semantic-evaluator/types";

type InterpretationStore = {
    definition?: InterpretationDefinition;
    setDefinition: (definition?: InterpretationDefinition) => void;
};

export const useInterpretationStore = create<InterpretationStore>((set) => ({
    definition: undefined,
    setDefinition: (definition) => set({ definition }),
}));
