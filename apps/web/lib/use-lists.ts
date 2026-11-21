"use client";

import { useCallback, useEffect, useState } from "react";

export type WebList = {
  id: string;
  name: string;
  createdAt: string;
  items: { objectId: string }[];
};

type ListsState = {
  favorites: string[];
  lists: WebList[];
};

const KEY = "dss-planner.lists.v1";

const EMPTY: ListsState = { favorites: [], lists: [] };

export function useLists() {
  const [state, setState] = useState<ListsState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadLists());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, [ready, state]);

  const toggleFavorite = useCallback((objectId: string) => {
    setState((current) => ({
      ...current,
      favorites: current.favorites.includes(objectId)
        ? current.favorites.filter((id) => id !== objectId)
        : [...current.favorites, objectId],
    }));
  }, []);

  const createList = useCallback((name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id = `list-${Date.now().toString(36)}`;
    setState((current) => ({
      ...current,
      lists: [...current.lists, { id, name: trimmed, createdAt: new Date().toISOString(), items: [] }],
    }));
    return id;
  }, []);

  const addToList = useCallback((listId: string, objectId: string) => {
    setState((current) => ({
      ...current,
      lists: current.lists.map((list) => {
        if (list.id !== listId) return list;
        if (list.items.some((item) => item.objectId === objectId)) return list;
        return { ...list, items: [...list.items, { objectId }] };
      }),
    }));
  }, []);

  return {
    favorites: state.favorites,
    lists: state.lists,
    toggleFavorite,
    createList,
    addToList,
  };
}

function loadLists(): ListsState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ListsState>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((id) => typeof id === "string") : [],
      lists: Array.isArray(parsed.lists)
        ? parsed.lists.filter(
            (list): list is WebList =>
              !!list &&
              typeof list.id === "string" &&
              typeof list.name === "string" &&
              Array.isArray(list.items),
          )
        : [],
    };
  } catch {
    return EMPTY;
  }
}
