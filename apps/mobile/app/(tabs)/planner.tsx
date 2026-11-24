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
    ready: true,
  },
  {
    href: "/planner/single-target",
    title: "Single-target planner",
    detail: "Multi-night capture plan for one object, paced around moon phase.",
    ready: true,
  },
  {
    href: "/planner/multi-rigs",
    title: "Multi-rigs",
    detail: "Coordinate several scopes and cameras on the same night.",
    ready: true,
  },
  {
    href: "/planner/mosaic",
    title: "Mosaic",
    detail: "Grid size, overlap, and panel framing for wide fields.",
    ready: false,
  },
  {
    href: "/planner/collage",
    title: "Collage",
    detail: "Wide-angle framing that places several targets in one creative frame.",
    ready: false,
  },
  {
    href: "/planner/asterisms",
    title: "Asterisms",
    detail: "Pattern and star-group framing helpers.",
    ready: false,
  },
] as const;

export default function PlannerHubScreen() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text style={styles.title}>Planner</Text>
        <Text style={styles.subtitle}>Longer sessions, mosaics, and multi-rig nights — beyond tonight’s shortlist.</Text>
        <View style={[styles.card, { paddingVertical: 4, paddingHorizontal: 12 }]}>
          {MODULES.map((module) => (
            <HubRow
              key={module.href}
              theme={planner.theme}
              title={module.title}
              detail={module.detail}
              badge={module.ready ? undefined : "Soon"}
              onPress={() => router.push(module.href)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
