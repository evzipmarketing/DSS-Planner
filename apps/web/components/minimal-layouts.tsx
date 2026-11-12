"use client";

import { useState } from "react";
import { AltitudeChart } from "./altitude-chart";
import { BortlePanel } from "./bortle-panel";
import { DatePanel } from "./date-panel";
import { ExposurePlan } from "./exposure-plan";
import { FramingPreview } from "./framing-preview";
import { LocationPanel } from "./location-panel";
import { ObjectCard, Shortlist } from "./target-panels";
import { RigPanel } from "./rig-panel";
import { WeatherPanel } from "./weather-panel";
import { usePlannerState } from "./planner-context";

export type MinimalLayout = "a" | "b" | "c" | "d";

export function MinimalShell({ layout }: { layout: MinimalLayout }) {
  switch (layout) {
    case "a":
      return <LayoutFocused />;
    case "b":
      return <LayoutPanes />;
    case "c":
      return <LayoutStepper />;
    case "d":
      return <LayoutHero />;
    default: {
      const unexpected: never = layout;
      return unexpected;
    }
  }
}

function LayoutFocused() {
  const planner = usePlannerState();
  const selectedId = planner.selected?.id ?? null;
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const open = selectedId != null && closedFor !== selectedId;
  return (
    <div className="minimal layout-a">
      <header className="min-bar">
        <strong>DSS Planner</strong>
        <div className="min-chips">
          <details>
            <summary>{planner.site.name}</summary>
            <LocationPanel />
          </details>
          <details>
            <summary>{planner.date}</summary>
            <DatePanel />
          </details>
          <details>
            <summary>Bortle {planner.bortle}</summary>
            <BortlePanel />
          </details>
        </div>
        <VisionButton />
      </header>
      <details className="one-line">
        <summary>
          <WeatherPanel plain />
          <span> · {rigLine(planner.telescope?.name, planner.camera?.name)}</span>
        </summary>
        <div className="expand-grid">
          <WeatherPanel />
          <RigPanel />
        </div>
      </details>
      <Shortlist />
      {open ? (
        <aside className="sheet" aria-label="Target details">
          <button type="button" className="ghost" onClick={() => setClosedFor(selectedId)}>
            Close
          </button>
          <DetailStack />
        </aside>
      ) : null}
    </div>
  );
}

function LayoutPanes() {
  const planner = usePlannerState();
  return (
    <div className="minimal layout-b">
      <aside className="pane setup">
        <div className="min-bar">
          <strong>DSS Planner</strong>
          <VisionButton />
        </div>
        <details open>
          <summary>Place and time</summary>
          <LocationPanel />
          <DatePanel />
          <BortlePanel />
        </details>
        <details>
          <summary>Sky</summary>
          <WeatherPanel />
        </details>
        <details>
          <summary>Rig</summary>
          <RigPanel />
        </details>
      </aside>
      <main className="pane list">
        <Shortlist />
      </main>
      <aside className="pane detail" aria-label="Target details">
        {planner.selected ? <DetailStack /> : <p className="quiet-line">Select a target.</p>}
      </aside>
    </div>
  );
}

function LayoutStepper() {
  const [step, setStep] = useState<"where" | "gear" | "results">("results");
  return (
    <div className="minimal layout-c">
      <header className="min-bar">
        <strong>DSS Planner</strong>
        <div className="steps" role="tablist" aria-label="Setup">
          <StepButton current={step} id="where" onSelect={setStep}>
            Where and when
          </StepButton>
          <StepButton current={step} id="gear" onSelect={setStep}>
            Gear
          </StepButton>
          <StepButton current={step} id="results" onSelect={setStep}>
            Results
          </StepButton>
        </div>
        <VisionButton />
      </header>
      {step === "where" ? (
        <section className="step-card">
          <LocationPanel />
          <DatePanel />
          <BortlePanel />
          <WeatherPanel />
          <button type="button" className="ghost" onClick={() => setStep("gear")}>
            Next
          </button>
        </section>
      ) : null}
      {step === "gear" ? (
        <section className="step-card">
          <RigPanel />
          <button type="button" className="ghost" onClick={() => setStep("results")}>
            See targets
          </button>
        </section>
      ) : null}
      {step === "results" ? <Shortlist detail={<DetailStack />} /> : null}
    </div>
  );
}

function LayoutHero() {
  const planner = usePlannerState();
  const [adjust, setAdjust] = useState(false);
  const [more, setMore] = useState(false);
  return (
    <div className={`minimal layout-d${more ? " show-all" : ""}`}>
      <header className="hero">
        <div className="min-bar">
          <strong>DSS Planner</strong>
          <VisionButton />
        </div>
        <h1>Tonight from {planner.site.name}</h1>
        <p>
          <WeatherPanel plain />
          <span> · Bortle {planner.bortle} · {planner.date}</span>
        </p>
      </header>
      <Shortlist />
      <div className="hero-actions">
        <button type="button" className="ghost" aria-pressed={adjust} onClick={() => setAdjust((value) => !value)}>
          Adjust
        </button>
        <button type="button" className="ghost" aria-pressed={more} onClick={() => setMore((value) => !value)}>
          More targets
        </button>
      </div>
      {adjust ? (
        <section className="step-card">
          <LocationPanel />
          <DatePanel />
          <BortlePanel />
          <RigPanel />
        </section>
      ) : null}
      {planner.selected ? <DetailStack /> : null}
    </div>
  );
}

function DetailStack() {
  return (
    <div className="detail-stack">
      <ObjectCard />
      <AltitudeChart />
      <FramingPreview />
      <ExposurePlan />
    </div>
  );
}

function VisionButton() {
  const planner = usePlannerState();
  return (
    <button
      type="button"
      className="vision"
      aria-pressed={planner.vision === "red"}
      onClick={() => planner.setVision(planner.vision === "red" ? "ink" : "red")}
    >
      {planner.vision === "red" ? "Desk light" : "Night vision"}
    </button>
  );
}

function StepButton({
  current,
  id,
  onSelect,
  children,
}: {
  current: "where" | "gear" | "results";
  id: "where" | "gear" | "results";
  onSelect: (step: "where" | "gear" | "results") => void;
  children: string;
}) {
  return (
    <button type="button" className="step" aria-pressed={current === id} onClick={() => onSelect(id)}>
      {children}
    </button>
  );
}

function rigLine(scope: string | undefined, camera: string | undefined): string {
  return `${scope ?? "No telescope"} · ${camera ?? "No camera"}`;
}
