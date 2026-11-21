import { useState, type ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import {
  IMAGEABLE_MIN_ALTITUDE_DEG,
  catalogueLabel,
  formatArcmin,
  formatCatalogueId,
  formatClock,
  formatDeclination,
  formatImageableHours,
  formatRightAscension,
  formatSignedDegrees,
  objectTitle,
  objectTypeLabel,
  primaryDesignation,
  type DeepSkyObject,
  type NightTrack,
} from "@dss/core";
import { constellationName } from "@dss/data";
import { colors, type ThemeName } from "@/theme/tokens";
import { useThemeStyles } from "./ui";

export function ObjectDetails({
  theme,
  object,
  track,
  timezone,
  actions,
}: {
  theme: ThemeName;
  object: DeepSkyObject;
  track: NightTrack | null;
  timezone: string;
  actions?: ReactNode;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  const [infoOpen, setInfoOpen] = useState(false);

  const facts: { label: string; value: string }[] = [
    { label: "Code", value: primaryDesignation(object) },
    { label: "Constellation", value: object.constellation ? constellationName(object.constellation) : "—" },
    { label: "Type", value: objectTypeLabel(object.type) },
    { label: "Magnitude", value: object.magnitude == null ? "Not listed" : object.magnitude.toFixed(2) },
    { label: "Size", value: sizeText(object.majorArcmin, object.minorArcmin, object.positionAngleDeg) },
    { label: "Imageable", value: track ? formatImageableHours(track.usableHours) : "—" },
    { label: "Rise / set", value: riseSetText(track, timezone) },
  ];

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
          <Text style={[styles.body, { fontSize: 20, fontWeight: "600", flexShrink: 1 }]}>{objectTitle(object)}</Text>
          <Pressable
            onPress={() => setInfoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Object information"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.lineStrong,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            <Text style={[styles.accent, { fontSize: 13, fontWeight: "700" }]}>i</Text>
          </Pressable>
        </View>
        {actions ? <View style={{ flexDirection: "row", gap: 8, flexShrink: 0 }}>{actions}</View> : null}
      </View>
      <View style={{ gap: 8 }}>
        {facts.map((fact) => (
          <View key={fact.label} style={{ gap: 2 }}>
            <Text style={{ color: c.faint, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>{fact.label}</Text>
            <Text style={styles.body}>{fact.value}</Text>
          </View>
        ))}
      </View>

      <Modal visible={infoOpen} animationType="fade" transparent onRequestClose={() => setInfoOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 }} onPress={() => setInfoOpen(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: c.bgRaised,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.line,
              padding: 16,
              gap: 10,
            }}
          >
            <Text style={[styles.body, { fontWeight: "600" }]}>More about {objectTitle(object)}</Text>
            <InfoRow theme={theme} label="Known as" value={knownAsText(object)} />
            <InfoRow theme={theme} label="Catalogues" value={object.catalogues.map((item) => catalogueLabel(item)).join(", ")} />
            <InfoRow theme={theme} label="RA J2000" value={formatRightAscension(object.raDeg)} />
            <InfoRow theme={theme} label="Dec J2000" value={formatDeclination(object.decDeg)} />
            <Pressable onPress={() => setInfoOpen(false)} style={{ alignItems: "center", paddingTop: 6 }}>
              <Text style={styles.muted}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoRow({ theme, label, value }: { theme: ThemeName; label: string; value: string }) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: c.faint, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

function knownAsText(object: DeepSkyObject): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  function add(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(trimmed);
  }
  for (const name of object.names) add(name);
  add(primaryDesignation(object));
  add(formatCatalogueId(object.id));
  for (const alias of object.aliases) add(formatCatalogueId(alias));
  return parts.length ? parts.join(" · ") : "—";
}

function riseSetText(track: NightTrack | null, timezone: string): string {
  if (!track) return "—";
  if (track.usableIntervals.length === 0) {
    return `No good imaging window tonight (altitude, darkness, or Moon)`;
  }
  return track.usableIntervals
    .map((interval) => `${formatClock(interval.start, timezone)}–${formatClock(interval.end, timezone)}`)
    .join(", ");
}

function sizeText(major: number | null, minor: number | null, angle: number | null): string {
  if (major == null) return "Not listed";
  const minorText = minor == null ? "" : ` × ${formatArcmin(minor)}`;
  const angleText = angle == null ? "" : `, ${formatSignedDegrees(angle, 0)}`;
  return `${formatArcmin(major)}${minorText}${angleText}`;
}
