import { useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchSkyPlate } from "@/lib/api";
import { colors, type ThemeName } from "@/theme/tokens";

const THUMB_SIZE = 72;
const PREVIEW_SIZE = 640;
const THUMB_SLOTS = 4;

let thumbActive = 0;
const thumbWaiters: Array<() => void> = [];

function acquireThumb(): Promise<void> {
  if (thumbActive < THUMB_SLOTS) {
    thumbActive += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    thumbWaiters.push(() => {
      thumbActive += 1;
      resolve();
    });
  });
}

function releaseThumb(): void {
  thumbActive = Math.max(0, thumbActive - 1);
  thumbWaiters.shift()?.();
}

function thumbFovDeg(majorArcmin: number | null, padding = 1.8): number {
  return Math.min(6, Math.max(0.12, ((majorArcmin ?? 15) / 60) * padding));
}

export function TargetThumb({
  raDeg,
  decDeg,
  majorArcmin,
  theme,
  name,
}: {
  raDeg: number;
  decDeg: number;
  majorArcmin: number | null;
  theme: ThemeName;
  name?: string;
}) {
  const c = colors(theme);
  const [uri, setUri] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUri(null);
    setFailed(false);

    async function load(): Promise<void> {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        await acquireThumb();
        if (cancelled) {
          releaseThumb();
          return;
        }
        try {
          const plate = await fetchSkyPlate({
            ra: raDeg,
            dec: decDeg,
            fov: thumbFovDeg(majorArcmin),
            size: 96,
          });
          releaseThumb();
          if (cancelled) return;
          setUri(plate.uri);
          return;
        } catch {
          releaseThumb();
          if (cancelled) return;
          await delay(400 * (attempt + 1));
        }
      }
      if (!cancelled) setFailed(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [raDeg, decDeg, majorArcmin]);

  async function openPreview() {
    setPreviewOpen(true);
    if (previewUri) return;
    setPreviewLoading(true);
    setPreviewFailed(false);
    try {
      const plate = await fetchSkyPlate({
        ra: raDeg,
        dec: decDeg,
        fov: thumbFovDeg(majorArcmin, 1.25),
        size: PREVIEW_SIZE,
      });
      setPreviewUri(plate.uri);
    } catch {
      setPreviewFailed(true);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={() => void openPreview()}
        accessibilityRole="button"
        accessibilityLabel={name ? `Enlarge ${name}` : "Enlarge sky preview"}
        style={[
          styles.frame,
          {
            backgroundColor: c.bgSunken,
            borderColor: c.line,
          },
        ]}
      >
        {uri && !failed ? (
          <Image source={{ uri }} style={styles.image} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.placeholder, failed ? { opacity: 0.35 } : { opacity: 0.55 }]} />
        )}
      </Pressable>

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPreviewOpen(false)}>
          <View style={[styles.dialog, { backgroundColor: c.bgRaised, borderColor: c.lineStrong }]}>
            <Pressable
              onPress={() => setPreviewOpen(false)}
              style={[styles.close, { borderColor: c.lineStrong, backgroundColor: c.bgSunken }]}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <Text style={{ color: c.text, fontSize: 18, fontWeight: "600" }}>×</Text>
            </Pressable>
            <View style={[styles.previewFrame, { backgroundColor: "#000" }]}>
              {previewLoading ? <Text style={{ color: c.muted }}>Loading…</Text> : null}
              {previewFailed ? <Text style={{ color: c.muted }}>Preview did not load.</Text> : null}
              {previewUri && !previewFailed ? (
                <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : null}
            </View>
            {name ? <Text style={[styles.caption, { color: c.text }]}>{name}</Text> : null}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  frame: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  placeholder: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  dialog: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    maxHeight: "92%",
  },
  close: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFrame: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  caption: {
    fontSize: 16,
    fontWeight: "600",
    paddingRight: 40,
  },
});
