"use client";

import { AltitudeChart } from "./altitude-chart";
import { BortlePanel } from "./bortle-panel";
import { DatePanel } from "./date-panel";
import { ExposurePlan } from "./exposure-plan";
import { FramingPreview } from "./framing-preview";
import { LocationPanel } from "./location-panel";
import { PlannerProvider } from "./planner-context";
import { RigPanel } from "./rig-panel";
import { ObjectCard, Shortlist } from "./target-panels";
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
        <main id="night" className="planner">
          <div className="band cols-3">
            <LocationPanel />
            <BortlePanel />
            <DatePanel />
          </div>
          <div className="band cols-2">
            <WeatherPanel />
            <RigPanel />
          </div>
          <div className="band">
            <Shortlist />
          </div>
          <div className="band cols-2">
            <ObjectCard />
            <AltitudeChart />
          </div>
          <div className="band cols-2">
            <FramingPreview />
            <ExposurePlan />
          </div>
        </main>
        <footer className="footer">
          NGC and IC data are from OpenNGC (CC BY-SA 4.0, Mattia Verga). Other catalogues are cited in the README.
          Gear figures are nominal manufacturer specifications. The Bortle figure is an estimate from NASA Black Marble 2016.
        </footer>
      </div>
    </PlannerProvider>
  );
}
