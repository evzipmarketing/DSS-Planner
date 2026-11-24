import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { filterKindLabel, type Camera, type FilterKind, type ImagingFilter, type Telescope } from "@dss/core";
import { Field, GhostButton, PrimaryButton, useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";
import { colors, type ThemeName } from "@/theme/tokens";

type AddMode = "rig" | "scope" | "camera" | "filter" | null;
type PickerKind = "scope" | "camera" | "filter" | "flattener" | null;

const REDUCERS: { value: number; label: string }[] = [
  { value: 1, label: "1.0× flattener or none" },
  { value: 0.8, label: "0.8× reducer" },
  { value: 0.75, label: "0.75× reducer" },
  { value: 0.63, label: "0.63× reducer" },
  { value: 2, label: "2× Barlow" },
];

const FILTER_KINDS: FilterKind[] = [
  "broadband",
  "uv_ir_cut",
  "dual_narrowband",
  "tri_narrowband",
  "quad_narrowband",
  "ha",
  "oiii",
  "sii",
  "luminance",
  "red",
  "green",
  "blue",
];

function reducerLabel(value: number): string {
  return REDUCERS.find((item) => item.value === value)?.label ?? `${value}×`;
}

function rankLibraryFirst<T extends { id: string; name: string }>(
  items: T[],
  libraryIds: readonly string[],
  query: string,
  limit = 40,
): T[] {
  const library = new Set(libraryIds);
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? items.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(needle))
    : [...items];
  const inLibrary = filtered
    .filter((item) => library.has(item.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const rest = filtered
    .filter((item) => !library.has(item.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...inLibrary, ...rest].slice(0, limit);
}

export default function EquipmentScreen() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const [addMode, setAddMode] = useState<AddMode>(null);

  const libraryScopes = useMemo(
    () =>
      planner.libraryTelescopeIds
        .map((id) => planner.telescopes.find((item) => item.id === id))
        .filter((item): item is Telescope => Boolean(item)),
    [planner.libraryTelescopeIds, planner.telescopes],
  );

  const libraryCameras = useMemo(
    () =>
      planner.libraryCameraIds
        .map((id) => planner.cameraList.find((item) => item.id === id))
        .filter((item): item is Camera => Boolean(item)),
    [planner.libraryCameraIds, planner.cameraList],
  );

  const libraryFilters = useMemo(
    () =>
      planner.libraryFilterIds
        .map((id) => planner.filterList.find((item) => item.id === id))
        .filter((item): item is ImagingFilter => Boolean(item)),
    [planner.libraryFilterIds, planner.filterList],
  );

  function confirmDelete(title: string, message: string, onConfirm: () => void) {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Text style={styles.subtitle}>
          Build named rigs (scope, flattener, camera, filter). Active rig drives Tonight framing.
        </Text>

        <Section theme={planner.theme} title="Rigs" actionLabel="+ Add rig" onAction={() => setAddMode("rig")}>
          {planner.rigs.length === 0 ? (
            <Text style={styles.muted}>No rigs yet. Add a scope + camera combination.</Text>
          ) : (
            planner.rigs.map((rig, index) => {
              const scope = planner.telescopes.find((item) => item.id === rig.telescopeId);
              const camera = planner.cameraList.find((item) => item.id === rig.cameraId);
              const filters = rig.filterIds
                .map((id) => planner.filterList.find((item) => item.id === id)?.name ?? id)
                .join(", ");
              const active = planner.activeRigId === rig.id;
              return (
                <EquipmentRow
                  key={rig.id}
                  theme={planner.theme}
                  divided={index > 0}
                  title={rig.name}
                  detail={[
                    scope?.name ?? rig.telescopeId,
                    camera?.name ?? rig.cameraId,
                    reducerLabel(rig.reducer),
                    filters || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  badge={active ? "Active" : undefined}
                  onPress={() => planner.selectRig(rig.id)}
                  onDelete={() =>
                    confirmDelete("Delete rig", `Remove “${rig.name}”?`, () => planner.deleteRig(rig.id))
                  }
                />
              );
            })
          )}
        </Section>

        <Section theme={planner.theme} title="Scopes" actionLabel="+ Add scope" onAction={() => setAddMode("scope")}>
          {libraryScopes.length === 0 ? (
            <Text style={styles.muted}>No scopes in your library yet.</Text>
          ) : (
            libraryScopes.map((scope, index) => {
              const preferred = planner.telescopeReducers[scope.id];
              return (
                <EquipmentRow
                  key={scope.id}
                  theme={planner.theme}
                  divided={index > 0}
                  title={scope.name}
                  detail={[
                    `${scope.apertureMm} mm · ${scope.focalLengthMm} mm`,
                    preferred ? reducerLabel(preferred) : null,
                    scope.custom ? "custom" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onDelete={() =>
                    confirmDelete("Remove scope", `Remove “${scope.name}” from equipment and any rigs that use it?`, () =>
                      planner.deleteTelescopeFromLibrary(scope.id),
                    )
                  }
                />
              );
            })
          )}
        </Section>

        <Section theme={planner.theme} title="Cameras" actionLabel="+ Add camera" onAction={() => setAddMode("camera")}>
          {libraryCameras.length === 0 ? (
            <Text style={styles.muted}>No cameras in your library yet.</Text>
          ) : (
            libraryCameras.map((camera, index) => (
              <EquipmentRow
                key={camera.id}
                theme={planner.theme}
                divided={index > 0}
                title={camera.name}
                detail={`${camera.sensor} · ${camera.widthPx}×${camera.heightPx}${camera.custom ? " · custom" : ""}`}
                onDelete={() =>
                  confirmDelete(
                    "Remove camera",
                    `Remove “${camera.name}” from equipment and any rigs that use it?`,
                    () => planner.deleteCameraFromLibrary(camera.id),
                  )
                }
              />
            ))
          )}
        </Section>

        <Section theme={planner.theme} title="Filters" actionLabel="+ Add filter" onAction={() => setAddMode("filter")}>
          {libraryFilters.length === 0 ? (
            <Text style={styles.muted}>No filters in your library yet.</Text>
          ) : (
            libraryFilters.map((filter, index) => (
              <EquipmentRow
                key={filter.id}
                theme={planner.theme}
                divided={index > 0}
                title={filter.name}
                detail={`${filterKindLabel(filter.kind)} · ${filter.bandpassNm} nm${filter.custom ? " · custom" : ""}`}
                onDelete={() =>
                  confirmDelete("Remove filter", `Remove “${filter.name}” from equipment and any rigs that use it?`, () =>
                    planner.deleteFilterFromLibrary(filter.id),
                  )
                }
              />
            ))
          )}
        </Section>

        <View style={[styles.card, { gap: 6 }]}>
          <Text style={styles.label}>Tonight active gear</Text>
          <Text style={styles.body}>{planner.telescope?.name ?? "No scope selected"}</Text>
          <Text style={styles.muted}>{planner.camera?.name ?? "No camera selected"}</Text>
          <Text style={styles.muted}>{reducerLabel(planner.reducer)}</Text>
          <Text style={styles.muted}>
            {planner.filterIds.length === 0
              ? "No filter"
              : planner.filterIds
                  .map((id) => planner.filterList.find((item) => item.id === id)?.name ?? id)
                  .join(", ")}
          </Text>
        </View>
      </ScrollView>

      <AddGearModal mode={addMode} onClose={() => setAddMode(null)} />
    </SafeAreaView>
  );
}

function Section({
  theme,
  title,
  actionLabel,
  onAction,
  children,
}: {
  theme: ThemeName;
  title: string;
  actionLabel: string;
  onAction: () => void;
  children: ReactNode;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={[styles.body, { fontWeight: "700", fontSize: 17 }]}>{title}</Text>
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: c.accent, fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      </View>
      <View style={[styles.card, { paddingVertical: 4, paddingHorizontal: 8 }]}>{children}</View>
    </View>
  );
}

function EquipmentRow({
  theme,
  title,
  detail,
  badge,
  divided,
  onPress,
  onDelete,
}: {
  theme: ThemeName;
  title: string;
  detail: string;
  badge?: string;
  divided?: boolean;
  onPress?: () => void;
  onDelete: () => void;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderTopWidth: divided ? StyleSheet.hairlineWidth : 0,
        borderTopColor: c.line,
      }}
    >
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[styles.body, { fontWeight: "600", flexShrink: 1 }]} numberOfLines={1}>
            {title}
          </Text>
          {badge ? (
            <Text style={{ color: c.accent, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>{badge}</Text>
          ) : null}
        </View>
        <Text style={styles.muted} numberOfLines={2}>
          {detail}
        </Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${title}`}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TrashIcon color={c.muted} />
      </Pressable>
    </View>
  );
}

function SearchPicker({
  theme,
  label,
  placeholder,
  selectedLabel,
  selectedDetail,
  open,
  onOpen,
  onClose,
  search,
  onSearchChange,
  options,
  onSelect,
  emptyText,
}: {
  theme: ThemeName;
  label: string;
  placeholder: string;
  selectedLabel: string | null;
  selectedDetail?: string | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  options: { id: string; title: string; detail: string; library?: boolean }[];
  onSelect: (id: string) => void;
  emptyText?: string;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);

  if (!open) {
    return (
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          onPress={onOpen}
          style={[
            styles.card,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              borderColor: selectedLabel ? c.accent : c.line,
            },
          ]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.body}>{selectedLabel ?? `Select ${label.toLowerCase()}…`}</Text>
            {selectedDetail ? <Text style={styles.muted}>{selectedDetail}</Text> : null}
          </View>
          <Text style={{ color: c.accent, fontWeight: "600" }}>{selectedLabel ? "Change" : "Search"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={styles.label}>{label}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={{ color: c.accent, fontWeight: "600" }}>Done</Text>
        </Pressable>
      </View>
      <Field theme={theme} label="Search" value={search} onChangeText={onSearchChange} placeholder={placeholder} autoFocus />
      {options.length === 0 ? <Text style={styles.muted}>{emptyText ?? "No matches."}</Text> : null}
      {options.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => {
            onSelect(item.id);
            onClose();
            onSearchChange("");
          }}
          style={styles.card}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.body, { flex: 1 }]}>{item.title}</Text>
            {item.library ? (
              <Text style={{ color: c.accent, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>Yours</Text>
            ) : null}
          </View>
          <Text style={styles.muted}>{item.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FlattenerPicker({
  theme,
  value,
  open,
  onOpen,
  onClose,
  onSelect,
}: {
  theme: ThemeName;
  value: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (value: number) => void;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);

  if (!open) {
    return (
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Flattener / reducer</Text>
        <Pressable
          onPress={onOpen}
          style={[styles.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }]}
        >
          <Text style={styles.body}>{reducerLabel(value)}</Text>
          <Text style={{ color: c.accent, fontWeight: "600" }}>Change</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={styles.label}>Flattener / reducer</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={{ color: c.accent, fontWeight: "600" }}>Done</Text>
        </Pressable>
      </View>
      {REDUCERS.map((item) => (
        <Pressable
          key={item.value}
          onPress={() => {
            onSelect(item.value);
            onClose();
          }}
          style={[styles.card, value === item.value ? { borderColor: c.accent } : null]}
        >
          <Text style={styles.body}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function AddGearModal({ mode, onClose }: { mode: AddMode; onClose: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [openPicker, setOpenPicker] = useState<PickerKind>(null);
  const [telescopeId, setTelescopeId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [filterId, setFilterId] = useState("");
  const [reducer, setReducer] = useState(1);
  const [aperture, setAperture] = useState("80");
  const [focal, setFocal] = useState("480");
  const [pixel, setPixel] = useState("3.76");
  const [widthPx, setWidthPx] = useState("3008");
  const [heightPx, setHeightPx] = useState("3008");
  const [sensorW, setSensorW] = useState("11.3");
  const [sensorH, setSensorH] = useState("11.3");
  const [filterKind, setFilterKind] = useState<FilterKind>("ha");
  const [bandpass, setBandpass] = useState("7");
  const [transmission, setTransmission] = useState("0.9");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setName("");
    setSearch("");
    setError(null);
    setOpenPicker(mode === "rig" ? "scope" : mode === "filter" ? "filter" : null);
    setTelescopeId(mode === "scope" ? "" : (planner.telescope?.id ?? ""));
    setCameraId(planner.camera?.id ?? "");
    setFilterId(planner.filterIds[0] ?? "");
    setReducer(1);
    setAperture("80");
    setFocal("480");
    setPixel("3.76");
    setWidthPx("3008");
    setHeightPx("3008");
    setSensorW("11.3");
    setSensorH("11.3");
    setFilterKind("ha");
    setBandpass("7");
    setTransmission("0.9");
    // Only reset when the dialog mode opens/changes — not when Tonight gear updates,
    // or a typed rig name gets wiped mid-entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: seed from planner once per mode
  }, [mode]);

  const selectedScope = planner.telescopes.find((item) => item.id === telescopeId) ?? null;
  const selectedCamera = planner.cameraList.find((item) => item.id === cameraId) ?? null;
  const selectedFilter = planner.filterList.find((item) => item.id === filterId) ?? null;

  const scopeOptions = useMemo(() => {
    const ranked = rankLibraryFirst(planner.telescopes, planner.libraryTelescopeIds, search);
    return ranked.map((item) => ({
      id: item.id,
      title: item.name,
      detail: `${item.apertureMm} mm · ${item.focalLengthMm} mm`,
      library: planner.libraryTelescopeIds.includes(item.id),
    }));
  }, [planner.libraryTelescopeIds, planner.telescopes, search]);

  const cameraOptions = useMemo(() => {
    const smartIds = new Set(planner.telescopes.flatMap((item) => (item.smart ? [item.smart.cameraId] : [])));
    const base = planner.cameraList.filter((item) => item.custom || !smartIds.has(item.id));
    const ranked = rankLibraryFirst(base, planner.libraryCameraIds, search);
    return ranked.map((item) => ({
      id: item.id,
      title: item.name,
      detail: `${item.sensor} · ${item.widthPx}×${item.heightPx}`,
      library: planner.libraryCameraIds.includes(item.id),
    }));
  }, [planner.cameraList, planner.libraryCameraIds, planner.telescopes, search]);

  const filterOptions = useMemo(() => {
    const pool =
      selectedScope?.smart?.filterIds.length
        ? planner.filterList.filter((item) => selectedScope.smart?.filterIds.includes(item.id))
        : planner.filterList;
    const ranked = rankLibraryFirst(pool, planner.libraryFilterIds, search);
    return ranked.map((item) => ({
      id: item.id,
      title: item.name,
      detail: `${filterKindLabel(item.kind)} · ${item.bandpassNm} nm`,
      library: planner.libraryFilterIds.includes(item.id),
    }));
  }, [planner.filterList, planner.libraryFilterIds, search, selectedScope]);

  function resetAndClose() {
    setName("");
    setSearch("");
    setError(null);
    setOpenPicker(null);
    onClose();
  }

  function openOnly(next: PickerKind) {
    setSearch("");
    setOpenPicker(next);
  }

  if (!mode) return null;

  const title =
    mode === "rig" ? "Add rig" : mode === "scope" ? "Add scope" : mode === "camera" ? "Add camera" : "Add filter";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={resetAndClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 }}
        onPress={resetAndClose}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            maxHeight: "88%",
            backgroundColor: c.bgRaised,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.line,
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={[styles.body, { fontWeight: "700", fontSize: 18 }]}>{title}</Text>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
            {mode === "rig" ? (
              <>
                <Field
                  theme={planner.theme}
                  label="Rig name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Widefield dual"
                />
                <SearchPicker
                  theme={planner.theme}
                  label="Scope"
                  placeholder="Evostar, Seestar…"
                  selectedLabel={selectedScope?.name ?? null}
                  selectedDetail={
                    selectedScope ? `${selectedScope.apertureMm} mm · ${selectedScope.focalLengthMm} mm` : null
                  }
                  open={openPicker === "scope"}
                  onOpen={() => openOnly("scope")}
                  onClose={() => setOpenPicker(null)}
                  search={search}
                  onSearchChange={setSearch}
                  options={scopeOptions}
                  onSelect={(id) => {
                    const scope = planner.telescopes.find((item) => item.id === id);
                    setTelescopeId(id);
                    if (scope?.smart) {
                      setCameraId(scope.smart.cameraId);
                      setFilterId(scope.smart.filterIds[0] ?? "");
                      setReducer(1);
                    } else {
                      setReducer(planner.telescopeReducers[id] ?? 1);
                    }
                  }}
                />
                {selectedScope && !selectedScope.smart ? (
                  <FlattenerPicker
                    theme={planner.theme}
                    value={reducer}
                    open={openPicker === "flattener"}
                    onOpen={() => openOnly("flattener")}
                    onClose={() => setOpenPicker(null)}
                    onSelect={setReducer}
                  />
                ) : selectedScope?.smart ? (
                  <Text style={styles.muted}>Smart scopes use built-in optics (no separate flattener).</Text>
                ) : null}
                {!selectedScope?.smart ? (
                  <SearchPicker
                    theme={planner.theme}
                    label="Camera"
                    placeholder="ASI533, 2600…"
                    selectedLabel={selectedCamera?.name ?? null}
                    selectedDetail={
                      selectedCamera ? `${selectedCamera.sensor} · ${selectedCamera.widthPx}×${selectedCamera.heightPx}` : null
                    }
                    open={openPicker === "camera"}
                    onOpen={() => openOnly("camera")}
                    onClose={() => setOpenPicker(null)}
                    search={search}
                    onSearchChange={setSearch}
                    options={cameraOptions}
                    onSelect={setCameraId}
                  />
                ) : (
                  <Text style={styles.muted}>Camera is paired with this smart scope.</Text>
                )}
                <SearchPicker
                  theme={planner.theme}
                  label="Filter"
                  placeholder="L-eXtreme, Ha…"
                  selectedLabel={selectedFilter?.name ?? null}
                  selectedDetail={
                    selectedFilter ? `${filterKindLabel(selectedFilter.kind)} · ${selectedFilter.bandpassNm} nm` : "Optional"
                  }
                  open={openPicker === "filter"}
                  onOpen={() => openOnly("filter")}
                  onClose={() => setOpenPicker(null)}
                  search={search}
                  onSearchChange={setSearch}
                  options={filterOptions}
                  onSelect={setFilterId}
                  emptyText="No filters match. Add some under Filters first, or clear search."
                />
              </>
            ) : null}

            {mode === "scope" ? (
              <>
                <SearchPicker
                  theme={planner.theme}
                  label="Scope"
                  placeholder="Seestar, RedCat…"
                  selectedLabel={selectedScope?.name ?? null}
                  selectedDetail={
                    selectedScope ? `${selectedScope.apertureMm} mm · ${selectedScope.focalLengthMm} mm` : null
                  }
                  open={openPicker === "scope"}
                  onOpen={() => openOnly("scope")}
                  onClose={() => setOpenPicker(null)}
                  search={search}
                  onSearchChange={setSearch}
                  options={scopeOptions}
                  onSelect={(id) => {
                    setTelescopeId(id);
                    setName("");
                    const preferred = planner.telescopeReducers[id];
                    setReducer(preferred ?? 1);
                  }}
                />
                {selectedScope ? (
                  selectedScope.smart ? (
                    <Text style={styles.muted}>Smart scopes use built-in optics (no separate flattener).</Text>
                  ) : (
                    <FlattenerPicker
                      theme={planner.theme}
                      value={reducer}
                      open={openPicker === "flattener"}
                      onOpen={() => openOnly("flattener")}
                      onClose={() => setOpenPicker(null)}
                      onSelect={setReducer}
                    />
                  )
                ) : null}
                {!selectedScope ? (
                  <>
                    <Text style={[styles.label, { marginTop: 8 }]}>Or create custom</Text>
                    <Field theme={planner.theme} label="Name" value={name} onChangeText={setName} placeholder="My 80mm" />
                    <Field
                      theme={planner.theme}
                      label="Aperture (mm)"
                      value={aperture}
                      onChangeText={setAperture}
                      keyboardType="decimal-pad"
                    />
                    <Field
                      theme={planner.theme}
                      label="Focal length (mm)"
                      value={focal}
                      onChangeText={setFocal}
                      keyboardType="decimal-pad"
                    />
                    {name.trim() ? (
                      <FlattenerPicker
                        theme={planner.theme}
                        value={reducer}
                        open={openPicker === "flattener"}
                        onOpen={() => openOnly("flattener")}
                        onClose={() => setOpenPicker(null)}
                        onSelect={setReducer}
                      />
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

            {mode === "camera" ? (
              <>
                <SearchPicker
                  theme={planner.theme}
                  label="Catalogue"
                  placeholder="ASI2600…"
                  selectedLabel={null}
                  open={openPicker === "camera"}
                  onOpen={() => openOnly("camera")}
                  onClose={() => setOpenPicker(null)}
                  search={search}
                  onSearchChange={setSearch}
                  options={cameraOptions}
                  onSelect={(id) => {
                    planner.addCameraToLibrary(id);
                    resetAndClose();
                  }}
                />
                <Text style={[styles.label, { marginTop: 8 }]}>Or create custom</Text>
                <Field theme={planner.theme} label="Name" value={name} onChangeText={setName} placeholder="My camera" />
                <Field
                  theme={planner.theme}
                  label="Pixel size (µm)"
                  value={pixel}
                  onChangeText={setPixel}
                  keyboardType="decimal-pad"
                />
                <Field
                  theme={planner.theme}
                  label="Width (px)"
                  value={widthPx}
                  onChangeText={setWidthPx}
                  keyboardType="numeric"
                />
                <Field
                  theme={planner.theme}
                  label="Height (px)"
                  value={heightPx}
                  onChangeText={setHeightPx}
                  keyboardType="numeric"
                />
                <Field
                  theme={planner.theme}
                  label="Sensor width (mm)"
                  value={sensorW}
                  onChangeText={setSensorW}
                  keyboardType="decimal-pad"
                />
                <Field
                  theme={planner.theme}
                  label="Sensor height (mm)"
                  value={sensorH}
                  onChangeText={setSensorH}
                  keyboardType="decimal-pad"
                />
              </>
            ) : null}

            {mode === "filter" ? (
              <>
                <SearchPicker
                  theme={planner.theme}
                  label="Catalogue"
                  placeholder="L-Ultimate, Ha…"
                  selectedLabel={null}
                  open={openPicker === "filter"}
                  onOpen={() => openOnly("filter")}
                  onClose={() => setOpenPicker(null)}
                  search={search}
                  onSearchChange={setSearch}
                  options={filterOptions}
                  onSelect={(id) => {
                    planner.addFilterToLibrary(id);
                    resetAndClose();
                  }}
                />
                <Text style={[styles.label, { marginTop: 8 }]}>Or create custom</Text>
                <Field theme={planner.theme} label="Name" value={name} onChangeText={setName} placeholder="My Ha 7nm" />
                <Text style={styles.label}>Kind</Text>
                <View style={{ gap: 8 }}>
                  {FILTER_KINDS.map((kind) => (
                    <Pressable
                      key={kind}
                      onPress={() => setFilterKind(kind)}
                      style={[styles.card, filterKind === kind ? { borderColor: c.accent } : null]}
                    >
                      <Text style={styles.body}>{filterKindLabel(kind)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Field
                  theme={planner.theme}
                  label="Bandpass (nm)"
                  value={bandpass}
                  onChangeText={setBandpass}
                  keyboardType="decimal-pad"
                />
                <Field
                  theme={planner.theme}
                  label="Transmission (0–1)"
                  value={transmission}
                  onChangeText={setTransmission}
                  keyboardType="decimal-pad"
                />
              </>
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.muted}>{error}</Text> : null}

          <PrimaryButton
            theme={planner.theme}
            title={
              mode === "rig"
                ? "Save rig"
                : mode === "scope"
                  ? selectedScope
                    ? "Add scope"
                    : "Save custom scope"
                  : mode === "camera"
                    ? "Save custom camera"
                    : "Save custom filter"
            }
            onPress={() => {
              if (mode === "rig") {
                if (!telescopeId || !cameraId) {
                  setError("Pick a scope and camera.");
                  return;
                }
                const rig = planner.createRig({
                  name,
                  telescopeId,
                  cameraId,
                  reducer,
                  filterIds: filterId ? [filterId] : [],
                });
                if (!rig) {
                  setError("Could not create that rig.");
                  return;
                }
                planner.selectRig(rig.id);
                resetAndClose();
                return;
              }
              if (mode === "scope") {
                if (selectedScope) {
                  planner.addTelescopeToLibrary(
                    selectedScope.id,
                    selectedScope.smart ? undefined : reducer,
                  );
                  resetAndClose();
                  return;
                }
                const apertureMm = Number(aperture);
                const focalLengthMm = Number(focal);
                if (!name.trim() || !(apertureMm > 0) || !(focalLengthMm > 0)) {
                  setError("Pick a catalogue scope, or enter a name, aperture, and focal length.");
                  return;
                }
                planner.addCustomTelescope({
                  name,
                  apertureMm,
                  focalLengthMm,
                  preferredReducer: reducer,
                });
                resetAndClose();
                return;
              }
              if (mode === "camera") {
                const pixelSizeUm = Number(pixel);
                const width = Number(widthPx);
                const height = Number(heightPx);
                const sensorWidthMm = Number(sensorW);
                const sensorHeightMm = Number(sensorH);
                if (
                  !name.trim() ||
                  !(pixelSizeUm > 0) ||
                  !(width > 0) ||
                  !(height > 0) ||
                  !(sensorWidthMm > 0) ||
                  !(sensorHeightMm > 0)
                ) {
                  setError("Fill in name and sensor numbers.");
                  return;
                }
                planner.addCustomCamera({
                  name,
                  pixelSizeUm,
                  widthPx: Math.round(width),
                  heightPx: Math.round(height),
                  sensorWidthMm,
                  sensorHeightMm,
                  sensor: "colour",
                  readNoiseE: 1.5,
                });
                resetAndClose();
                return;
              }
              const bandpassNm = Number(bandpass);
              const transmissionValue = Number(transmission);
              if (!name.trim() || !(bandpassNm > 0) || !(transmissionValue > 0) || transmissionValue > 1) {
                setError("Enter a name, bandpass, and transmission between 0 and 1.");
                return;
              }
              planner.addCustomFilter({
                name,
                kind: filterKind,
                bandpassNm,
                transmission: transmissionValue,
              });
              resetAndClose();
            }}
          />
          <GhostButton theme={planner.theme} title="Cancel" onPress={resetAndClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12zM10 11v6M14 11v6"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
