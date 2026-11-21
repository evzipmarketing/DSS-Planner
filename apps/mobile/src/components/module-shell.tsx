import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export function ModuleShell({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children?: ReactNode;
}) {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{summary}</Text>
        <View style={[styles.card, { gap: 8 }]}>
          <Text style={[styles.body, { fontWeight: "600" }]}>Coming next</Text>
          <Text style={styles.muted}>
            This module is on the roadmap. The shell is wired into Planner so we can fill it without reshuffling navigation.
          </Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
