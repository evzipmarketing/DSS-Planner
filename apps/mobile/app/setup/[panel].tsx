import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { effectiveFocalLengthMm, type Site } from "@dss/core";
import { DateField } from "@/components/date-field";
import { Field, GhostButton, PrimaryButton, useThemeStyles } from "@/components/ui";
import { fetchGeocode } from "@/lib/api";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function SetupPanelScreen() {
  const { panel } = useLocalSearchParams<{ panel: string }>();
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const title = panelLabel(panel);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title, headerStyle: { backgroundColor: c.bgRaised }, headerTintColor: c.text }} />
      {panel === "location" ? <LocationSetup /> : null}
      {panel === "date" ? <DateSetup /> : null}
      {panel === "telescope" ? <TelescopeSetup /> : null}
      {panel === "camera" ? <CameraSetup /> : null}
    </View>
  );
}

function LocationSetup() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={styles.muted}>
        {planner.placeStatus === "detecting"
          ? "Looking up this device’s location…"
          : planner.locationReady
            ? `Using ${planner.site.name}`
            : "Search for a place or enter coordinates."}
      </Text>
      <Field theme={planner.theme} label="Search" value={query} onChangeText={setQuery} placeholder="Pune, Hanle…" />
      {results.map((result) => (
        <Pressable
          key={`${result.latitude}-${result.longitude}-${result.name}`}
          style={styles.card}
          onPress={() => planner.chooseSite(result)}
        >
          <Text style={styles.body}>{result.name}</Text>
          <Text style={styles.muted}>{result.timezone}</Text>
        </Pressable>
      ))}
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
          planner.chooseSite({
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

function DateSetup() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const [value, setValue] = useState(planner.date);
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <DateField theme={planner.theme} label="Night of (MM-DD-YYYY)" valueIso={value} onChangeIso={setValue} />
      <PrimaryButton
        theme={planner.theme}
        title="Save date"
        onPress={() => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) planner.setDate(value);
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
        }}
      />
      <Text style={styles.muted}>Planning uses the site timezone ({planner.site.timezone}).</Text>
    </View>
  );
}

function TelescopeSetup() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [text, setText] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const searchBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const computedFl = planner.telescope
    ? Math.round(
        planner.telescope.smart
          ? (planner.smartMode?.focalLengthMm ?? planner.telescope.focalLengthMm)
          : effectiveFocalLengthMm(planner.telescope, planner.reducer),
      )
    : null;
  // Only the custom override lives in the field; computed FL is placeholder-only.
  const [flText, setFlText] = useState(
    planner.focalOverrideMm != null ? String(planner.focalOverrideMm) : "",
  );
  const flLocked = planner.focalOverrideMm != null;

  useEffect(() => {
    setFlText(planner.focalOverrideMm != null ? String(planner.focalOverrideMm) : "");
  }, [planner.focalOverrideMm, planner.telescope?.id]);

  useEffect(() => {
    return () => {
      if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
    };
  }, []);

  const options = useMemo(() => {
    const query = text.trim().toLowerCase();
    const library = new Set(planner.libraryTelescopeIds);
    const pool = query
      ? planner.telescopes.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(query))
      : planner.telescopes;
    const inLibrary = pool.filter((item) => library.has(item.id)).sort((a, b) => a.name.localeCompare(b.name));
    const rest = pool.filter((item) => !library.has(item.id)).sort((a, b) => a.name.localeCompare(b.name));
    return [...inLibrary, ...rest];
  }, [planner.libraryTelescopeIds, planner.telescopes, text]);

  function commitFocalLength(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      planner.setFocalOverrideMm(null);
      return;
    }
    if (trimmed.endsWith(".")) return;
    const next = Number(trimmed);
    if (!Number.isFinite(next) || next < 10 || next > 20_000) return;
    planner.setFocalOverrideMm(Math.round(next));
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        {flLocked ? (
          <View style={{ flex: 1, justifyContent: "center", paddingTop: 22 }}>
            <Text style={styles.body}>{planner.focalOverrideMm} mm</Text>
            <Text style={styles.muted}>Locked by custom FL</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Field
              theme={planner.theme}
              label="Search"
              value={searchActive ? text : (planner.telescope?.name ?? "")}
              onChangeText={setText}
              placeholder="Seestar, Evostar…"
              onFocus={() => {
                if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
                setText("");
                setSearchActive(true);
              }}
              onBlur={() => {
                searchBlurTimer.current = setTimeout(() => setSearchActive(false), 180);
              }}
            />
          </View>
        )}
        <View style={{ width: 108 }}>
          <Field
            theme={planner.theme}
            label="FL (mm)"
            value={flText}
            onChangeText={(value) => {
              setFlText(value);
              commitFocalLength(value);
            }}
            placeholder={computedFl != null ? String(computedFl) : "480"}
            keyboardType="numeric"
          />
        </View>
      </View>
      {planner.focalOverrideMm != null && computedFl != null ? (
        <Text style={styles.muted}>
          Using entered FL. Delete the value to remove it. Scope + corrector give {computedFl} mm.
        </Text>
      ) : (
        <Text style={styles.muted}>
          Type a focal length to apply it automatically. Delete the value to remove the override.
        </Text>
      )}
      {planner.telescope?.smart?.modes?.length ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.muted}>Lens / focal length</Text>
          {planner.telescope.smart.modes.map((mode) => (
            <GhostButton key={mode.id} theme={planner.theme} title={mode.label} onPress={() => planner.setSmartMode(mode.id)} />
          ))}
        </View>
      ) : null}
      {searchActive && !flLocked ? (
        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = planner.telescope?.id === item.id;
            const inLibrary = planner.libraryTelescopeIds.includes(item.id);
            return (
              <Pressable
                style={[styles.card, { marginBottom: 8 }, selected ? { borderColor: c.accent } : null]}
                onPress={() => {
                  if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
                  planner.setTelescopeId(item.id);
                  setText("");
                  setSearchActive(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.body, selected ? styles.accent : null, { flex: 1 }]}>{item.name}</Text>
                  {inLibrary ? (
                    <Text style={{ color: c.accent, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                      Yours
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.muted}>
                  {item.smart ? "Smart · " : ""}
                  {item.apertureMm} mm · {item.focalLengthMm} mm
                </Text>
              </Pressable>
            );
          }}
        />
      ) : null}
    </View>
  );
}

function CameraSetup() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
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
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={styles.body}>Camera is paired with {planner.telescope.name}.</Text>
        <Text style={styles.muted}>{planner.camera?.name ?? "Paired camera"}</Text>
        <Text style={styles.muted}>Built-in filters</Text>
        {(planner.telescope.smart.filterIds ?? []).map((id) => {
          const filter = planner.filterList.find((item) => item.id === id);
          if (!filter) return null;
          return (
            <GhostButton
              key={id}
              theme={planner.theme}
              title={`${planner.filterIds.includes(id) ? "✓ " : ""}${filter.name}`}
              onPress={() => planner.toggleFilter(id)}
            />
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Field theme={planner.theme} label="Search cameras" value={text} onChangeText={setText} placeholder="ASI533…" />
      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={[styles.card, { marginBottom: 8 }]} onPress={() => planner.setCameraId(item.id)}>
            <Text style={styles.body}>{item.name}</Text>
            <Text style={styles.muted}>
              {item.sensor} · {item.widthPx}×{item.heightPx}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function panelLabel(panel: string | undefined): string {
  switch (panel) {
    case "location":
      return "Location";
    case "date":
      return "Date";
    case "telescope":
      return "Telescope";
    case "camera":
      return "Camera";
    default:
      return "Setup";
  }
}
