import { Text } from "react-native";
import { ModuleShell } from "@/components/module-shell";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export default function ExportPlannerScreen() {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <ModuleShell title="Export CSV" summary="Export tonight’s shortlist, saved lists, and multi-night plans as CSV.">
      <Text style={styles.muted}>Planned: share sheet with columns for id, name, RA/Dec, hours, and list membership.</Text>
    </ModuleShell>
  );
}