import { Text } from "react-native";
import { ModuleShell } from "@/components/module-shell";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";

export default function AsterismsPlannerScreen() {
  const { theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  return (
    <ModuleShell title="Asterisms" summary="Find and frame recognisable star patterns and informal groupings.">
      <Text style={styles.muted}>Planned: asterism catalogue, overlays, and wide-field framing cues.</Text>
    </ModuleShell>
  );
}
