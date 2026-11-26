import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, type ThemeName } from "@/theme/tokens";

export function useThemeStyles(theme: ThemeName) {
  const c = colors(theme);
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    card: {
      backgroundColor: c.bgRaised,
      borderColor: c.line,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    title: { color: c.text, fontSize: 28, fontWeight: "600", letterSpacing: -0.5 },
    subtitle: { color: c.muted, fontSize: 15, lineHeight: 21 },
    label: { color: c.faint, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" },
    body: { color: c.text, fontSize: 15 },
    muted: { color: c.muted, fontSize: 14 },
    accent: { color: c.accent },
    chip: {
      borderWidth: 1,
      borderColor: c.lineStrong,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: c.bgRaised,
    },
    chipActive: { borderColor: c.accent },
    chipText: { color: c.text, fontSize: 13 },
    input: {
      borderWidth: 1,
      borderColor: c.lineStrong,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
      backgroundColor: c.bgSunken,
      fontSize: 15,
    },
    button: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    buttonText: { color: c.accentInk, fontWeight: "700", fontSize: 15 },
    ghost: {
      borderWidth: 1,
      borderColor: c.lineStrong,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
    },
    ghostText: { color: c.text, fontSize: 14 },
    banner: {
      backgroundColor: c.bgSunken,
      borderColor: c.line,
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },
  });
}

export function OfflineBanner({ theme, online }: { theme: ThemeName; online: boolean }) {
  const styles = useThemeStyles(theme);
  if (online) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.muted}>Offline — catalogue and planning still work. Weather, maps, and sky plates need a network.</Text>
    </View>
  );
}

export function Chip({
  theme,
  label,
  active,
  onPress,
  style,
}: {
  theme: ThemeName;
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemeStyles(theme);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null, style]}>
      <Text style={[styles.chipText, active ? styles.accent : null]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  theme,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "none",
  editable = true,
  autoFocus = false,
  secureTextEntry = false,
  textContentType,
  onFocus,
  onBlur,
}: {
  theme: ThemeName;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  textContentType?: "none" | "username" | "emailAddress" | "telephoneNumber" | "password" | "newPassword";
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const styles = useThemeStyles(theme);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, editable ? null : { opacity: 0.7 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors(theme).faint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        autoFocus={autoFocus}
        secureTextEntry={secureTextEntry}
        textContentType={textContentType}
        autoCorrect={false}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  );
}

export function PrimaryButton({
  theme,
  title,
  onPress,
  disabled,
}: {
  theme: ThemeName;
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemeStyles(theme);
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, disabled ? { opacity: 0.5 } : null]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function GhostButton({
  theme,
  title,
  onPress,
}: {
  theme: ThemeName;
  title: string;
  onPress: () => void;
}) {
  const styles = useThemeStyles(theme);
  return (
    <Pressable onPress={onPress} style={styles.ghost}>
      <Text style={styles.ghostText}>{title}</Text>
    </Pressable>
  );
}

export function SectionTitle({ theme, children, style }: { theme: ThemeName; children: string; style?: StyleProp<TextStyle> }) {
  const styles = useThemeStyles(theme);
  return <Text style={[styles.title, { fontSize: 22 }, style]}>{children}</Text>;
}
