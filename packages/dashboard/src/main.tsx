import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, createDarkTheme, tokens } from "@fluentui/react-components";
import App from "./App.js";
import "./styles.css";

const zetaTheme = createDarkTheme({
  10: "#07140d",
  20: "#0a2114",
  30: "#0d301b",
  40: "#104020",
  50: "#125126",
  60: "#15632c",
  70: "#187632",
  80: "#1b8938",
  90: "#1e9d3e",
  100: "#23b145",
  110: "#32c153",
  120: "#4bce69",
  130: "#69da81",
  140: "#89e49b",
  150: "#aaedb7",
  160: "#cef5d5",
});

zetaTheme.colorNeutralBackground1 = "#0b0d0c";
zetaTheme.colorNeutralBackground2 = "#111411";
zetaTheme.colorNeutralBackground3 = "#171b18";
zetaTheme.colorNeutralStroke1 = "#2a302c";
zetaTheme.colorNeutralForeground1 = "#f4f7f4";
zetaTheme.colorNeutralForeground2 = "#aeb8b0";
zetaTheme.colorBrandForeground1 = "#69da81";
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
