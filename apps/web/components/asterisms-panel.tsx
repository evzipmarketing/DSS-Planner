"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  asterismFitLabel,
  asterismPlateFovDeg,
  asterismStarsToCollageTargets,
  planAsterismFrame,
  type AsterismFitKind,
} from "@dss/core";
import { ASTERISMS, searchAsterisms, type Asterism } from "@dss/data";
import { applySavedPlanGear } from "@/lib/apply-plan-gear";
import { snapshotPlanGear, snapshotPlanSite } from "@/lib/plan-snapshot";
import { useImagingPlans } from "@/lib/use-imaging-plans";
import { CollageSkyPreview } from "./collage-sky-preview";
import { ModuleGearPicker } from "./module-gear-picker";
import { SavePlanControl } from "./save-plan-control";
import { usePlannerState } from "./planner-context";

const STAR_COLORS = ["#7ad0e7", "#e0c07a", "#9ad67a", "#c79ae8", "#e08a7a", "#7ab8e0", "#e0b07a", "#8ad0c0"];

export function AsterismsPanel() {
  const planner = usePlannerState();
  const imagingPlans = useImagingPlans();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(ASTERISMS[0]?.id ?? "");
  const [paddingPercent, setPaddingPercent] = useState(12);
  const [showNames, setShowNames] = useState(true);
  const framingRef = useRef<HTMLDivElement>(null);
  const [listPaneHeight, setListPaneHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!imagingPlans.ready) return;
    const plan = imagingPlans.consumePendingPlan("asterisms");
    if (!plan || plan.module !== "asterisms") return;
    applySavedPlanGear(planner, plan);
    setSelectedId(plan.asterismId);
    setPaddingPercent(plan.paddingPercent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when plans are ready
  }, [imagingPlans.ready]);

  const matches = useMemo(() => searchAsterisms(query), [query]);
  const selected: Asterism | null = useMemo(
    () => matches.find((item) => item.id === selectedId) ?? matches[0] ?? ASTERISMS.find((item) => item.id === selectedId) ?? null,
    [matches, selectedId],
  );

  const field = planner.optics?.field ?? null;

  const fitById = useMemo(() => {
    const map = new Map<string, AsterismFitKind>();
    if (!field || !planner.setupReady) return map;
    for (const item of matches) {
      const plan = planAsterismFrame({
        stars: asterismStarsToCollageTargets(item.stars),
        fov: { widthDeg: field.widthDeg, heightDeg: field.heightDeg },
        paddingPercent,
      });
      if (plan) map.set(item.id, plan.fit);
    }
    return map;
  }, [matches, field, planner.setupReady, paddingPercent]);

  const frame = useMemo(() => {
    if (!selected || !field || !planner.setupReady) return null;
    return planAsterismFrame({
      stars: asterismStarsToCollageTargets(selected.stars),
      fov: { widthDeg: field.widthDeg, heightDeg: field.heightDeg },
      paddingPercent,
    });
  }, [selected, field, planner.setupReady, paddingPercent]);

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    selected?.stars.forEach((star, index) => {
      map.set(star.id, STAR_COLORS[index % STAR_COLORS.length]!);
    });
    return map;
  }, [selected]);

  useEffect(() => {
    const framing = framingRef.current;
    if (!framing || !frame) {
      setListPaneHeight(null);
      return;
    }
    const syncHeight = () => {
      setListPaneHeight(Math.round(framing.getBoundingClientRect().height));
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(framing);
    return () => observer.disconnect();
  }, [frame, selectedId, paddingPercent, showNames]);

  return (
    <div className="asterisms-panel">
      <ModuleGearPicker />

      {!planner.setupReady ? (
        <div className="hub-card">
          <p className="note">Set location, date, telescope, and camera to frame-check asterisms against your FOV.</p>
        </div>
      ) : null}

      <div className="asterisms-layout">
        <div
          className="hub-card asterisms-list-pane"
          style={listPaneHeight != null ? { height: listPaneHeight } : undefined}
        >
          <label className="field">
            Search asterisms
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Big Dipper, Teapot, Orion…"
            />
          </label>
          <ul className="asterisms-list">
            {matches.map((item) => {
              const active = selected?.id === item.id;
              const fit = fitById.get(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`asterism-row${active ? " is-active" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="asterism-row-main">
                      <strong>{item.name}</strong>
                      <span>
                        {item.constellation} · {item.stars.length} stars
                      </span>
                    </span>
                    {fit ? (
                      <span className={`asterism-fit-badge is-${fit}`}>{asterismFitLabel(fit)}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
            {matches.length === 0 ? <li className="note">No match. Try another name or constellation.</li> : null}
          </ul>
        </div>

        <div className="asterisms-detail">
          {selected && frame ? (
            <div className="hub-card asterism-framing-card" ref={framingRef}>
              <div className="asterism-framing-head">
                <strong>{selected.name}</strong>
              </div>
              <CollageSkyPreview
                plan={frame.collage}
                objectsById={new Map()}
                colors={colorMap}
                showNames={showNames}
                edges={selected.edges}
                plateFovDeg={asterismPlateFovDeg(frame)}
              />
              <div className="collage-framing-toolbar">
                <div className="collage-controls collage-padding-row">
                  <strong>Padding</strong>
                  <div className="multi-target-budget-controls" style={{ justifyContent: "flex-start", gap: 10 }}>
                    <button
                      type="button"
                      className="ghost"
                      aria-label="Decrease padding"
                      onClick={() => setPaddingPercent((value) => Math.max(0, value - 5))}
                    >
                      −
                    </button>
                    <span>{paddingPercent}%</span>
                    <button
                      type="button"
                      className="ghost"
                      aria-label="Increase padding"
                      onClick={() => setPaddingPercent((value) => Math.min(40, value + 5))}
                    >
                      +
                    </button>
                  </div>
                </div>
                <label className="collage-ignore-date collage-show-names">
                  <input
                    type="checkbox"
                    checked={showNames}
                    onChange={(event) => setShowNames(event.target.checked)}
                  />
                  <span>Targets</span>
                </label>
              </div>
              <p className="note">{frame.hint}</p>
            </div>
          ) : selected ? (
            <div className="hub-card" ref={framingRef}>
              <p className="note">Complete gear setup to compare {selected.name} with your field of view.</p>
            </div>
          ) : (
            <div className="hub-card" ref={framingRef}>
              <p className="note">Pick an asterism from the list.</p>
            </div>
          )}
        </div>
      </div>

      <SavePlanControl
        disabled={!selected || !planner.setupReady}
        disabledReason={
          !planner.setupReady ? "Set location and gear before saving." : "Pick an asterism to save."
        }
        defaultName={selected ? `Asterism · ${selected.name}` : "Asterism plan"}
        onSave={(name) => {
          if (!selected) return;
          imagingPlans.savePlan({
            name,
            module: "asterisms",
            siteRef: snapshotPlanSite(planner),
            pickerSource: { kind: "filtered" },
            gear: snapshotPlanGear(planner),
            asterismId: selected.id,
            paddingPercent,
          });
        }}
      />
    </div>
  );
}
