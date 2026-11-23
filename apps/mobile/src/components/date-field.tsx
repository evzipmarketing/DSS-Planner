import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors, type ThemeName } from "@/theme/tokens";
import { useThemeStyles } from "./ui";

/** Convert YYYY-MM-DD → MM-DD-YYYY for display. */
export function isoToDisplayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return iso;
  return `${match[2]}-${match[3]}-${match[1]}`;
}

/** Convert MM-DD-YYYY (or close variants) → YYYY-MM-DD, or null if invalid. */
export function displayToIsoDate(display: string): string | null {
  const match = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(display.trim());
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoToDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DateField({
  theme,
  label,
  valueIso,
  onChangeIso,
  compact = false,
}: {
  theme: ThemeName;
  label: string;
  valueIso: string;
  onChangeIso: (iso: string) => void;
  /** Inline control without a stacked label — for single-row toolbars. */
  compact?: boolean;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  const [text, setText] = useState(() => isoToDisplayDate(valueIso));
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = useMemo(() => isoToDate(valueIso), [valueIso]);

  useEffect(() => {
    setText(isoToDisplayDate(valueIso));
  }, [valueIso]);

  function commitText(next: string) {
    setText(next);
    const iso = displayToIsoDate(next);
    if (iso) onChangeIso(iso);
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setPickerOpen(false);
    if (event.type === "dismissed") {
      setPickerOpen(false);
      return;
    }
    if (!date) return;
    const iso = dateToIso(date);
    onChangeIso(iso);
    setText(isoToDisplayDate(iso));
    if (Platform.OS === "ios") setPickerOpen(false);
  }

  return (
    <View style={{ gap: compact ? 0 : 6, flex: compact ? 1 : undefined, minWidth: 0, width: compact ? "100%" : undefined }}>
      {compact ? null : <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.input,
          {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 0,
            paddingLeft: compact ? 8 : 12,
            paddingRight: compact ? 2 : 6,
            gap: 2,
            minHeight: compact ? 40 : undefined,
          },
        ]}
      >
        <TextInput
          style={{
            flex: 1,
            minWidth: 0,
            color: c.text,
            fontSize: compact ? 13 : 15,
            paddingVertical: compact ? 8 : 10,
          }}
          value={text}
          onChangeText={commitText}
          onBlur={() => {
            const iso = displayToIsoDate(text);
            setText(iso ? isoToDisplayDate(iso) : isoToDisplayDate(valueIso));
          }}
          placeholder="MM-DD-YYYY"
          placeholderTextColor={c.faint}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          accessibilityLabel={label}
        />
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open calendar"
          hitSlop={8}
          style={{
            width: compact ? 32 : 36,
            height: compact ? 32 : 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CalendarGlyph color={c.accent} />
        </Pressable>
      </View>
      {pickerOpen ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
}

function CalendarGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 16,
          height: 14,
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: color,
          marginTop: 2,
        }}
      >
        <View style={{ height: 3, backgroundColor: color, opacity: 0.85, marginTop: 0 }} />
      </View>
      <View style={{ position: "absolute", top: 0, left: 4, width: 1.5, height: 4, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: "absolute", top: 0, right: 4, width: 1.5, height: 4, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}
