import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, createLightTheme, tokens } from "@fluentui/react-components";
import App from "./App.js";
import "./styles.css";
import "./FeatureStories.css";
import "./Docs.css";

const zetaTheme = createLightTheme({
  10: "#e7f7ed",
  20: "#d0f0dc",
  30: "#b6e6c8",
  40: "#98d9ae",
  50: "#77c88f",
  60: "#58b574",
  70: "#3ca35b",
  80: "#288f4b",
  90: "#1d7a3f",
  100: "#186c37",
  110: "#145d30",
  120: "#104e29",
  130: "#0c4022",
  140: "#08351c",
  150: "#052a16",
  160: "#031f10",
});

zetaTheme.colorNeutralBackground1 = "#f7f8f4";
zetaTheme.colorNeutralBackground2 = "#ffffff";
zetaTheme.colorNeutralBackground3 = "#eef1ec";
zetaTheme.colorNeutralStroke1 = "#dce3db";
zetaTheme.colorNeutralForeground1 = "#17231d";
zetaTheme.colorNeutralForeground2 = "#617166";
zetaTheme.colorBrandForeground1 = "#186c37";
zetaTheme.fontFamilyBase = '"Segoe UI Variable", "Segoe UI", sans-serif';
zetaTheme.fontFamilyMonospace = '"Cascadia Code", "SFMono-Regular", monospace';
zetaTheme.borderRadiusMedium = tokens.borderRadiusMedium;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FluentProvider theme={zetaTheme} className="theme-root">
      <App />
    </FluentProvider>
  </StrictMode>,
);
