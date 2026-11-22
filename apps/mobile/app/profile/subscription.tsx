import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export default function SubscriptionScreen() {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <View style={{ padding: 16, gap: 14 }}>
        <Text style={styles.title}>Subscription</Text>
        <View style={[styles.card, { gap: 8 }]}>
          <Text style={[styles.body, { fontWeight: "600" }]}>Free</Text>
          <Text style={styles.muted}>
            Tonight planning, framing, and local lists are available now. Paid plans for cloud sync limits, multi-rig, and
            mosaic exports will land here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}