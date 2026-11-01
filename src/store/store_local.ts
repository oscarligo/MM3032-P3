import { create } from "zustand";
import type { Locales } from "../i18n/i18n-types";

type LocaleStore = {
    locale: Locales;
    setLocale: (locale: Locales) => void;
};

export const useLocaleStore = create<LocaleStore>((set) => ({
    locale: "es",
    setLocale: (locale) => set({ locale }),
}));
