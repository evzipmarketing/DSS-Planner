import { Pressable, Text, View } from "react-native";
import { useThemeStyles } from "@/components/ui";
import { colors, type ThemeName } from "@/theme/tokens";

export function HubRow({
  theme,
  title,
  detail,
  onPress,
  badge,
}: {
  theme: ThemeName;
  title: string;
  detail?: string;
  onPress: () => void;
  badge?: string;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.body, { fontWeight: "600" }]}>{title}</Text>
        {detail ? <Text style={styles.muted}>{detail}</Text> : null}
      </View>
      {badge ? <Text style={[styles.muted, { fontSize: 12 }]}>{badge}</Text> : null}
      <Text style={{ color: c.faint, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}
