import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadLists, saveLists, type LocalList, type LocalListsState } from "@/lib/storage";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type ListsContextValue = {
  favorites: string[];
  lists: LocalList[];
  toggleFavorite: (objectId: string) => void;
  createList: (name: string) => string | null;
  addToList: (listId: string, objectId: string) => void;
  removeFromList: (listId: string, objectId: string) => void;
  deleteList: (listId: string) => void;
  syncing: boolean;
  syncError: string | null;
  syncNow: () => Promise<void>;
};

const ListsContext = createContext<ListsContextValue | null>(null);

function newId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ListsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocalListsState>({ favorites: [], lists: [] });
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    void loadLists().then((next) => {
      setState(next);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveLists(state);
  }, [state, hydrated]);

  const syncNow = useCallback(async () => {
    if (!supabaseConfigured || !supabase) {
      setSyncError("Supabase is not configured.");
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setSyncError("Sign in to sync target lists.");
        return;
      }

      const { data: remoteFavorites } = await supabase.from("saved_targets").select("object_id").eq("user_id", userId);
      const remoteFavIds = (remoteFavorites ?? []).map((row) => row.object_id as string);
      const mergedFavorites = Array.from(new Set([...state.favorites, ...remoteFavIds]));

      for (const objectId of mergedFavorites) {
        await supabase.from("saved_targets").upsert(
          { user_id: userId, object_id: objectId, notes: "" },
          { onConflict: "user_id,object_id" },
        );
      }

      const { data: remoteLists } = await supabase.from("target_lists").select("id,name,created_at").eq("user_id", userId);
      const localOnly = state.lists.filter((list) => !list.id.startsWith("sb-"));
      for (const list of localOnly) {
        const { data: created } = await supabase
          .from("target_lists")
          .insert({ user_id: userId, name: list.name })
          .select("id,created_at")
          .single();
        if (!created) continue;
        for (const item of list.items) {
          await supabase.from("target_list_items").insert({
            list_id: created.id,
            object_id: item.objectId,
            notes: item.notes,
            sort_order: item.sortOrder,
          });
        }
      }

      const { data: refreshed } = await supabase
        .from("target_lists")
        .select("id,name,created_at,target_list_items(object_id,notes,sort_order)")
        .eq("user_id", userId);

      const lists: LocalList[] = (refreshed ?? []).map((row) => ({
        id: `sb-${row.id}`,
        name: row.name as string,
        createdAt: row.created_at as string,
        items: ((row.target_list_items as { object_id: string; notes: string; sort_order: number }[] | null) ?? []).map(
          (item) => ({
            objectId: item.object_id,
            notes: item.notes ?? "",
            sortOrder: item.sort_order ?? 0,
          }),
        ),
      }));

      setState({ favorites: mergedFavorites, lists });
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }, [state.favorites, state.lists]);

  const value = useMemo<ListsContextValue>(
    () => ({
      favorites: state.favorites,
      lists: state.lists,
      syncing,
      syncError,
      syncNow,
      toggleFavorite: (objectId) => {
        setState((current) => ({
          ...current,
          favorites: current.favorites.includes(objectId)
            ? current.favorites.filter((id) => id !== objectId)
            : [...current.favorites, objectId],
        }));
      },
      createList: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const id = newId();
        setState((current) => ({
          ...current,
          lists: [
            ...current.lists,
            { id, name: trimmed, createdAt: new Date().toISOString(), items: [] },
          ],
        }));
        return id;
      },
      addToList: (listId, objectId) => {
        setState((current) => ({
          ...current,
          lists: current.lists.map((list) => {
            if (list.id !== listId) return list;
            if (list.items.some((item) => item.objectId === objectId)) return list;
            return {
              ...list,
              items: [...list.items, { objectId, notes: "", sortOrder: list.items.length }],
            };
          }),
        }));
      },
      removeFromList: (listId, objectId) => {
        setState((current) => ({
          ...current,
          lists: current.lists.map((list) =>
            list.id === listId ? { ...list, items: list.items.filter((item) => item.objectId !== objectId) } : list,
          ),
        }));
      },
      deleteList: (listId) => {
        setState((current) => ({ ...current, lists: current.lists.filter((list) => list.id !== listId) }));
      },
    }),
    [state, syncing, syncError, syncNow],
  );

  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>;
}

export function useLists(): ListsContextValue {
  const value = useContext(ListsContext);
  if (!value) throw new Error("ListsProvider missing");
  return value;
}
