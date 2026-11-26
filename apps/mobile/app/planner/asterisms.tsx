import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  asterismFitLabel,
  asterismPlateFovDeg,
  asterismStarsToCollageTargets,
  planAsterismFrame,
  type AsterismFitKind,
} from "@dss/core";
import { ASTERISMS, searchAsterisms, type Asterism } from "@dss/data";
import { CollageSkyPreview } from "@/components/collage-sky-preview";
import { ModuleGearPicker } from "@/components/module-gear-picker";
import { SavePlanControl } from "@/components/save-plan-control";
import { useThemeStyles } from "@/components/ui";
import { applySavedPlanGear } from "@/lib/apply-plan-gear";
import { snapshotPlanGear, snapshotPlanSite } from "@/lib/plan-snapshot";
import { useImagingPlans } from "@/state/imaging-plans-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

const STAR_COLORS = ["#7ad0e7", "#e0c07a", "#9ad67a", "#c79ae8", "#e08a7a", "#7ab8e0", "#e0b07a", "#8ad0c0"];

export default function AsterismsPlannerScreen() {
  const planner = usePlannerState();
  const imagingPlans = useImagingPlans();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(ASTERISMS[0]?.id ?? "");
  const [paddingPercent, setPaddingPercent] = useState(12);
  const [showNames, setShowNames] = useState(true);

  useEffect(() => {
    if (!imagingPlans.ready) return;
    let cancelled = false;
    void (async () => {
      const plan = await imagingPlans.consumePendingPlan("asterisms");
      if (cancelled || !plan || plan.module !== "asterisms") return;
      applySavedPlanGear(planner, plan);
      setSelectedId(plan.asterismId);
      setPaddingPercent(plan.paddingPercent);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when plans are ready
  }, [imagingPlans.ready]);

  const matches = useMemo(() => searchAsterisms(query), [query]);
  const selected: Asterism | null =
    matches.find((item) => item.id === selectedId) ??
    matches[0] ??
    ASTERISMS.find((item) => item.id === selectedId) ??
    null;

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

  const selectedFit = selected ? fitById.get(selected.id) ?? frame?.fit ?? null : null;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text style={styles.subtitle}>Browse known star patterns and check them against your FOV.</Text>
        <ModuleGearPicker />

        {!planner.setupReady ? (
          <View style={styles.card}>
            <Text style={styles.muted}>
              Set location, date, telescope, and camera to frame-check asterisms against your FOV.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 4 }}>
          <Text style={styles.muted}>Asterism</Text>
          <Pressable
            onPress={() => {
              setQuery("");
              setListOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Choose asterism"
            style={[
              styles.input,
              {
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                backgroundColor: c.bgSunken,
              },
            ]}
          >
            <View style={{ flex: 1, gap: 2, paddingRight: 8 }}>
              <Text style={[styles.body, { fontWeight: "600" }]} numberOfLines={1}>
                {selected?.name ?? "Select asterism"}
              </Text>
              {selected ? (
                <Text style={styles.muted} numberOfLines={1}>
                  {selected.constellation}
                  {selectedFit ? ` · ${asterismFitLabel(selectedFit)}` : ""}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: c.accent, fontSize: 11 }}>▼</Text>
          </Pressable>
        </View>

        {selected && frame ? (
          <View style={[styles.card, { gap: 10 }]}>
            <Text style={[styles.body, { fontWeight: "700" }]}>{selected.name}</Text>
            <CollageSkyPreview
              plan={frame.collage}
              objectsById={new Map()}
              colors={colorMap}
              theme={planner.theme}
              showNames={showNames}
              edges={selected.edges}
              plateFovDeg={asterismPlateFovDeg(frame)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 2 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={[styles.body, { fontWeight: "600" }]}>Padding</Text>
                <Pressable
                  onPress={() => setPaddingPercent((value) => Math.max(0, value - 5))}
                  accessibilityLabel="Decrease padding"
                  style={[styles.chip, { minWidth: 36, alignItems: "center" }]}
                >
                  <Text style={styles.chipText}>−</Text>
                </Pressable>
                <Text style={styles.body}>{paddingPercent}%</Text>
                <Pressable
                  onPress={() => setPaddingPercent((value) => Math.min(40, value + 5))}
                  accessibilityLabel="Increase padding"
                  style={[styles.chip, { minWidth: 36, alignItems: "center" }]}
                >
                  <Text style={styles.chipText}>+</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setShowNames((value) => !value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: showNames }}
                accessibilityLabel="Show star labels"
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={[styles.body, { fontWeight: "600" }]}>Targets</Text>
                <Switch
                  value={showNames}
                  onValueChange={setShowNames}
                  trackColor={{ false: "#7a8080", true: c.accent }}
                  thumbColor={showNames ? "#ffffff" : "#f2f2f0"}
                  ios_backgroundColor="#7a8080"
                />
              </Pressable>
            </ScrollView>
            <Text style={styles.muted}>{frame.hint}</Text>
          </View>
        ) : selected ? (
          <View style={styles.card}>
            <Text style={styles.muted}>Complete gear setup to compare {selected.name} with your field of view.</Text>
          </View>
        ) : null}

        <SavePlanControl
          theme={planner.theme}
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
      </ScrollView>

      <Modal visible={listOpen} animationType="slide" transparent onRequestClose={() => setListOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setListOpen(false)} />
          <View
            style={{
              backgroundColor: c.bgRaised,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderColor: c.line,
              borderWidth: 1,
              padding: 16,
              paddingBottom: 28,
              gap: 8,
              maxHeight: "80%",
            }}
          >
            <Text style={[styles.label, { marginBottom: 4 }]}>Asterisms</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search Big Dipper, Teapot…"
              placeholderTextColor={c.faint}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {matches.map((item) => {
                const active = selected?.id === item.id;
                const fit = fitById.get(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setSelectedId(item.id);
                      setQuery("");
                      setListOpen(false);
                    }}
                    style={[
                      styles.card,
                      {
                        marginBottom: 8,
                        borderColor: active ? c.accent : c.line,
                        backgroundColor: c.bgSunken,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 12,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.body, active ? styles.accent : null, { fontWeight: "600" }]}>
                        {item.name}
                      </Text>
                      <Text style={styles.muted}>
                        {item.constellation} · {item.stars.length} stars
                      </Text>
                    </View>
                    {fit ? (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: fit === "fits" ? c.accent : fit === "tight" ? c.moon : c.clay,
                        }}
                      >
                        {asterismFitLabel(fit)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
              {matches.length === 0 ? <Text style={styles.muted}>No match.</Text> : null}
            </ScrollView>
            <Pressable onPress={() => setListOpen(false)} style={{ alignItems: "center", paddingVertical: 10 }}>
              <Text style={styles.muted}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
