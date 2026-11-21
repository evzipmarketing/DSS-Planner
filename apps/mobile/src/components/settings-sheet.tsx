import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { Site } from "@dss/core";
import { DateField, isoToDisplayDate } from "@/components/date-field";
import { Field, GhostButton, PrimaryButton, useThemeStyles } from "@/components/ui";
import { fetchGeocode } from "@/lib/api";
import { usePlannerState } from "@/state/planner-context";
import { colors, type ThemeName } from "@/theme/tokens";

type SettingsPanel = "menu" | "location" | "date" | "telescope" | "camera";

export function SettingsSheet({
  visible,
  onClose,
  initialPanel = "menu",
}: {
  visible: boolean;
  onClose: () => void;
  initialPanel?: SettingsPanel;
}) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [panel, setPanel] = useState<SettingsPanel>(initialPanel);

  useEffect(() => {
    if (visible) setPanel(initialPanel);
  }, [visible, initialPanel]);

  const place = planner.locationReady
    ? planner.site.name
    : planner.placeStatus === "detecting"
      ? "Detecting…"
      : "Set location";
  const scope = planner.telescope?.name.replace(/^(Sky-Watcher|ZWO)\s+/, "") ?? "Choose…";
  const camera = planner.camera?.name ?? "Choose…";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.bgRaised,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderColor: c.line,
            borderWidth: 1,
            maxHeight: "88%",
            minHeight: panel === "menu" ? undefined : "62%",
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8 }}>
            {panel === "menu" ? (
              <Text style={styles.label}>Observatory</Text>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <Pressable onPress={() => setPanel("menu")} hitSlop={8}>
                  <Text style={styles.accent}>← Settings</Text>
                </Pressable>
                <Text style={styles.label}>{panelTitle(panel)}</Text>
                <View style={{ width: 64 }} />
              </View>
            )}
          </View>

          {panel === "menu" ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 10 }}>
              <SettingsRow theme={planner.theme} label="Location" value={planner.locationReady ? `${place}${planner.bortleLoading ? "" : ` · Bortle ${planner.bortle}`}` : place} onPress={() => setPanel("location")} />
              <SettingsRow theme={planner.theme} label="Date" value={formatDay(planner.date)} onPress={() => setPanel("date")} />
              <SettingsRow theme={planner.theme} label="Telescope" value={scope} onPress={() => setPanel("telescope")} />
              <SettingsRow theme={planner.theme} label="Camera" value={camera} onPress={() => setPanel("camera")} />
              <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 10 }}>
                <Text style={styles.muted}>Close</Text>
              </Pressable>
            </View>
          ) : null}

          {panel === "location" ? <LocationSetup onDone={() => setPanel("menu")} /> : null}
          {panel === "date" ? <DateSetup onDone={() => setPanel("menu")} /> : null}
          {panel === "telescope" ? <TelescopeSetup onDone={() => setPanel("menu")} /> : null}
          {panel === "camera" ? <CameraSetup onDone={() => setPanel("menu")} /> : null}
        </View>
      </View>
    </Modal>
  );
}

function SettingsRow({
  theme,
  label,
  value,
  onPress,
}: {
  theme: ThemeName;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const styles = useThemeStyles(theme);
  return (
    <Pressable onPress={onPress} style={[styles.card, { gap: 2 }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </Pressable>
  );
}

function LocationSetup({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Site[]>([]);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      void fetchGeocode(query.trim())
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function selectSite(site: Site) {
    planner.chooseSite(site);
    onDone();
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
      <Text style={styles.muted}>
        {planner.placeStatus === "detecting"
          ? "Looking up this device’s location…"
          : planner.locationReady
            ? `Using ${planner.site.name}`
            : "Search for a place or enter coordinates."}
      </Text>
      {planner.locationReady ? (
        <View style={[styles.card, { borderColor: c.accent, gap: 2 }]}>
          <Text style={[styles.body, styles.accent]}>{planner.site.name}</Text>
          <Text style={styles.muted}>{planner.site.timezone}</Text>
        </View>
      ) : null}
      <Field theme={planner.theme} label="Search" value={query} onChangeText={setQuery} placeholder="Pune, Hanle…" />
      {results.map((result) => {
        const selected =
          planner.locationReady &&
          Math.abs(planner.site.latitude - result.latitude) < 1e-4 &&
          Math.abs(planner.site.longitude - result.longitude) < 1e-4;
        return (
          <Pressable
            key={`${result.latitude}-${result.longitude}-${result.name}`}
            style={[styles.card, selected ? { borderColor: c.accent } : null]}
            onPress={() => selectSite(result)}
          >
            <Text style={[styles.body, selected ? styles.accent : null]}>{result.name}</Text>
            <Text style={styles.muted}>{result.timezone}</Text>
          </Pressable>
        );
      })}
      <Field theme={planner.theme} label="Latitude" value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
      <Field theme={planner.theme} label="Longitude" value={lon} onChangeText={setLon} keyboardType="decimal-pad" />
      {error ? <Text style={styles.muted}>{error}</Text> : null}
      <PrimaryButton
        theme={planner.theme}
        title="Use coordinates"
        onPress={() => {
          const latitude = Number(lat);
          const longitude = Number(lon);
          if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
            setError("Latitude must be between −90 and 90.");
            return;
          }
          if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            setError("Longitude must be between −180 and 180.");
            return;
          }
          setError(null);
          selectSite({
            id: "custom",
            name: "Custom coordinates",
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          });
        }}
      />
    </ScrollView>
  );
}

function DateSetup({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const [value, setValue] = useState(planner.date);
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
      <DateField
        theme={planner.theme}
        label="Night of (MM-DD-YYYY)"
        valueIso={value}
        onChangeIso={setValue}
      />
      <PrimaryButton
        theme={planner.theme}
        title="Save date"
        onPress={() => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            planner.setDate(value);
            onDone();
          }
        }}
      />
      <GhostButton
        theme={planner.theme}
        title="Use today"
        onPress={() => {
          const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: planner.site.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date());
          setValue(today);
          planner.setDate(today);
          onDone();
        }}
      />
      <Text style={styles.muted}>
        Planning uses the site timezone ({planner.site.timezone}). Selected: {isoToDisplayDate(value)}
      </Text>
    </View>
  );
}

function TelescopeSetup({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [text, setText] = useState("");
  const options = useMemo(() => {
    const query = text.trim().toLowerCase();
    const pool = query
      ? planner.telescopes.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(query))
      : planner.telescopes;
    return [...pool].sort((a, b) => a.name.localeCompare(b.name));
  }, [planner.telescopes, text]);

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      <Field theme={planner.theme} label="Search telescopes" value={text} onChangeText={setText} placeholder="Seestar, Evostar…" />
      {planner.telescope?.smart?.modes?.length ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.muted}>Lens / focal length</Text>
          {planner.telescope.smart.modes.map((mode) => {
            const selected = planner.smartMode?.id === mode.id;
            return (
              <Pressable
                key={mode.id}
                onPress={() => planner.setSmartMode(mode.id)}
                style={[styles.card, selected ? { borderColor: c.accent } : null]}
              >
                <Text style={[styles.body, selected ? styles.accent : null]}>{mode.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const selected = planner.telescope?.id === item.id;
          return (
            <Pressable
              style={[styles.card, { marginBottom: 8 }, selected ? { borderColor: c.accent } : null]}
              onPress={() => {
                planner.setTelescopeId(item.id);
                onDone();
              }}
            >
              <Text style={[styles.body, selected ? styles.accent : null]}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.smart ? "Smart · " : ""}
                {item.apertureMm} mm · {item.focalLengthMm} mm
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function CameraSetup({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [text, setText] = useState("");
  const smartCameraIds = useMemo(
    () => new Set(planner.telescopes.flatMap((item) => (item.smart ? [item.smart.cameraId] : []))),
    [planner.telescopes],
  );
  const options = useMemo(() => {
    const query = text.trim().toLowerCase();
    const base = planner.cameraList.filter((item) => item.custom || !smartCameraIds.has(item.id));
    const pool = query ? base.filter((item) => item.name.toLowerCase().includes(query)) : base;
    return [...pool].sort((a, b) => a.name.localeCompare(b.name));
  }, [planner.cameraList, smartCameraIds, text]);

  if (planner.telescope?.smart) {
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
        <Text style={styles.body}>Camera is paired with {planner.telescope.name}.</Text>
        <View style={[styles.card, { borderColor: c.accent }]}>
          <Text style={[styles.body, styles.accent]}>{planner.camera?.name ?? "Paired camera"}</Text>
        </View>
        <Text style={styles.muted}>Built-in filters</Text>
        {(planner.telescope.smart.filterIds ?? []).map((id) => {
          const filter = planner.filterList.find((item) => item.id === id);
          if (!filter) return null;
          const selected = planner.filterIds.includes(id);
          return (
            <Pressable
              key={id}
              onPress={() => planner.toggleFilter(id)}
              style={[styles.card, selected ? { borderColor: c.accent } : null]}
            >
              <Text style={[styles.body, selected ? styles.accent : null]}>{filter.name}</Text>
            </Pressable>
          );
        })}
        <PrimaryButton theme={planner.theme} title="Done" onPress={onDone} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      <Field theme={planner.theme} label="Search cameras" value={text} onChangeText={setText} placeholder="ASI533…" />
      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const selected = planner.camera?.id === item.id;
          return (
            <Pressable
              style={[styles.card, { marginBottom: 8 }, selected ? { borderColor: c.accent } : null]}
              onPress={() => {
                planner.setCameraId(item.id);
                onDone();
              }}
            >
              <Text style={[styles.body, selected ? styles.accent : null]}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.sensor} · {item.widthPx}×{item.heightPx}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function panelTitle(panel: SettingsPanel): string {
  switch (panel) {
    case "menu":
      return "Observatory";
    case "location":
      return "Location";
    case "date":
      return "Date";
    case "telescope":
      return "Telescope";
    case "camera":
      return "Camera";
    default: {
      const unexpected: never = panel;
      return unexpected;
    }
  }
}

function formatDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[Number(match[2]) - 1] ?? match[2];
  return `${Number(match[3])} ${month} ${match[1]}`;
}
