import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { Site } from "@dss/core";
import { locations as presetLocations } from "@dss/data";
import { Field, GhostButton, PrimaryButton, useThemeStyles } from "@/components/ui";
import { fetchGeocode } from "@/lib/api";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function LocationsScreen() {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [addOpen, setAddOpen] = useState(false);

  function confirmDelete(site: Site) {
    Alert.alert("Delete location", `Remove “${site.name}”?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => planner.deleteSavedSite(site.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.subtitle}>
          Save several observing sites. Tap one to make it active for Tonight altitude, moon, and weather.
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={[styles.body, { fontWeight: "700", fontSize: 17 }]}>Saved locations</Text>
          <Pressable onPress={() => setAddOpen(true)} hitSlop={8}>
            <Text style={{ color: c.accent, fontWeight: "600" }}>+ Add location</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { paddingVertical: 4, paddingHorizontal: 8 }]}>
          {planner.savedSites.length === 0 ? (
            <Text style={[styles.muted, { paddingVertical: 10, paddingHorizontal: 4 }]}>
              No saved locations yet. Add a search result, preset, or coordinates.
            </Text>
          ) : (
            planner.savedSites.map((site, index) => {
              const active = planner.activeSiteId === site.id || planner.site.id === site.id;
              return (
                <View
                  key={site.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                    borderTopWidth: index > 0 ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: c.line,
                  }}
                >
                  <Pressable onPress={() => planner.selectSavedSite(site.id)} style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.body, { fontWeight: "600", flexShrink: 1 }]} numberOfLines={1}>
                        {site.name}
                      </Text>
                      {active ? (
                        <Text style={{ color: c.accent, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                          Active
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.muted} numberOfLines={2}>
                      {site.latitude.toFixed(3)}°, {site.longitude.toFixed(3)}° · {site.timezone}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(site)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${site.name}`}
                    hitSlop={8}
                    style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                  >
                    <TrashIcon color={c.muted} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.card, { gap: 6 }]}>
          <Text style={styles.label}>Tonight active location</Text>
          <Text style={styles.body}>{planner.site.name}</Text>
          <Text style={styles.muted}>
            {planner.site.latitude.toFixed(3)}°, {planner.site.longitude.toFixed(3)}° · {planner.site.timezone}
          </Text>
        </View>
      </ScrollView>

      <AddLocationModal open={addOpen} onClose={() => setAddOpen(false)} />
    </SafeAreaView>
  );
}

function AddLocationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const planner = usePlannerState();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Site[]>([]);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setName("");
    setLat("");
    setLon("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      void fetchGeocode(query.trim())
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, query]);

  const presets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? presetLocations.filter((item) => item.name.toLowerCase().includes(q)) : presetLocations;
    return pool.slice(0, 12);
  }, [query]);

  function useSite(site: Site, activate: boolean) {
    if (activate) planner.chooseSite(site);
    else planner.saveSite(site);
    onClose();
  }

  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 }} onPress={onClose}>
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
          <Text style={[styles.body, { fontWeight: "700", fontSize: 18 }]}>Add location</Text>
          <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 12 }}>
            <Field theme={planner.theme} label="Search" value={query} onChangeText={setQuery} placeholder="Pune, Hanle…" />

            {results.length > 0 ? (
              <>
                <Text style={styles.label}>Search results</Text>
                {results.map((result) => (
                  <Pressable
                    key={`${result.latitude}-${result.longitude}-${result.name}`}
                    style={styles.card}
                    onPress={() => useSite(result, true)}
                  >
                    <Text style={styles.body}>{result.name}</Text>
                    <Text style={styles.muted}>{result.timezone}</Text>
                  </Pressable>
                ))}
              </>
            ) : null}

            <Text style={styles.label}>Presets</Text>
            {presets.map((item) => (
              <Pressable key={item.id} style={styles.card} onPress={() => useSite(item, true)}>
                <Text style={styles.body}>{item.name}</Text>
                <Text style={styles.muted}>
                  {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                </Text>
              </Pressable>
            ))}

            <Text style={[styles.label, { marginTop: 4 }]}>Or enter coordinates</Text>
            <Field theme={planner.theme} label="Name" value={name} onChangeText={setName} placeholder="Backyard" autoCapitalize="words" />
            <Field theme={planner.theme} label="Latitude" value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
            <Field theme={planner.theme} label="Longitude" value={lon} onChangeText={setLon} keyboardType="decimal-pad" />
            {error ? <Text style={styles.muted}>{error}</Text> : null}
          </ScrollView>

          <PrimaryButton
            theme={planner.theme}
            title="Save coordinates"
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
              useSite(
                {
                  id: `site-${Date.now()}`,
                  name: name.trim() || "Custom coordinates",
                  latitude,
                  longitude,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                },
                true,
              );
            }}
          />
          <GhostButton theme={planner.theme} title="Cancel" onPress={onClose} />
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
