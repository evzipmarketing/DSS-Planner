import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { HubRow } from "@/components/hub-row";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

const MODULES = [
  {
    href: "/planner/multi-target",
    title: "Multi-target planner",
    detail: "Compare targets in one night with overlapping altitude windows and hour budgets.",
  },
  {
    href: "/planner/single-target",
    title: "Single-target planner",
    detail: "Multi-night capture plan for one object, paced around moon phase.",
  },
  {
    href: "/planner/mosaic",
    title: "Mosaic",
    detail: "Grid size, overlap, and panel framing for wide fields.",
  },
  {
    href: "/planner/multi-rigs",
    title: "Multi-rigs",
    detail: "Coordinate several scopes and cameras on the same night.",
  },
  {
    href: "/planner/collage",
    title: "Collage",
    detail: "Wide-angle framing that places several targets in one creative frame.",
  },
  {
    href: "/planner/asterisms",
    title: "Asterisms",
    detail: "Pattern and star-group framing helpers.",
  },
  {
    href: "/planner/export",
    title: "Export CSV",
    detail: "Export tonight’s plan and saved target lists.",
  },
] as const;

export default function PlannerHubScreen() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text style={styles.title}>Planner</Text>
        <Text style={styles.subtitle}>Longer sessions, mosaics, multi-rig nights, and exports — beyond tonight’s shortlist.</Text>
        <View style={[styles.card, { paddingVertical: 4, paddingHorizontal: 12 }]}>
          {MODULES.map((module) => (
            <HubRow
              key={module.href}
              theme={planner.theme}
              title={module.title}
              detail={module.detail}
              badge="Soon"
              onPress={() => router.push(module.href)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
