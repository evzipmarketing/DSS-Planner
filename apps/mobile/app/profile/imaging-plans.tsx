import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { imagingPlanModuleLabel, imagingPlanSummary, type ImagingPlanModule } from "@dss/core";
import { useThemeStyles } from "@/components/ui";
import { useImagingPlans } from "@/state/imaging-plans-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

const FILTERS: { id: ImagingPlanModule | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "multi-target", label: "Multi-target" },
  { id: "single-target", label: "Single-target" },
  { id: "mosaic", label: "Mosaic" },
  { id: "multi-rigs", label: "Multi-rigs" },
  { id: "collage", label: "Collage" },
  { id: "asterisms", label: "Asterisms" },
];

export default function ImagingPlansScreen() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const plansApi = useImagingPlans();
  const [filter, setFilter] = useState<ImagingPlanModule | "all">("all");

  const visible = useMemo(
    () => (filter === "all" ? plansApi.plans : plansApi.plans.filter((plan) => plan.module === filter)),
    [plansApi.plans, filter],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <FlatList
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        data={visible}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Text style={styles.muted}>
              Named imaging plans saved from Planner modules.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {FILTERS.map((item) => {
                const selected = filter === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setFilter(item.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected ? c.accent : c.line,
                      backgroundColor: c.bgSunken,
                    }}
                  >
                    <Text style={[styles.body, selected ? styles.accent : null]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { gap: 10 }]}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.body, { fontWeight: "600" }]}>{item.name}</Text>
              <Text style={styles.muted}>
                {imagingPlanModuleLabel(item.module)} · {imagingPlanSummary(item)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable
                onPress={() => {
                  void plansApi.requestOpenPlan(item.id, item.module).then(() => {
                    router.push(`/planner/${item.module}`);
                  });
                }}
              >
                <Text style={styles.accent}>Open</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Alert.alert("Delete plan", `Delete “${item.name}”?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => plansApi.deletePlan(item.id) },
                  ]);
                }}
              >
                <Text style={styles.muted}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.muted}>No imaging plans yet. Open a Planner module and use Save plan.</Text>
        }
      />
    </SafeAreaView>
  );
}
