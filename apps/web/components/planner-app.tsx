"use client";

import { useState } from "react";
import { TonightPage } from "./minimal-layouts";
import { PlannerHubPage } from "./planner-hub";
import { ProfileHubPage } from "./profile-hub";
import { PlannerProvider } from "./planner-context";
import { COPYRIGHT_LINE } from "@/lib/app-meta";
import { usePlanner } from "@/lib/use-planner";

export type AppTab = "tonight" | "planner" | "profile";

export function PlannerApp() {
  const planner = usePlanner();
  const [tab, setTab] = useState<AppTab>("tonight");

  return (
    <PlannerProvider value={planner}>
      <div className="minimal app-shell">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <div className="shell-inner">
          <header className="app-head">
            <div className="min-bar">
              <div className="brand">
                <img
                  className="brand-lockup brand-lockup-dark"
                  src="/deepskymate-logo-dark.svg"
                  alt="DeepSkyMate"
                  width={300}
                  height={71}
                />
              </div>
              <nav className="main-tabs" aria-label="Main">
                <TabButton id="tonight" label="Tonight" active={tab === "tonight"} onSelect={setTab} />
                <TabButton id="planner" label="Planner" active={tab === "planner"} onSelect={setTab} />
                <TabButton id="profile" label="Profile" active={tab === "profile"} onSelect={setTab} />
              </nav>
            </div>
          </header>
          <main id="main">
            {tab === "tonight" ? <TonightPage /> : null}
            {tab === "planner" ? <PlannerHubPage /> : null}
            {tab === "profile" ? <ProfileHubPage /> : null}
          </main>
          <footer className="app-footer">
            <p>{COPYRIGHT_LINE}</p>
          </footer>
        </div>
      </div>
    </PlannerProvider>
  );
}

function TabButton({
  id,
  label,
  active,
  onSelect,
}: {
  id: AppTab;
  label: string;
  active: boolean;
  onSelect: (tab: AppTab) => void;
}) {
  return (
    <button
      type="button"
      className={`main-tab${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}
