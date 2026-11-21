import { Text } from "react-native";
import { ModuleShell } from "@/components/module-shell";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export default function CollagePlannerScreen() {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <ModuleShell
      title="Collage"
      summary="Wide-angle and short focal-length lenses: creative multi-target framing in a single frame."
    >
      <Text style={styles.muted}>Planned: FOV overlay with several catalogue objects and composition suggestions.</Text>
    </ModuleShell>
  );
}
