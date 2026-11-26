import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { effectiveFocalLengthMm, type Site } from "@dss/core";
import { DateField, isoToDisplayDate } from "@/components/date-field";
import { Field, GhostButton, PrimaryButton, useThemeStyles } from "@/components/ui";
import { fetchGeocode } from "@/lib/api";
import { usePlannerState } from "@/state/planner-context";
import type { Planner } from "@/state/use-planner";
import { colors, type ThemeName } from "@/theme/tokens";

type SettingsPanel = "menu" | "location" | "date" | "rig" | "telescope" | "flattener" | "camera";

const REDUCERS: { value: number; label: string }[] = [
  { value: 1, label: "1.0× flattener or none" },
  { value: 0.8, label: "0.8× reducer" },
  { value: 0.75, label: "0.75× reducer" },
  { value: 0.63, label: "0.63× reducer" },
  { value: 2, label: "2× Barlow" },
];

function reducerLabel(value: number): string {
  return REDUCERS.find((item) => item.value === value)?.label ?? `${value}×`;
}

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
  const rigLocked = Boolean(planner.activeRigId);
  const smartLocked = Boolean(planner.telescope?.smart);
  const flattenerLocked = rigLocked || smartLocked;

  useEffect(() => {
    if (visible) setPanel(initialPanel);
  }, [visible, initialPanel]);

  const place = planner.locationReady
    ? planner.site.name
    : planner.placeStatus === "detecting"
      ? "Detecting…"
      : "Set location";
  const activeRig = planner.rigs.find((item) => item.id === planner.activeRigId) ?? null;
  const scope = telescopeChipLabel(planner);
  const camera = cameraChipLabel(planner);
  const flattener = smartLocked ? "Built-in optics" : reducerLabel(planner.reducer);

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
              <SettingsRow
                theme={planner.theme}
                label="Location"
                value={
                  planner.locationReady
                    ? `${place}${planner.bortleLoading ? "" : ` · Bortle ${planner.bortle}`}`
                    : place
                }
                onPress={() => setPanel("location")}
              />
              <SettingsRow
                theme={planner.theme}
                label="Date"
                value={formatDay(planner.date)}
                onPress={() => setPanel("date")}
              />
              <SettingsRow
                theme={planner.theme}
                label="Rig"
                value={activeRig?.name ?? "Manual scope + camera"}
                onPress={() => setPanel("rig")}
              />
              <SettingsRow
                theme={planner.theme}
                label="Telescope"
                value={scope}
                onPress={() => setPanel("telescope")}
                disabled={rigLocked}
                hint={rigLocked ? "Locked by selected rig" : undefined}
              />
              <SettingsRow
                theme={planner.theme}
                label="Flattener"
                value={flattener}
                onPress={() => setPanel("flattener")}
                disabled={flattenerLocked}
                hint={
                  rigLocked
                    ? "Locked by selected rig"
                    : smartLocked
                      ? "Smart scope uses built-in optics"
                      : undefined
                }
              />
              <SettingsRow
                theme={planner.theme}
                label="Camera"
                value={camera}
                onPress={() => setPanel("camera")}
                disabled={rigLocked}
                hint={rigLocked ? "Locked by selected rig" : undefined}
              />
              <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 10 }}>
                <Text style={styles.muted}>Close</Text>
              </Pressable>
            </View>
          ) : null}

          {panel === "location" ? <LocationSetup onDone={() => setPanel("menu")} /> : null}
          {panel === "date" ? <DateSetup onDone={() => setPanel("menu")} /> : null}
          {panel === "rig" ? <RigSetup onDone={() => setPanel("menu")} /> : null}
          {panel === "telescope" ? <TelescopeSetup onDone={() => setPanel("menu")} /> : null}
          {panel === "flattener" ? <FlattenerSetup onDone={() => setPanel("menu")} /> : null}
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
  disabled,
  hint,
}: {
  theme: ThemeName;
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  const styles = useThemeStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.card, { gap: 2, opacity: disabled ? 0.55 : 1 }]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
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
      <DateField theme={planner.theme} label="Night of (MM-DD-YYYY)" valueIso={value} onChangeIso={setValue} />
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

function RigSetup({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
      <Text style={styles.muted}>
        Choosing a saved rig sets scope, flattener, camera, and filter together and locks manual gear picks.
      </Text>
      <Pressable
        onPress={() => {
          planner.clearActiveRig();
          onDone();
        }}
        style={[styles.card, !planner.activeRigId ? { borderColor: c.accent } : null]}
      >
        <Text style={[styles.body, !planner.activeRigId ? styles.accent : null]}>Manual scope + camera</Text>
        <Text style={styles.muted}>Pick telescope and camera separately</Text>
      </Pressable>
      {planner.rigs.length === 0 ? (
        <Text style={styles.muted}>No saved rigs yet. Add some under Profile → Equipment.</Text>
      ) : (
        planner.rigs.map((rig) => {
          const selected = planner.activeRigId === rig.id;
          const scope = planner.telescopes.find((item) => item.id === rig.telescopeId);
          const camera = planner.cameraList.find((item) => item.id === rig.cameraId);
          return (
            <Pressable
              key={rig.id}
              onPress={() => {
                planner.selectRig(rig.id);
                onDone();
              }}
              style={[styles.card, selected ? { borderColor: c.accent } : null]}
            >
              <Text style={[styles.body, selected ? styles.accent : null]}>{rig.name}</Text>
              <Text style={styles.muted}>
                {[scope?.name ?? rig.telescopeId, camera?.name ?? rig.cameraId, `${rig.reducer}×`]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function FlattenerSetup({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);

  if (planner.activeRigId) {
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
        <Text style={styles.body}>Flattener is locked by the selected rig.</Text>
        <Text style={styles.muted}>Switch to Manual under Rig to change it separately.</Text>
        <View style={[styles.card, { borderColor: c.accent }]}>
          <Text style={[styles.body, styles.accent]}>{reducerLabel(planner.reducer)}</Text>
        </View>
        <PrimaryButton theme={planner.theme} title="Back" onPress={onDone} />
      </View>
    );
  }

  if (planner.telescope?.smart) {
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
        <Text style={styles.body}>Smart scopes use built-in optics.</Text>
        <Text style={styles.muted}>No separate flattener or reducer applies.</Text>
        <PrimaryButton theme={planner.theme} title="Back" onPress={onDone} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
      <Text style={styles.muted}>Choose the flattener, reducer, or Barlow on this scope.</Text>
      {REDUCERS.map((item) => {
        const selected = planner.reducer === item.value;
        return (
          <Pressable
            key={item.value}
            onPress={() => {
              planner.setReducer(item.value);
              if (planner.telescope) {
                planner.setTelescopePreferredReducer(planner.telescope.id, item.value);
              }
              onDone();
            }}
            style={[styles.card, selected ? { borderColor: c.accent } : null]}
          >
            <Text style={[styles.body, selected ? styles.accent : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TelescopeSetup({ onDone }: { onDone: () => void }) {
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
  const flTextRef = useRef(flText);
  flTextRef.current = flText;
  const setFocalOverrideMm = planner.setFocalOverrideMm;
  const flLocked = planner.focalOverrideMm != null;

  useEffect(() => {
    setFlText(planner.focalOverrideMm != null ? String(planner.focalOverrideMm) : "");
  }, [planner.focalOverrideMm, planner.telescope?.id]);

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
      setFocalOverrideMm(null);
      return;
    }
    if (trimmed.endsWith(".")) return;
    const next = Number(trimmed);
    if (!Number.isFinite(next) || next < 10 || next > 20_000) return;
    setFocalOverrideMm(Math.round(next));
  }

  useEffect(() => {
    return () => {
      if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
      const trimmed = flTextRef.current.trim();
      if (!trimmed || trimmed.endsWith(".")) return;
      const next = Number(trimmed);
      if (!Number.isFinite(next) || next < 10 || next > 20_000) return;
      setFocalOverrideMm(Math.round(next));
    };
  }, [setFocalOverrideMm]);

  const flControls = (
    <>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        {planner.activeRigId || flLocked ? (
          <View style={{ flex: 1, justifyContent: "center", paddingTop: 22 }}>
            <Text style={styles.body}>
              {flLocked
                ? `${planner.focalOverrideMm} mm`
                : (planner.telescope?.name ?? "Scope from rig")}
            </Text>
            <Text style={styles.muted}>
              {flLocked ? "Locked by custom FL" : "Locked by selected rig"}
            </Text>
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
    </>
  );

  if (planner.activeRigId) {
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
        {flControls}
        <Text style={styles.muted}>Switch to Manual under Rig to change scope separately.</Text>
        <PrimaryButton theme={planner.theme} title="Back" onPress={onDone} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      {flControls}
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
      {searchActive && !flLocked ? (
        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
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
      <PrimaryButton
        theme={planner.theme}
        title="Done"
        onPress={() => {
          commitFocalLength(flText);
          onDone();
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
    const library = new Set(planner.libraryCameraIds);
    const base = planner.cameraList.filter((item) => item.custom || !smartCameraIds.has(item.id));
    const pool = query ? base.filter((item) => item.name.toLowerCase().includes(query)) : base;
    const inLibrary = pool.filter((item) => library.has(item.id)).sort((a, b) => a.name.localeCompare(b.name));
    const rest = pool.filter((item) => !library.has(item.id)).sort((a, b) => a.name.localeCompare(b.name));
    return [...inLibrary, ...rest];
  }, [planner.cameraList, planner.libraryCameraIds, smartCameraIds, text]);

  if (planner.activeRigId) {
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}>
        <Text style={styles.body}>Camera is locked by the selected rig.</Text>
        <Text style={styles.muted}>Switch to Manual under Rig to change camera separately.</Text>
        <PrimaryButton theme={planner.theme} title="Back" onPress={onDone} />
      </View>
    );
  }

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
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const selected = planner.camera?.id === item.id;
          const inLibrary = planner.libraryCameraIds.includes(item.id);
          return (
            <Pressable
              style={[styles.card, { marginBottom: 8 }, selected ? { borderColor: c.accent } : null]}
              onPress={() => {
                planner.setCameraId(item.id);
                onDone();
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
    case "rig":
      return "Rig";
    case "telescope":
      return "Telescope";
    case "flattener":
      return "Flattener";
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

function trimGear(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return name.replace(/^(Sky-Watcher|ZWO)\s+/, "");
}

function telescopeChipLabel(planner: Planner): string {
  const telescope = planner.telescope;
  // Custom FL replaces the catalogue name on the closed row — don't keep both.
  if (planner.focalOverrideMm != null) {
    return `${planner.focalOverrideMm} mm`;
  }
  const name = trimGear(telescope?.name) ?? "Choose…";
  if (!telescope) return name;
  if (planner.optics) {
    return `${name} · ${Math.round(planner.optics.focalLengthMm)} mm`;
  }
  const focalMm = telescope.smart
    ? (planner.smartMode?.focalLengthMm ?? telescope.focalLengthMm)
    : effectiveFocalLengthMm(telescope, planner.reducer);
  return `${name} · ${Math.round(focalMm)} mm`;
}

function cameraChipLabel(planner: Planner): string {
  const name = trimGear(planner.camera?.name) ?? "Choose…";
  if (!planner.camera) return name;
  if (planner.filterIds.length <= 1) return name;
  return `${name} · ${planner.filterIds.length} filters`;
}
