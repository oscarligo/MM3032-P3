import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import TypesafeI18n from "./i18n/i18n-react";
import { loadAllLocales } from "./i18n/i18n-util.sync";
import { useLocaleStore } from "./store/store_local";

loadAllLocales();

function LocalizedApp() {
  const locale = useLocaleStore((state) => state.locale);
  return <TypesafeI18n locale={locale}><App /></TypesafeI18n>;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LocalizedApp />
  </React.StrictMode>,
);
