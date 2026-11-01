import { create } from "zustand";

type FormulaStore = {
    formula: string;
    setFormula: (formula: string) => void;
};

export const useFormulaStore = create<FormulaStore>((set) => ({
    formula: "∀x (P(x) → ∃y Q(x, y))",
    setFormula: (formula) => set({ formula }),
}));
