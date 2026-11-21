import { Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function CatalogueSettingsScreen() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <View style={{ padding: 16, gap: 14 }}>
        <Text style={styles.subtitle}>
          By default Tonight uses the popular core list (Messier, NGC, IC, Sharpless, …) and hides tiny components of larger objects.
        </Text>
        <View style={[styles.card, { gap: 14 }]}>
          <PrefSwitch
            theme={planner.theme}
            label="Include extended catalogue"
            detail="Adds ~19k fainter objects. Slower to score."
            value={planner.includeExtendedCatalogue}
            onValueChange={planner.setIncludeExtendedCatalogue}
          />
          <PrefSwitch
            theme={planner.theme}
            label="Include component objects"
            detail="Shows letter-suffix pieces such as NGC4676A."
            value={planner.includeComponentObjects}
            onValueChange={planner.setIncludeComponentObjects}
          />
        </View>
        <Text style={{ color: c.faint, fontSize: 12 }}>
          Ranking prefers Messier, then NGC, IC, Sharpless when nights are otherwise similar. Catalogue size:{" "}
          {planner.catalogue ? planner.catalogue.length : "…"}
          {planner.includeExtendedCatalogue
            ? planner.extendedReady
              ? " including extended."
              : " (extended still loading)."
            : " · core only."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function PrefSwitch({
  theme,
  label,
  detail,
  value,
  onValueChange,
}: {
  theme: "dark" | "night";
  label: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.body}>{label}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.lineStrong, true: c.accent }}
        thumbColor={c.bgRaised}
      />
    </View>
  );
}
