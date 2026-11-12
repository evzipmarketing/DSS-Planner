"use client";

import { AltitudeChart } from "./altitude-chart";
import { ExposurePlan } from "./exposure-plan";
import { FramingPreview } from "./framing-preview";
import { PlannerProvider } from "./planner-context";
import { RigPanel } from "./rig-panel";
import { SitePanel } from "./site-panel";
import { CatalogueSearch, ObjectCard, Shortlist } from "./target-panels";
import { WeatherPanel } from "./weather-panel";
import { usePlanner } from "@/lib/use-planner";

export function PlannerApp() {
  const planner = usePlanner();
  return (
    <PlannerProvider value={planner}>
      <a className="skip" href="#night">
        Skip to the night
      </a>
      <div className="desk">
        <header className="topbar">
          <div className="brand">
            <h1>DSS Planner</h1>
            <p>Plan the night from the eyepiece down to the sensor.</p>
          </div>
          <button
            type="button"
            className="vision"
            aria-pressed={planner.vision === "red"}
            onClick={() => planner.setVision(planner.vision === "red" ? "ink" : "red")}
          >
            {planner.vision === "red" ? "Desk light" : "Night vision"}
          </button>
        </header>
        <main id="night" className="layout">
          <div className="stack">
            <SitePanel />
            <WeatherPanel />
            <Shortlist />
            <CatalogueSearch />
            <ObjectCard />
          </div>
          <div className="stack">
            <AltitudeChart />
            <RigPanel />
            <FramingPreview />
            <ExposurePlan />
          </div>
        </main>
        <footer className="footer">
          NGC and IC data are from OpenNGC (CC BY-SA 4.0, Mattia Verga). Other catalogues are cited in the README.
          Gear figures are nominal manufacturer specifications.
        </footer>
      </div>
    </PlannerProvider>
  );
}
