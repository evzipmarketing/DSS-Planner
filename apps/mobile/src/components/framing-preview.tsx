import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { centerAfterSensorDrag, equatorialToPixel } from "@dss/core";
import { fetchSkyPlate } from "@/lib/api";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";
import { useThemeStyles } from "./ui";

const PLATE = 420;
const STAGE = 280;
const ROTATE_STEPS = [-45, -5, 0, 5, 45] as const;

export function FramingPreview() {
  const { selected, pointing, setPointing, optics, theme } = usePlannerState();
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointingRef = useRef(pointing);
  pointingRef.current = pointing;

  const requestKey = useMemo(() => {
    if (!pointing || !optics) return null;
    return {
      ra: pointing.raDeg,
      dec: pointing.decDeg,
      fov: optics.imageFovDeg,
      size: PLATE,
    };
  }, [pointing, optics]);

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void fetchSkyPlate(requestKey)
      .then((plate) => {
        if (cancelled) return;
        setUri(plate.uri);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey?.ra, requestKey?.dec, requestKey?.fov]);

  const rotateHandle = useMemo(() => {
    let startAngle = 0;
    let startRotation = 0;
    let centerX = 0;
    let centerY = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const current = pointingRef.current;
        if (!current) return;
        centerX = event.nativeEvent.pageX - event.nativeEvent.locationX + STAGE / 2;
        centerY = event.nativeEvent.pageY - event.nativeEvent.locationY + STAGE / 2;
        startAngle = (Math.atan2(event.nativeEvent.pageY - centerY, event.nativeEvent.pageX - centerX) * 180) / Math.PI;
        startRotation = current.rotationDeg;
      },
      onPanResponderMove: (event) => {
        const current = pointingRef.current;
        if (!current) return;
        const degrees = (Math.atan2(event.nativeEvent.pageY - centerY, event.nativeEvent.pageX - centerX) * 180) / Math.PI;
        setPointing({
          ...current,
          rotationDeg: startRotation + degrees - startAngle,
        });
      },
    });
  }, [setPointing]);

  if (!selected || !pointing || !optics) {
    return <Text style={styles.muted}>Choose a target and a rig to preview the frame.</Text>;
  }

  const virtual = {
    raDeg: pointing.raDeg,
    decDeg: pointing.decDeg,
    fovDeg: optics.imageFovDeg,
    widthPx: 1000,
    heightPx: 1000,
  };
  const objectPoint = equatorialToPixel(virtual, selected.raDeg, selected.decDeg);
  const major = selected.majorArcmin == null ? 0 : ((selected.majorArcmin / 60) / optics.imageFovDeg) * STAGE;
  const minor =
    selected.minorArcmin == null ? major : ((selected.minorArcmin / 60) / optics.imageFovDeg) * STAGE;
  const width = (optics.field.widthDeg / optics.imageFovDeg) * STAGE;
  const height = (optics.field.heightDeg / optics.imageFovDeg) * STAGE;

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_event, gesture) => {
      setOffset({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_event, gesture) => {
      const current = pointingRef.current;
      if (!current || !optics) return;
      const next = centerAfterSensorDrag(
        {
          raDeg: current.raDeg,
          decDeg: current.decDeg,
          fovDeg: optics.imageFovDeg,
          widthPx: STAGE,
          heightPx: STAGE,
        },
        gesture.dx,
        gesture.dy,
      );
      setPointing({
        ...current,
        raDeg: next.raDeg,
        decDeg: Math.min(85, Math.max(-85, next.decDeg)),
      });
      setOffset({ x: 0, y: 0 });
    },
  });

  function nudgeRotation(delta: number) {
    const current = pointingRef.current;
    if (!current) return;
    if (delta === 0) {
      setPointing({ ...current, rotationDeg: 0 });
      return;
    }
    setPointing({ ...current, rotationDeg: current.rotationDeg + delta });
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={[frameStyles.stage, { backgroundColor: c.bgSunken, borderColor: c.line }]}>
        {uri && !failed ? <Image source={{ uri }} style={frameStyles.plate} /> : null}
        {loading ? <ActivityIndicator color={c.accent} style={StyleSheet.absoluteFill} /> : null}
        {major > 0 ? (
          <View
            pointerEvents="none"
            style={[
              frameStyles.ellipse,
              {
                borderColor: c.accent,
                width: Math.max(8, minor),
                height: Math.max(8, major),
                left: (objectPoint.x / 1000) * STAGE - Math.max(8, minor) / 2,
                top: (objectPoint.y / 1000) * STAGE - Math.max(8, major) / 2,
              },
            ]}
          />
        ) : null}
        <View
          {...pan.panHandlers}
          style={[
            frameStyles.sensor,
            {
              width,
              height,
              left: STAGE / 2 - width / 2 + offset.x,
              top: STAGE / 2 - height / 2 + offset.y,
              borderColor: c.accent,
              transform: [{ rotate: `${pointing.rotationDeg}deg` }],
            },
          ]}
        >
          <View
            {...rotateHandle.panHandlers}
            hitSlop={12}
            style={[
              frameStyles.handle,
              {
                backgroundColor: c.accent,
                borderColor: c.bgRaised,
                left: width / 2 - 9,
                top: -10,
              },
            ]}
          />
        </View>
        <Text style={[frameStyles.compass, { color: c.accent, top: 6, left: STAGE / 2 - 6 }]}>N</Text>
        <Text style={[frameStyles.compass, { color: c.accent, top: STAGE / 2 - 8, left: 8 }]}>E</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {ROTATE_STEPS.map((step) => (
          <Pressable
            key={step}
            onPress={() => nudgeRotation(step)}
            style={{
              minWidth: 48,
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.lineStrong,
              backgroundColor: c.bgRaised,
              alignItems: "center",
            }}
          >
            <Text style={styles.body}>{step > 0 ? `+${step}` : String(step)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const frameStyles = StyleSheet.create({
  stage: {
    width: STAGE,
    height: STAGE,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignSelf: "center",
  },
  plate: { ...StyleSheet.absoluteFill, width: STAGE, height: STAGE, borderRadius: 12 },
  sensor: {
    position: "absolute",
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  handle: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  ellipse: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 999,
  },
  compass: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "600",
  },
});
