import { create } from "zustand";

export type Theme = "light" | "dark";

type UIStore = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
    theme: "light",
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));
