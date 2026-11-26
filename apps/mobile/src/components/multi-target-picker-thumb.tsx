import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchSkyPlate } from "@/lib/api";
import { colors, type ThemeName } from "@/theme/tokens";

const SIZE = 64;

export function MultiTargetPickerThumb({
  raDeg,
  decDeg,
  majorArcmin,
  fovDeg: fovDegProp,
  label,
  theme,
  selected,
  disabled,
  accent,
  onPress,
}: {
  raDeg: number;
  decDeg: number;
  majorArcmin: number | null;
  /** When set, used as plate FOV instead of the object-size heuristic. */
  fovDeg?: number;
  label: string;
  theme: ThemeName;
  selected: boolean;
  disabled?: boolean;
  accent?: string;
  onPress: () => void;
}) {
  const c = colors(theme);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUri(null);
    const fov =
      fovDegProp != null && Number.isFinite(fovDegProp)
        ? Math.min(20, Math.max(0.05, fovDegProp))
        : Math.min(6, Math.max(0.12, ((majorArcmin ?? 15) / 60) * 1.8));
    void fetchSkyPlate({ ra: raDeg, dec: decDeg, fov, size: 96 })
      .then((plate) => {
        if (!cancelled) setUri(plate.uri);
      })
      .catch(() => {
        if (!cancelled) setUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [raDeg, decDeg, majorArcmin, fovDegProp]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      style={[styles.wrap, disabled ? { opacity: 0.4 } : null]}
    >
      <View
        style={[
          styles.frame,
          {
            backgroundColor: c.bgSunken,
            borderColor: selected ? accent ?? c.accent : c.line,
            borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.image} accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <Text style={[styles.label, { color: selected ? c.text : c.muted }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 8,
    alignItems: "center",
    gap: 4,
  },
  frame: {
    width: SIZE,
    height: SIZE,
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: SIZE,
    height: SIZE,
  },
  placeholder: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    maxWidth: SIZE + 8,
    textAlign: "center",
  },
});
