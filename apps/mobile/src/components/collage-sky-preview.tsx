import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line } from "react-native-svg";
import {
  collagePlateFovDeg,
  equatorialToPixel,
  formatDeclination,
  formatRightAscension,
  type CollagePlan,
  type DeepSkyObject,
} from "@dss/core";
import { fetchSkyPlate } from "@/lib/api";
import { colors, type ThemeName } from "@/theme/tokens";
import { useThemeStyles } from "./ui";

const PLATE = 420;
const STAGE = 300;
const VIRT = 1000;

type Props = {
  plan: CollagePlan;
  objectsById: Map<string, DeepSkyObject>;
  colors: Map<string, string>;
  theme: ThemeName;
  showNames?: boolean;
  /** Optional stick-figure edges as star/target id pairs (e.g. asterisms). */
  edges?: ReadonlyArray<readonly [string, string]>;
  /** Override DSS plate FOV (deg). Defaults to collagePlateFovDeg(plan). */
  plateFovDeg?: number;
};

function shortLabel(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 18) return trimmed;
  return `${trimmed.slice(0, 16)}…`;
}

export function CollageSkyPreview({
  plan,
  objectsById,
  colors: colorById,
  theme,
  showNames = true,
  edges = [],
  plateFovDeg,
}: Props) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const plateFov = plateFovDeg ?? collagePlateFovDeg(plan);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setUri(null);
    void fetchSkyPlate({ ra: plan.center.raDeg, dec: plan.center.decDeg, fov: plateFov, size: PLATE })
      .then((plate) => {
        if (!cancelled) setUri(plate.uri);
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
  }, [plan.center.raDeg, plan.center.decDeg, plateFov]);

  const projection = {
    raDeg: plan.center.raDeg,
    decDeg: plan.center.decDeg,
    fovDeg: plateFov,
    widthPx: VIRT,
    heightPx: VIRT,
  };

  const frameW = (plan.frameWidthDeg / plateFov) * STAGE;
  const frameH = (plan.frameHeightDeg / plateFov) * STAGE;
  const requiredW = (plan.requiredWidthDeg / plateFov) * STAGE;
  const requiredH = (plan.requiredHeightDeg / plateFov) * STAGE;

  const markers = plan.targets.map((target) => {
    const object = objectsById.get(target.id);
    const point = equatorialToPixel(projection, target.raDeg, target.decDeg);
    const major =
      object?.majorArcmin == null ? 0 : ((object.majorArcmin / 60) / plateFov) * STAGE;
    const minor =
      object?.minorArcmin == null ? major : ((object.minorArcmin / 60) / plateFov) * STAGE;
    return {
      id: target.id,
      name: shortLabel(target.name),
      x: (point.x / VIRT) * STAGE,
      y: (point.y / VIRT) * STAGE,
      major,
      minor,
      color: colorById.get(target.id) ?? c.accent,
    };
  });

  return (
    <View style={{ gap: 8 }}>
      <View style={[local.stage, { borderColor: c.line, backgroundColor: c.bgSunken }]}>
        {/* Plate sits in its own layer so Android Image cannot cover overlays. */}
        <View style={local.plateLayer} pointerEvents="none">
          {uri && !failed ? (
            <Image
              key={`collage-plate-${plateFov.toFixed(4)}-${plan.center.raDeg.toFixed(4)}`}
              source={{ uri }}
              style={local.plate}
              resizeMode="stretch"
              accessibilityLabel="DSS2 colour sky plate"
            />
          ) : null}
          {loading ? <ActivityIndicator color={c.accent} style={StyleSheet.absoluteFillObject} /> : null}
          {!loading && failed ? (
            <View style={local.placeholder}>
              <Text style={styles.muted}>Sky plate unavailable</Text>
            </View>
          ) : null}
        </View>

        <View style={local.boxLayer} pointerEvents="none">
          <View
            style={[
              local.box,
              {
                width: Math.max(requiredW, 4),
                height: Math.max(requiredH, 4),
                left: STAGE / 2 - Math.max(requiredW, 4) / 2,
                top: STAGE / 2 - Math.max(requiredH, 4) / 2,
                borderColor: c.muted,
                borderStyle: "dashed",
                transform: [{ rotate: `${plan.rotationDeg}deg` }],
              },
            ]}
          />
          <View
            style={[
              local.box,
              {
                width: Math.max(frameW, 4),
                height: Math.max(frameH, 4),
                left: STAGE / 2 - Math.max(frameW, 4) / 2,
                top: STAGE / 2 - Math.max(frameH, 4) / 2,
                borderColor: c.accent,
                borderStyle: "solid",
                transform: [{ rotate: `${plan.rotationDeg}deg` }],
              },
            ]}
          />
        </View>

        {/* Elevation keeps SVG above Image on Android after the plate loads. */}
        <View style={local.overlayLayer} pointerEvents="none">
          <Svg width={STAGE} height={STAGE}>
            {edges.map(([fromId, toId]) => {
              const from = markers.find((marker) => marker.id === fromId);
              const to = markers.find((marker) => marker.id === toId);
              if (!from || !to) return null;
              return (
                <G key={`${fromId}-${toId}`}>
                  <Line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="rgba(0,0,0,0.85)"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                  <Line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#ffffff"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </G>
              );
            })}
            {markers.map((marker) =>
              marker.major > 0 ? (
                <Circle
                  key={`halo-${marker.id}`}
                  cx={marker.x}
                  cy={marker.y}
                  r={Math.max(marker.major, marker.minor, 8) / 2}
                  fill="none"
                  stroke={marker.color}
                  strokeWidth={1.25}
                  strokeDasharray="3 2"
                  opacity={0.9}
                />
              ) : null,
            )}
            {markers.map((marker) => (
              <Circle
                key={`dot-${marker.id}`}
                cx={marker.x}
                cy={marker.y}
                r={5}
                fill={marker.color}
                stroke="#000000"
                strokeWidth={1}
              />
            ))}
          </Svg>
        </View>

        {showNames
          ? markers.map((marker) => {
              const labelLeft = Math.min(STAGE - 112, Math.max(4, marker.x + 8));
              const labelTop = Math.min(STAGE - 22, Math.max(4, marker.y - 18));
              return (
                <Text
                  key={`label-${marker.id}`}
                  pointerEvents="none"
                  numberOfLines={1}
                  style={[
                    local.label,
                    {
                      left: labelLeft,
                      top: labelTop,
                      color: "#ffffff",
                      backgroundColor: "rgba(0,0,0,0.55)",
                      borderColor: marker.color,
                    },
                  ]}
                >
                  {marker.name}
                </Text>
              );
            })
          : null}

        <Text style={[local.compass, { top: 8, left: STAGE / 2 - 6, color: "#ffffff" }]}>N</Text>
        <Text style={[local.compass, { top: STAGE / 2 - 8, left: 8, color: "#ffffff" }]}>E</Text>
      </View>
      <Text style={styles.muted}>
        FOV {plan.frameWidthDeg.toFixed(2)}° × {plan.frameHeightDeg.toFixed(2)}° ·{" "}
        {formatRightAscension(plan.center.raDeg)} · {formatDeclination(plan.center.decDeg)} · rot{" "}
        {plan.rotationDeg.toFixed(0)}°
      </Text>
    </View>
  );
}

const local = StyleSheet.create({
  stage: {
    width: STAGE,
    height: STAGE,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignSelf: "center",
  },
  plateLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  boxLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    elevation: 5,
  },
  plate: {
    width: STAGE,
    height: STAGE,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    position: "absolute",
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  label: {
    position: "absolute",
    zIndex: 6,
    elevation: 6,
    maxWidth: 108,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
  },
  compass: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "700",
    zIndex: 6,
    elevation: 6,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
