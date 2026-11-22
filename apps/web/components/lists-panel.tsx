"use client";

import { useMemo, useState } from "react";
import { objectTitle, primaryDesignation, objectTypeLabel } from "@dss/core";
import { constellationName } from "@dss/data";
import { useLists } from "@/lib/use-lists";
import { usePlannerState } from "./planner-context";

export function ListsPanel() {
  const planner = usePlannerState();
  const lists = useLists();
  const [name, setName] = useState("");
  const [openFavorites, setOpenFavorites] = useState(true);
  const [openLists, setOpenLists] = useState<Record<string, boolean>>({});

  const favoriteObjects = useMemo(
    () => (planner.catalogue ?? []).filter((object) => lists.favorites.includes(object.id)),
    [planner.catalogue, lists.favorites],
  );

  function create() {
    const id = lists.createList(name);
    if (!id) return;
    setName("");
    setOpenLists((current) => ({ ...current, [id]: true }));
  }

  return (
    <div className="lists-panel">
      <p className="note">
        Favorites and named lists stay in this browser. Star targets from Tonight detail, or add them to a list there.
      </p>

      <div className="hub-card" style={{ display: "grid", gap: 10 }}>
        <label className="field">
          New list
          <span className="list-create-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Spring galaxies"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  create();
                }
              }}
            />
            <button type="button" className="primary" onClick={create}>
              Create
            </button>
          </span>
        </label>
      </div>

      <section className="hub-card list-section">
        <button
          type="button"
          className="list-section-toggle"
          aria-expanded={openFavorites}
          onClick={() => setOpenFavorites((open) => !open)}
        >
          <strong>Favorites</strong>
          <span>{favoriteObjects.length}</span>
        </button>
        {openFavorites ? (
          favoriteObjects.length === 0 ? (
            <p className="note" style={{ margin: "0 16px 14px" }}>
              Star targets from the Tonight detail panel.
            </p>
          ) : (
            <ul className="list-targets">
              {favoriteObjects.map((object) => (
                <li key={object.id}>
                  <button
                    type="button"
                    className="list-target-btn"
                    onClick={() => planner.focusTarget(object.id)}
                  >
                    <strong>{objectTitle(object)}</strong>
                    <span>
                      {primaryDesignation(object)} · {objectTypeLabel(object.type)}
                      {object.constellation ? ` · ${constellationName(object.constellation)}` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => lists.toggleFavorite(object.id)}
                    aria-label={`Remove ${objectTitle(object)} from favorites`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      {lists.lists.map((list) => {
        const open = Boolean(openLists[list.id]);
        return (
          <section key={list.id} className="hub-card list-section">
            <div className="list-section-head">
              <button
                type="button"
                className="list-section-toggle"
                aria-expanded={open}
                onClick={() => setOpenLists((current) => ({ ...current, [list.id]: !open }))}
              >
                <strong>{list.name}</strong>
                <span>{list.items.length}</span>
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  if (window.confirm(`Remove “${list.name}”?`)) lists.deleteList(list.id);
                }}
              >
                Delete
              </button>
            </div>
            {open ? (
              list.items.length === 0 ? (
                <p className="note" style={{ margin: "0 16px 14px" }}>
                  Empty — add targets from Tonight detail.
                </p>
              ) : (
                <ul className="list-targets">
                  {list.items.map((entry) => {
                    const object = planner.catalogue?.find((row) => row.id === entry.objectId);
                    return (
                      <li key={entry.objectId}>
                        {object ? (
                          <button
                            type="button"
                            className="list-target-btn"
                            onClick={() => planner.focusTarget(object.id)}
                          >
                            <strong>{objectTitle(object)}</strong>
                            <span>
                              {primaryDesignation(object)} · {objectTypeLabel(object.type)}
                            </span>
                          </button>
                        ) : (
                          <div className="list-target-btn">
                            <strong>{entry.objectId}</strong>
                            <span>Not in the loaded catalogue</span>
                          </div>
                        )}
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => lists.removeFromList(list.id, entry.objectId)}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
