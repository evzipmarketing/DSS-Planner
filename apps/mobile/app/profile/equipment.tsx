import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { Camera, Telescope } from "@dss/core";
import { Field, GhostButton, PrimaryButton, useThemeStyles } from "@/components/ui";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

type AddMode = "rig" | "scope" | "camera" | null;

export default function EquipmentScreen() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
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
          Build named rigs (scope + camera). Active rig drives Tonight framing. Remove gear with the trash icon.
        </Text>

        <Section
          theme={planner.theme}
          title="Rigs"
          actionLabel="+ Add rig"
          onAction={() => setAddMode("rig")}
        >
          {planner.rigs.length === 0 ? (
            <Text style={styles.muted}>No rigs yet. Add a scope + camera combination.</Text>
          ) : (
            planner.rigs.map((rig, index) => {
              const scope = planner.telescopes.find((item) => item.id === rig.telescopeId);
              const camera = planner.cameraList.find((item) => item.id === rig.cameraId);
              const active = planner.activeRigId === rig.id;
              return (
                <EquipmentRow
                  key={rig.id}
                  theme={planner.theme}
                  divided={index > 0}
                  title={rig.name}
                  detail={`${scope?.name ?? rig.telescopeId} · ${camera?.name ?? rig.cameraId}${
                    rig.reducer !== 1 ? ` · ${rig.reducer}× reducer` : ""
                  }`}
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

        <Section
          theme={planner.theme}
          title="Scopes"
          actionLabel="+ Add scope"
          onAction={() => setAddMode("scope")}
        >
          {libraryScopes.length === 0 ? (
            <Text style={styles.muted}>No scopes in your library yet.</Text>
          ) : (
            libraryScopes.map((scope, index) => (
              <EquipmentRow
                key={scope.id}
                theme={planner.theme}
                divided={index > 0}
                title={scope.name}
                detail={`${scope.apertureMm} mm · ${scope.focalLengthMm} mm${scope.custom ? " · custom" : ""}`}
                onDelete={() =>
                  confirmDelete("Remove scope", `Remove “${scope.name}” from equipment and any rigs that use it?`, () =>
                    planner.deleteTelescopeFromLibrary(scope.id),
                  )
                }
              />
            ))
          )}
        </Section>

        <Section
          theme={planner.theme}
          title="Cameras"
          actionLabel="+ Add camera"
          onAction={() => setAddMode("camera")}
        >
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
                  confirmDelete("Remove camera", `Remove “${camera.name}” from equipment and any rigs that use it?`, () =>
                    planner.deleteCameraFromLibrary(camera.id),
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
  theme: "dark" | "night";
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
  theme: "dark" | "night";
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

function AddGearModal({ mode, onClose }: { mode: AddMode; onClose: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [telescopeId, setTelescopeId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [aperture, setAperture] = useState("80");
  const [focal, setFocal] = useState("480");
  const [pixel, setPixel] = useState("3.76");
  const [widthPx, setWidthPx] = useState("3008");
  const [heightPx, setHeightPx] = useState("3008");
  const [sensorW, setSensorW] = useState("11.3");
  const [sensorH, setSensorH] = useState("11.3");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setName("");
    setSearch("");
    setError(null);
    setTelescopeId(planner.telescope?.id ?? "");
    setCameraId(planner.camera?.id ?? "");
    setAperture("80");
    setFocal("480");
    setPixel("3.76");
    setWidthPx("3008");
    setHeightPx("3008");
    setSensorW("11.3");
    setSensorH("11.3");
  }, [mode, planner.telescope?.id, planner.camera?.id]);

  const scopeOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const pool = query
      ? planner.telescopes.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(query))
      : planner.telescopes;
    return [...pool].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
  }, [planner.telescopes, search]);

  const cameraOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const smartIds = new Set(planner.telescopes.flatMap((item) => (item.smart ? [item.smart.cameraId] : [])));
    const base = planner.cameraList.filter((item) => item.custom || !smartIds.has(item.id));
    const pool = query ? base.filter((item) => item.name.toLowerCase().includes(query)) : base;
    return [...pool].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
  }, [planner.cameraList, planner.telescopes, search]);

  const selectedScope = planner.telescopes.find((item) => item.id === telescopeId) ?? null;

  function resetAndClose() {
    setName("");
    setSearch("");
    setError(null);
    onClose();
  }

  if (!mode) return null;

  const title = mode === "rig" ? "Add rig" : mode === "scope" ? "Add scope" : "Add camera";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={resetAndClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 }} onPress={resetAndClose}>
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
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12 }}>
            {mode === "rig" ? (
              <>
                <Field theme={planner.theme} label="Rig name" value={name} onChangeText={setName} placeholder="Widefield dual" />
                <Field theme={planner.theme} label="Search gear" value={search} onChangeText={setSearch} placeholder="Evostar, ASI533…" />
                <Text style={styles.label}>Scope</Text>
                {scopeOptions.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setTelescopeId(item.id);
                      if (item.smart) setCameraId(item.smart.cameraId);
                    }}
                    style={[styles.card, telescopeId === item.id ? { borderColor: c.accent } : null]}
                  >
                    <Text style={styles.body}>{item.name}</Text>
                    <Text style={styles.muted}>
                      {item.apertureMm} mm · {item.focalLengthMm} mm
                    </Text>
                  </Pressable>
                ))}
                {!selectedScope?.smart ? (
                  <>
                    <Text style={styles.label}>Camera</Text>
                    {cameraOptions.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setCameraId(item.id)}
                        style={[styles.card, cameraId === item.id ? { borderColor: c.accent } : null]}
                      >
                        <Text style={styles.body}>{item.name}</Text>
                        <Text style={styles.muted}>
                          {item.sensor} · {item.widthPx}×{item.heightPx}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <Text style={styles.muted}>Camera is paired with this smart scope.</Text>
                )}
              </>
            ) : null}

            {mode === "scope" ? (
              <>
                <Field theme={planner.theme} label="Search catalogue" value={search} onChangeText={setSearch} placeholder="Seestar, RedCat…" />
                {scopeOptions.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      planner.addTelescopeToLibrary(item.id);
                      resetAndClose();
                    }}
                    style={styles.card}
                  >
                    <Text style={styles.body}>{item.name}</Text>
                    <Text style={styles.muted}>
                      {item.apertureMm} mm · {item.focalLengthMm} mm
                    </Text>
                  </Pressable>
                ))}
                <Text style={[styles.label, { marginTop: 8 }]}>Or create custom</Text>
                <Field theme={planner.theme} label="Name" value={name} onChangeText={setName} placeholder="My 80mm" />
                <Field theme={planner.theme} label="Aperture (mm)" value={aperture} onChangeText={setAperture} keyboardType="decimal-pad" />
                <Field theme={planner.theme} label="Focal length (mm)" value={focal} onChangeText={setFocal} keyboardType="decimal-pad" />
              </>
            ) : null}

            {mode === "camera" ? (
              <>
                <Field theme={planner.theme} label="Search catalogue" value={search} onChangeText={setSearch} placeholder="ASI2600…" />
                {cameraOptions.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      planner.addCameraToLibrary(item.id);
                      resetAndClose();
                    }}
                    style={styles.card}
                  >
                    <Text style={styles.body}>{item.name}</Text>
                    <Text style={styles.muted}>
                      {item.sensor} · {item.widthPx}×{item.heightPx}
                    </Text>
                  </Pressable>
                ))}
                <Text style={[styles.label, { marginTop: 8 }]}>Or create custom</Text>
                <Field theme={planner.theme} label="Name" value={name} onChangeText={setName} placeholder="My camera" />
                <Field theme={planner.theme} label="Pixel size (µm)" value={pixel} onChangeText={setPixel} keyboardType="decimal-pad" />
                <Field theme={planner.theme} label="Width (px)" value={widthPx} onChangeText={setWidthPx} keyboardType="numeric" />
                <Field theme={planner.theme} label="Height (px)" value={heightPx} onChangeText={setHeightPx} keyboardType="numeric" />
                <Field theme={planner.theme} label="Sensor width (mm)" value={sensorW} onChangeText={setSensorW} keyboardType="decimal-pad" />
                <Field theme={planner.theme} label="Sensor height (mm)" value={sensorH} onChangeText={setSensorH} keyboardType="decimal-pad" />
              </>
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.muted}>{error}</Text> : null}

          <PrimaryButton
            theme={planner.theme}
            title={mode === "rig" ? "Save rig" : mode === "scope" ? "Save custom scope" : "Save custom camera"}
            onPress={() => {
              if (mode === "rig") {
                if (!telescopeId || !cameraId) {
                  setError("Pick a scope and camera.");
                  return;
                }
                const rig = planner.createRig({ name, telescopeId, cameraId });
                if (!rig) {
                  setError("Could not create that rig.");
                  return;
                }
                planner.selectRig(rig.id);
                resetAndClose();
                return;
              }
              if (mode === "scope") {
                const apertureMm = Number(aperture);
                const focalLengthMm = Number(focal);
                if (!name.trim() || !(apertureMm > 0) || !(focalLengthMm > 0)) {
                  setError("Enter a name, aperture, and focal length.");
                  return;
                }
                planner.addCustomTelescope({ name, apertureMm, focalLengthMm });
                resetAndClose();
                return;
              }
              const pixelSizeUm = Number(pixel);
              const width = Number(widthPx);
              const height = Number(heightPx);
              const sensorWidthMm = Number(sensorW);
              const sensorHeightMm = Number(sensorH);
              if (!name.trim() || !(pixelSizeUm > 0) || !(width > 0) || !(height > 0) || !(sensorWidthMm > 0) || !(sensorHeightMm > 0)) {
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
