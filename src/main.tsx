import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import TypesafeI18n, { useI18nContext } from "./i18n/i18n-react";
import { loadAllLocales } from "./i18n/i18n-util.sync";
import { useLocaleStore } from "./store/store_local";

loadAllLocales();

function LocalizedApp() {
  const locale = useLocaleStore((state) => state.locale);
  return <TypesafeI18n locale={locale}><LocaleSync locale={locale} /></TypesafeI18n>;
}

function LocaleSync({ locale }: { locale: ReturnType<typeof useLocaleStore.getState>["locale"] }) {
  const { setLocale } = useI18nContext();

  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LocalizedApp />
  </React.StrictMode>,
);
