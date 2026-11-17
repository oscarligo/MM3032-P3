import { create } from "zustand";
import type { InterpretationDefinition } from "../features/semantic-evaluator/types";

type InterpretationStore = {
    definition?: InterpretationDefinition;
    validationWarnings: string[];
    setDefinition: (definition?: InterpretationDefinition) => void;
    setValidationWarnings: (validationWarnings: string[]) => void;
};

export const useInterpretationStore = create<InterpretationStore>((set) => ({
    definition: undefined,
    validationWarnings: [],
    setDefinition: (definition) => set({ definition }),
    setValidationWarnings: (validationWarnings) => set({ validationWarnings }),
}));
