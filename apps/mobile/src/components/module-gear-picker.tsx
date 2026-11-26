import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { effectiveFocalLengthMm } from "@dss/core";
import { Field, useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

const REDUCERS = [
  { value: 1, label: "1.0× flattener or none" },
  { value: 0.8, label: "0.8× reducer" },
  { value: 0.75, label: "0.75× reducer" },
  { value: 0.63, label: "0.63× reducer" },
  { value: 2, label: "2× Barlow" },
];

type MenuKind = "rig" | "camera" | "flattener" | null;

export function ModuleGearPicker() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const gearReady = Boolean(planner.telescope && planner.camera);
  const [open, setOpen] = useState(!gearReady);
  const [menu, setMenu] = useState<MenuKind>(null);
  const [scopeSearch, setScopeSearch] = useState("");
  const [scopeSearchActive, setScopeSearchActive] = useState(false);
  const [cameraSearch, setCameraSearch] = useState("");
  const scopeBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rigLocked = Boolean(planner.activeRigId);
  const smartScope = Boolean(planner.telescope?.smart);
  const activeRig = planner.rigs.find((item) => item.id === planner.activeRigId) ?? null;

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

  useEffect(() => {
    if (gearReady) setOpen(false);
    else setOpen(true);
  }, [gearReady, planner.activeRigId, planner.telescopeId, planner.cameraId]);

  useEffect(() => {
    setFlText(planner.focalOverrideMm != null ? String(planner.focalOverrideMm) : "");
  }, [planner.focalOverrideMm, planner.telescope?.id]);

  useEffect(() => {
    return () => {
      if (scopeBlurTimer.current) clearTimeout(scopeBlurTimer.current);
      const trimmed = flTextRef.current.trim();
      if (!trimmed || trimmed.endsWith(".")) return;
      const next = Number(trimmed);
      if (!Number.isFinite(next) || next < 10 || next > 20_000) return;
      setFocalOverrideMm(Math.round(next));
    };
  }, [setFocalOverrideMm]);

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

  const flLocked = planner.focalOverrideMm != null;

  const summary = useMemo(() => {
    // Custom FL replaces the catalogue scope name — same as Tonight gear chips.
    const scope =
      planner.focalOverrideMm != null
        ? `${planner.focalOverrideMm} mm`
        : (planner.telescope?.name ?? "No scope");
    const camera = planner.camera?.name ?? "No camera";
    const flat = smartScope
      ? "smart optics"
      : (REDUCERS.find((item) => item.value === planner.reducer)?.label ?? `${planner.reducer}×`);
    const prefix = activeRig?.name ?? "Manual";
    return `${prefix} · ${scope} · ${camera} · ${flat}`;
  }, [activeRig, planner.telescope, planner.camera, planner.reducer, smartScope, planner.focalOverrideMm]);

  const opticsLine = useMemo(() => {
    if (!planner.optics) return null;
    return `${planner.optics.field.widthArcmin.toFixed(1)}′ × ${planner.optics.field.heightArcmin.toFixed(1)}′ · ${Math.round(planner.optics.focalLengthMm)} mm`;
  }, [planner.optics]);

  const smartCameraIds = useMemo(
    () => new Set(planner.telescopes.flatMap((item) => (item.smart ? [item.smart.cameraId] : []))),
    [planner.telescopes],
  );

  const scopeOptions = useMemo(() => {
    const query = scopeSearch.trim().toLowerCase();
    const library = new Set(planner.libraryTelescopeIds);
    const pool = query
      ? planner.telescopes.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(query))
      : planner.telescopes;
    const inLibrary = pool.filter((item) => library.has(item.id)).sort((a, b) => a.name.localeCompare(b.name));
    const rest = pool.filter((item) => !library.has(item.id)).sort((a, b) => a.name.localeCompare(b.name));
    return [...inLibrary, ...rest];
  }, [planner.telescopes, planner.libraryTelescopeIds, scopeSearch]);

  const cameraOptions = useMemo(() => {
    const query = cameraSearch.trim().toLowerCase();
    const library = new Set(planner.libraryCameraIds);
    const base = planner.cameraList.filter((item) => item.custom || !smartCameraIds.has(item.id));
    const pool = query ? base.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(query)) : base;
    const inLibrary = pool.filter((item) => library.has(item.id)).sort((a, b) => a.name.localeCompare(b.name));
    const rest = pool.filter((item) => !library.has(item.id)).sort((a, b) => a.name.localeCompare(b.name));
    return [...inLibrary, ...rest];
  }, [planner.cameraList, planner.libraryCameraIds, smartCameraIds, cameraSearch]);

  const flattenerLabel =
    REDUCERS.find((item) => item.value === planner.reducer)?.label ?? `${planner.reducer}×`;

  return (
    <View style={[styles.card, { gap: 10 }]}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.label}>Gear</Text>
          <Text style={[styles.body, { fontWeight: "600" }]}>{summary}</Text>
          {!open && opticsLine ? <Text style={styles.muted}>{opticsLine}</Text> : null}
        </View>
        <Text style={{ color: c.accent, fontSize: 12, marginTop: 4 }}>{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open ? (
        <View style={{ gap: 10 }}>
          <DropdownField
            label="Rig"
            value={activeRig?.name ?? "Manual"}
            onPress={() => setMenu("rig")}
            styles={styles}
            c={c}
          />

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            {rigLocked || flLocked ? (
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
                  value={scopeSearchActive ? scopeSearch : (planner.telescope?.name ?? "")}
                  onChangeText={setScopeSearch}
                  placeholder="Seestar, Evostar…"
                  onFocus={() => {
                    if (scopeBlurTimer.current) clearTimeout(scopeBlurTimer.current);
                    setScopeSearch("");
                    setScopeSearchActive(true);
                  }}
                  onBlur={() => {
                    scopeBlurTimer.current = setTimeout(() => setScopeSearchActive(false), 180);
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
              Using entered FL ({planner.focalOverrideMm} mm). Delete the value to remove it and unlock the telescope.
              Scope + corrector give {computedFl} mm.
            </Text>
          ) : (
            <Text style={styles.muted}>
              Type a focal length to apply it automatically. Delete the value to remove the override.
            </Text>
          )}

          {!rigLocked && !flLocked && scopeSearchActive ? (
            <View style={{ maxHeight: 220 }}>
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {scopeOptions.map((item) => {
                  const selected = planner.telescopeId === item.id;
                  const inLibrary = planner.libraryTelescopeIds.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        if (scopeBlurTimer.current) clearTimeout(scopeBlurTimer.current);
                        planner.setTelescopeId(item.id);
                        setScopeSearch("");
                        setScopeSearchActive(false);
                      }}
                      style={[
                        styles.card,
                        {
                          paddingVertical: 12,
                          marginBottom: 8,
                          borderColor: selected ? c.accent : c.line,
                          backgroundColor: c.bgSunken,
                        },
                      ]}
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
                })}
              </ScrollView>
            </View>
          ) : null}

          {smartScope ? (
            <View style={{ gap: 4 }}>
              <Text style={styles.muted}>Camera</Text>
              <Text style={styles.body}>{planner.camera?.name ?? "Paired camera"}</Text>
              <Text style={styles.muted}>Paired with smart telescope</Text>
            </View>
          ) : (
            <>
              <DropdownField
                label="Camera"
                value={planner.camera?.name ?? "Select camera"}
                disabled={rigLocked}
                onPress={() => {
                  setCameraSearch("");
                  setMenu("camera");
                }}
                styles={styles}
                c={c}
              />
            </>
          )}

          <DropdownField
            label="Flattener / reducer"
            value={smartScope ? "Smart optics" : flattenerLabel}
            disabled={rigLocked || smartScope || !planner.telescope}
            onPress={() => setMenu("flattener")}
            styles={styles}
            c={c}
          />
          {opticsLine ? <Text style={styles.muted}>{opticsLine}</Text> : null}
        </View>
      ) : null}

      <Modal
        visible={menu != null}
        animationType="slide"
        transparent
        onRequestClose={() => setMenu(null)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setMenu(null)} />
          <View
            style={{
              backgroundColor: c.bgRaised,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderColor: c.line,
              borderWidth: 1,
              padding: 16,
              paddingBottom: 28,
              maxHeight: "70%",
              gap: 8,
            }}
          >
            <Text style={[styles.label, { marginBottom: 4 }]}>
              {menu === "rig" ? "Rig" : menu === "camera" ? "Camera" : "Flattener / reducer"}
            </Text>

            {menu === "camera" && !rigLocked && !smartScope ? (
              <Field
                theme={planner.theme}
                label="Search cameras"
                value={cameraSearch}
                onChangeText={setCameraSearch}
                placeholder="ASI533…"
              />
            ) : null}

            <ScrollView keyboardShouldPersistTaps="handled">
              {menu === "rig" ? (
                <>
                  <OptionRow
                    title="Manual"
                    selected={!activeRig}
                    onPress={() => {
                      planner.clearActiveRig();
                      setMenu(null);
                    }}
                    styles={styles}
                    c={c}
                  />
                  {planner.rigs.map((rig) => (
                    <OptionRow
                      key={rig.id}
                      title={rig.name}
                      selected={activeRig?.id === rig.id}
                      onPress={() => {
                        planner.selectRig(rig.id);
                        setMenu(null);
                      }}
                      styles={styles}
                      c={c}
                    />
                  ))}
                </>
              ) : null}

              {menu === "camera"
                ? cameraOptions.map((item) => {
                    const selected = planner.cameraId === item.id;
                    const inLibrary = planner.libraryCameraIds.includes(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          planner.setCameraId(item.id);
                          setMenu(null);
                        }}
                        style={[
                          styles.card,
                          {
                            paddingVertical: 12,
                            marginBottom: 8,
                            borderColor: selected ? c.accent : c.line,
                            backgroundColor: c.bgSunken,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[styles.body, selected ? styles.accent : null, { flex: 1 }]}>{item.name}</Text>
                          {inLibrary ? (
                            <Text
                              style={{ color: c.accent, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}
                            >
                              Yours
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.muted}>
                          {item.sensor} · {item.widthPx}×{item.heightPx}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}

              {menu === "flattener"
                ? REDUCERS.map((item) => (
                    <OptionRow
                      key={item.value}
                      title={item.label}
                      selected={planner.reducer === item.value}
                      onPress={() => {
                        planner.setReducer(item.value);
                        if (planner.telescope) planner.setTelescopePreferredReducer(planner.telescope.id, item.value);
                        setMenu(null);
                      }}
                      styles={styles}
                      c={c}
                    />
                  ))
                : null}
            </ScrollView>
            <Pressable onPress={() => setMenu(null)} style={{ alignItems: "center", paddingVertical: 10 }}>
              <Text style={styles.muted}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DropdownField({
  label,
  value,
  disabled,
  onPress,
  styles,
  c,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof useThemeStyles>;
  c: ReturnType<typeof colors>;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.muted}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.input,
          {
            minHeight: 40,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            opacity: disabled ? 0.45 : 1,
            backgroundColor: c.bgSunken,
          },
        ]}
      >
        <Text style={[styles.body, { flex: 1 }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={{ color: c.accent, fontSize: 11 }}>▼</Text>
      </Pressable>
    </View>
  );
}

function OptionRow({
  title,
  selected,
  onPress,
  styles,
  c,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof useThemeStyles>;
  c: ReturnType<typeof colors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          paddingVertical: 12,
          marginBottom: 8,
          borderColor: selected ? c.accent : c.line,
          backgroundColor: c.bgSunken,
        },
      ]}
    >
      <Text style={[styles.body, selected ? styles.accent : null]}>{title}</Text>
    </Pressable>
  );
}
