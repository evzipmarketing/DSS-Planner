import { Text } from "react-native";
import { ModuleShell } from "@/components/module-shell";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export default function SingleTargetPlannerScreen() {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <ModuleShell
      title="Single-target planner"
      summary="Plan multi-night integration on one object, guided by moon phase and imageable windows."
    >
      <Text style={styles.muted}>Planned: calendar of clear windows, moon separation, and cumulative hours toward a goal.</Text>
    </ModuleShell>
  );
}
