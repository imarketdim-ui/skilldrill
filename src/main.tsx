// build: tz-alignment sync 2026-04-28 (rebuild trigger 4 — edge functions deployed + migrations applied)
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
