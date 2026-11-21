import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Magnetometer } from "expo-sensors";
import { horizontalCoords, objectTitle } from "@dss/core";
import { OfflineBanner, useThemeStyles } from "@/components/ui";
import { useNetworkOnline } from "@/hooks/use-network";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function SkyScreen() {
  const planner = usePlannerState();
  const online = useNetworkOnline();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [heading, setHeading] = useState<number | null>(null);
  const [sensorError, setSensorError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    void (async () => {
      const available = await Magnetometer.isAvailableAsync();
      if (!available) {
        setSensorError("Compass sensors are unavailable on this device.");
        return;
      }
      Magnetometer.setUpdateInterval(200);
      subscription = Magnetometer.addListener((data) => {
        const angle = (Math.atan2(data.y, data.x) * 180) / Math.PI;
        setHeading(((angle + 360) % 360));
      });
    })();
    return () => subscription?.remove();
  }, []);

  const target = planner.selected;
  const coords = useMemo(() => {
    if (!target || !planner.locationReady) return null;
    return horizontalCoords(target.raDeg, target.decDeg, new Date(), planner.site);
  }, [target, planner.locationReady, planner.site]);

  const delta = coords && heading != null ? shortestTurn(heading, coords.azimuthDeg) : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={{ padding: 16, gap: 16 }}>
        <Text style={styles.title}>Sky</Text>
        <OfflineBanner theme={planner.theme} online={online} />
        {!planner.locationReady ? <Text style={styles.muted}>Set a location first.</Text> : null}
        {!target ? <Text style={styles.muted}>Select a target from Tonight to get heading cues.</Text> : null}
        {sensorError ? <Text style={styles.muted}>{sensorError}</Text> : null}

        <View style={[styles.card, { alignItems: "center", gap: 12, paddingVertical: 28 }]}>
          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              borderWidth: 2,
              borderColor: c.lineStrong,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 4,
                height: 90,
                backgroundColor: c.accent,
                borderRadius: 2,
                transform: [{ rotate: `${delta ?? 0}deg` }],
              }}
            />
            <Text style={[styles.accent, { position: "absolute", top: 12 }]}>N</Text>
          </View>
          {target && coords ? (
            <>
              <Text style={[styles.body, { fontWeight: "600" }]}>{objectTitle(target)}</Text>
              <Text style={styles.muted}>
                Alt {coords.altitudeDeg.toFixed(0)}° · Az {coords.azimuthDeg.toFixed(0)}°
              </Text>
              {heading != null ? <Text style={styles.muted}>Device heading {heading.toFixed(0)}°</Text> : null}
              {delta != null ? (
                <Text style={[styles.body, { color: c.accent }]}>
                  {Math.abs(delta) < 8
                    ? coords.altitudeDeg < 0
                      ? "On bearing, but below the horizon"
                      : "On target bearing"
                    : delta > 0
                      ? `Turn right ${Math.abs(delta).toFixed(0)}°`
                      : `Turn left ${Math.abs(delta).toFixed(0)}°`}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>Waiting for a selected target…</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function shortestTurn(fromDeg: number, toDeg: number): number {
  let delta = ((toDeg - fromDeg + 540) % 360) - 180;
  return delta;
}
