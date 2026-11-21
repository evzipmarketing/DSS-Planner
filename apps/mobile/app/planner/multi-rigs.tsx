import { Text } from "react-native";
import { ModuleShell } from "@/components/module-shell";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export default function MultiRigsPlannerScreen() {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <ModuleShell title="Multi-rigs" summary="Assign targets and filters across several telescopes and cameras in one session.">
      <Text style={styles.muted}>Planned: rig picker, parallel hour budgets, and conflict checks on mount time.</Text>
    </ModuleShell>
  );
}
