import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Svg, { Path, Rect } from "react-native-svg";
import { HubRow } from "@/components/hub-row";
import { PlannerModuleIcon, type PlannerModuleIconId } from "@/components/planner-module-icons";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

const VIEW_KEY = "dss-planner.hub-view.v1";

const MODULES = [
  {
    id: "multi-target",
    href: "/planner/multi-target",
    title: "Multi-target planner",
    detail: "Compare targets in one night with overlapping altitude windows and hour budgets.",
    ready: true,
  },
  {
    id: "single-target",
    href: "/planner/single-target",
    title: "Single-target planner",
    detail: "Multi-night capture plan for one object, paced around moon phase.",
    ready: true,
  },
  {
    id: "multi-rigs",
    href: "/planner/multi-rigs",
    title: "Multi-rigs",
    detail: "Coordinate several scopes and cameras on the same night.",
    ready: true,
  },
  {
    id: "mosaic",
    href: "/planner/mosaic",
    title: "Mosaic",
    detail: "Grid size, overlap, and panel framing for wide fields.",
    ready: true,
  },
  {
    id: "collage",
    href: "/planner/collage",
    title: "Collage",
    detail: "Wide-angle framing that places several targets in one creative frame.",
    ready: true,
  },
  {
    id: "asterisms",
    href: "/planner/asterisms",
    title: "Asterisms",
    detail: "Pattern and star-group framing helpers.",
    ready: true,
  },
] as const satisfies ReadonlyArray<{
  id: PlannerModuleIconId;
  href: string;
  title: string;
  detail: string;
  ready: boolean;
}>;

type HubView = "list" | "grid";

export default function PlannerHubScreen() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [view, setView] = useState<HubView>("list");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(VIEW_KEY);
        if (!alive) return;
        if (raw === "grid" || raw === "list") setView(raw);
      } catch {
        // ignore storage failures
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function changeView(next: HubView) {
    setView(next);
    try {
      await AsyncStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore storage failures
    }
  }

  function thumb(id: PlannerModuleIconId, large = false) {
    return (
      <View
        style={{
          width: large ? "100%" : 52,
          flex: large ? 1 : undefined,
          height: large ? undefined : 52,
          minHeight: large ? 0 : 52,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.usable,
          borderWidth: 1,
          borderColor: c.line,
          alignSelf: large ? "stretch" : undefined,
        }}
      >
        <PlannerModuleIcon id={id} color={c.accent} size={large ? 88 : 34} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={[styles.title, { flex: 1 }]}>Planner</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              padding: 2,
              borderWidth: 1,
              borderColor: c.lineStrong,
              borderRadius: 10,
              backgroundColor: c.bgRaised,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="List view"
              accessibilityState={{ selected: view === "list" }}
              onPress={() => void changeView("list")}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: view === "list" ? c.bgSunken : "transparent",
              }}
            >
              <ListViewIcon color={view === "list" ? c.accent : c.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Grid view"
              accessibilityState={{ selected: view === "grid" }}
              onPress={() => void changeView("grid")}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: view === "grid" ? c.bgSunken : "transparent",
              }}
            >
              <GridViewIcon color={view === "grid" ? c.accent : c.muted} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>Longer sessions, mosaics, and multi-rig nights — beyond tonight’s shortlist.</Text>

        {view === "grid" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {MODULES.map((module) => (
              <Pressable
                key={module.href}
                disabled={!module.ready}
                onPress={() => router.push(module.href)}
                style={{
                  width: "48%",
                  flexGrow: 1,
                  aspectRatio: 1,
                  padding: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.line,
                  backgroundColor: c.bgRaised,
                  gap: 6,
                  opacity: module.ready ? 1 : 0.7,
                  flexDirection: "column",
                }}
              >
                {thumb(module.id, true)}
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <Text style={[styles.body, { fontWeight: "600", flex: 1, fontSize: 14 }]} numberOfLines={2}>
                    {module.title}
                  </Text>
                  {!module.ready ? <Text style={[styles.muted, { fontSize: 12 }]}>Soon</Text> : null}
                </View>
                <Text style={[styles.muted, { fontSize: 12 }]} numberOfLines={2}>
                  {module.detail}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={[styles.card, { paddingVertical: 4, paddingHorizontal: 12 }]}>
            {MODULES.map((module) => (
              <HubRow
                key={module.href}
                theme={planner.theme}
                title={module.title}
                detail={module.detail}
                badge={module.ready ? undefined : "Soon"}
                leading={thumb(module.id)}
                onPress={() => router.push(module.href)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ListViewIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path d="M8 6h12M8 12h12M8 18h12" stroke={color} strokeWidth={1.7} strokeLinecap="round" fill="none" />
      <Path d="M4 6h.01M4 12h.01M4 18h.01" stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function GridViewIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={7} height={7} rx={1.2} stroke={color} strokeWidth={1.7} fill="none" />
      <Rect x={13} y={4} width={7} height={7} rx={1.2} stroke={color} strokeWidth={1.7} fill="none" />
      <Rect x={4} y={13} width={7} height={7} rx={1.2} stroke={color} strokeWidth={1.7} fill="none" />
      <Rect x={13} y={13} width={7} height={7} rx={1.2} stroke={color} strokeWidth={1.7} fill="none" />
    </Svg>
  );
}
