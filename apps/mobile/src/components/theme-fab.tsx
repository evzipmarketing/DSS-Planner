import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { usePlannerState } from "@/state/planner-context";
import { colors, type ThemeName } from "@/theme/tokens";

export function ThemeFab() {
  const planner = usePlannerState();
  const c = colors(planner.theme);
  const insets = useSafeAreaInsets();
  const next: ThemeName = planner.theme === "dark" ? "night" : "dark";

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Theme is ${planner.theme === "night" ? "Night vision" : "Dark"}. Switch to ${next === "night" ? "Night vision" : "Dark"}.`}
        onPress={() => planner.setTheme(next)}
        style={[
          styles.fab,
          {
            backgroundColor: c.bgRaised,
            borderColor: c.lineStrong,
            bottom: Math.max(64, insets.bottom + 56),
            right: Math.max(16, insets.right + 12),
          },
        ]}
      >
        <ThemeIcon color={c.text} night={planner.theme === "night"} />
      </Pressable>
    </View>
  );
}

function ThemeIcon({ color, night }: { color: string; night: boolean }) {
  if (night) {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d="M12 4.5a7.5 7.5 0 1 0 9 9.2A8 8 0 0 1 12 4.5Z"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" fill="none" stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2.8v2.2M12 19v2.2M2.8 12h2.2M19 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
