import { Text } from "react-native";
import { ModuleShell } from "@/components/module-shell";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export default function MosaicPlannerScreen() {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <ModuleShell title="Mosaic" summary="Build a mosaic grid with panel size, overlap, and framing for wide nebulae and landscapes.">
      <Text style={styles.muted}>Planned: rows × columns, overlap %, rotation, and per-panel sky plates.</Text>
    </ModuleShell>
  );
}
