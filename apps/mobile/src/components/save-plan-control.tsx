import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { GhostButton, PrimaryButton, useThemeStyles } from "@/components/ui";
import { colors, type ThemeName } from "@/theme/tokens";

export function SavePlanControl({
  theme,
  disabled,
  disabledReason,
  defaultName,
  onSave,
}: {
  theme: ThemeName;
  disabled?: boolean;
  disabledReason?: string;
  defaultName: string;
  onSave: (name: string) => void;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("Enter a plan name.");
      return;
    }
    onSave(trimmed);
    setMessage("Saved to Imaging plans.");
    setOpen(false);
  }

  return (
    <>
      <View style={[styles.card, { gap: 10 }]}>
        <Text style={[styles.body, { fontWeight: "600" }]}>Imaging plan</Text>
        <Text style={styles.muted}>
          {disabled && disabledReason ? disabledReason : "Save this setup to Profile → Imaging plans."}
        </Text>
        {message ? <Text style={styles.muted}>{message}</Text> : null}
        <PrimaryButton theme={theme} title="Save plan" disabled={disabled} onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setOpen(false)} />
          <View
            style={{
              backgroundColor: c.bgRaised,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderColor: c.line,
              borderWidth: 1,
              padding: 16,
              paddingBottom: 28,
              gap: 12,
            }}
          >
            <Text style={[styles.body, { fontWeight: "600" }]}>Save imaging plan</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={defaultName}
              placeholderTextColor={c.faint}
              autoFocus
              onSubmitEditing={submit}
            />
            <PrimaryButton theme={theme} title="Save" onPress={submit} />
            <GhostButton theme={theme} title="Cancel" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}
