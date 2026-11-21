import { Text } from "react-native";
import { ModuleShell } from "@/components/module-shell";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export default function MultiTargetPlannerScreen() {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <ModuleShell
      title="Multi-target planner"
      summary="Pick several targets for one night, see overlapping altitude windows, and allocate total imaging hours across the set."
    >
      <Text style={styles.muted}>Planned: shared altitude graph, per-target hour budget, and a shoot order for the night.</Text>
    </ModuleShell>
  );
}
