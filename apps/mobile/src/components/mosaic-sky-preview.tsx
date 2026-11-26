import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Polygon, Text as SvgText } from "react-native-svg";
import {
  centerAfterSensorDrag,
  clampMosaicZoom,
  equatorialToPixel,
  formatDeclination,
  formatRightAscension,
  mosaicPlateFovDeg,
  type DeepSkyObject,
  type MosaicPlan,
  type MosaicRaDec,
} from "@dss/core";
import { fetchSkyPlate } from "@/lib/api";
import { colors, type ThemeName } from "@/theme/tokens";
import { useThemeStyles } from "./ui";

const PLATE = 420;
const STAGE = 300;
const VIRT = 1000;

type Props = {
  object: DeepSkyObject;
  plan: MosaicPlan;
  center: MosaicRaDec;
  onCenterChange: (next: MosaicRaDec) => void;
  rotationDeg: number;
  onRotationChange: (deg: number) => void;
  zoom?: number;
  theme: ThemeName;
};

export function MosaicSkyPreview({
  object,
  plan,
  center,
  onCenterChange,
  rotationDeg,
  onRotationChange,
  zoom = 1,
  theme,
}: Props) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const centerRef = useRef(center);
  const rotationRef = useRef(rotationDeg);
  const planRef = useRef(plan);
  const plateFovRef = useRef(1);
  const viewScaleRef = useRef(1);
  centerRef.current = center;
  rotationRef.current = rotationDeg;
  planRef.current = plan;

  const zoomFactor = clampMosaicZoom(zoom);
  // Zoom out: fetch a wider plate so sky still fills the stage.
  // Zoom in: keep the fit plate and scale the view (instant, no refetch).
  const plateFov = mosaicPlateFovDeg(plan, Math.min(1, zoomFactor));
  const viewScale = Math.max(1, zoomFactor);
  plateFovRef.current = plateFov;
  viewScaleRef.current = viewScale;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void fetchSkyPlate({ ra: center.raDeg, dec: center.decDeg, fov: plateFov, size: PLATE })
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
  }, [center.raDeg, center.decDeg, plateFov]);

  const projection = {
    raDeg: center.raDeg,
    decDeg: center.decDeg,
    fovDeg: plateFov,
    widthPx: VIRT,
    heightPx: VIRT,
  };

  const objectPoint = equatorialToPixel(projection, object.raDeg, object.decDeg);
  const major =
    object.majorArcmin == null ? 0 : ((object.majorArcmin / 60) / plateFov) * STAGE;
  const minor =
    object.minorArcmin == null ? major : ((object.minorArcmin / 60) / plateFov) * STAGE;

  const panelShapes = plan.panels.map((panel) => {
    const corners = panel.polygon.map((corner) => equatorialToPixel(projection, corner.raDeg, corner.decDeg));
    const centerPx = equatorialToPixel(projection, panel.raDeg, panel.decDeg);
    return {
      key: panel.label,
      index: panel.index + 1,
      points: corners.map((pt) => `${(pt.x / VIRT) * STAGE},${(pt.y / VIRT) * STAGE}`).join(" "),
      cx: (centerPx.x / VIRT) * STAGE,
      cy: (centerPx.y / VIRT) * STAGE,
    };
  });

  const outerPts = plan.outerPolygon.map((corner) => {
    const pt = equatorialToPixel(projection, corner.raDeg, corner.decDeg);
    return { x: (pt.x / VIRT) * STAGE, y: (pt.y / VIRT) * STAGE };
  });
  const brackets = cornerBrackets(outerPts);
  const handle = {
    x: (outerPts[0]!.x + outerPts[1]!.x) / 2,
    y: (outerPts[0]!.y + outerPts[1]!.y) / 2,
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_event, gesture) => {
          setOffset({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_event, gesture) => {
          const current = centerRef.current;
          const scale = Math.max(0.01, viewScaleRef.current);
          const next = centerAfterSensorDrag(
            {
              raDeg: current.raDeg,
              decDeg: current.decDeg,
              fovDeg: plateFovRef.current,
              widthPx: STAGE,
              heightPx: STAGE,
            },
            gesture.dx / scale,
            gesture.dy / scale,
          );
          onCenterChange({
            raDeg: next.raDeg,
            decDeg: Math.min(85, Math.max(-85, next.decDeg)),
          });
          setOffset({ x: 0, y: 0 });
        },
      }),
    [onCenterChange],
  );

  const rotateHandle = useMemo(() => {
    let startAngle = 0;
    let startRotation = 0;
    let originX = 0;
    let originY = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        originX = event.nativeEvent.pageX - event.nativeEvent.locationX + STAGE / 2;
        originY = event.nativeEvent.pageY - event.nativeEvent.locationY + STAGE / 2;
        startAngle =
          (Math.atan2(event.nativeEvent.pageY - originY, event.nativeEvent.pageX - originX) * 180) / Math.PI;
        startRotation = rotationRef.current;
      },
      onPanResponderMove: (event) => {
        const degrees =
          (Math.atan2(event.nativeEvent.pageY - originY, event.nativeEvent.pageX - originX) * 180) / Math.PI;
        onRotationChange(wrapRotation(startRotation + degrees - startAngle));
      },
    });
  }, [onRotationChange]);

  return (
    <View style={{ gap: 10 }}>
      <View style={[frameStyles.stage, { backgroundColor: c.bgSunken, borderColor: c.line }]}>
        <View style={[frameStyles.zoomLayer, { transform: [{ scale: viewScale }] }]}>
          {uri && !failed ? (
            <Image key={`plate-${plateFov.toFixed(4)}`} source={{ uri }} style={frameStyles.plate} />
          ) : null}
          {major > 0 ? (
            <View
              pointerEvents="none"
              style={[
                frameStyles.ellipse,
                {
                  borderColor: c.accent,
                  width: Math.max(8, minor),
                  height: Math.max(8, major),
                  left: (objectPoint.x / VIRT) * STAGE - Math.max(8, minor) / 2,
                  top: (objectPoint.y / VIRT) * STAGE - Math.max(8, major) / 2,
                },
              ]}
            />
          ) : null}

          {/* Drag moves mosaic overlays only; sky plate stays fixed until release. */}
          <View
            {...pan.panHandlers}
            style={[
              frameStyles.zoomLayer,
              StyleSheet.absoluteFill,
              {
                // Offset is screen pixels; divide so scale(viewScale) keeps 1:1 finger tracking.
                transform: [
                  { translateX: offset.x / viewScale },
                  { translateY: offset.y / viewScale },
                ],
              },
            ]}
          >
            <Svg width={STAGE} height={STAGE} style={StyleSheet.absoluteFill}>
              {brackets.map((d, index) => (
                <Path key={`bracket-${index}`} d={d} stroke={c.accent} strokeWidth={2.5} fill="none" />
              ))}
              {panelShapes.map((panel) => (
                <G key={panel.key}>
                  <Polygon
                    points={panel.points}
                    stroke={c.accent}
                    strokeWidth={1.4}
                    strokeDasharray="5 4"
                    fill="rgba(120, 190, 120, 0.06)"
                  />
                  <SvgText
                    x={panel.cx}
                    y={panel.cy + 4}
                    fill={c.accent}
                    fontSize={14}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {String(panel.index)}
                  </SvgText>
                </G>
              ))}
            </Svg>
            <View
              {...rotateHandle.panHandlers}
              hitSlop={14}
              style={[
                frameStyles.handle,
                {
                  backgroundColor: c.accent,
                  borderColor: c.bgRaised,
                  left: handle.x - 9,
                  top: handle.y - 9,
                },
              ]}
            />
          </View>
        </View>

        {loading ? <ActivityIndicator color={c.accent} style={StyleSheet.absoluteFill} /> : null}
        <Text style={[frameStyles.compass, { color: c.accent, top: 6, left: STAGE / 2 - 6 }]}>N</Text>
        <Text style={[frameStyles.compass, { color: c.accent, top: STAGE / 2 - 8, left: 8 }]}>E</Text>
      </View>

      <Text style={[styles.muted, { textAlign: "center" }]}>
        Mosaic {plan.mosaicWidthDeg.toFixed(2)}° × {plan.mosaicHeightDeg.toFixed(2)}° · Panel{" "}
        {plan.panelFov.widthDeg.toFixed(2)}° × {plan.panelFov.heightDeg.toFixed(2)}°
      </Text>
      <Text style={[styles.body, { textAlign: "center", fontFamily: "monospace", fontSize: 13 }]}>
        {formatRightAscension(center.raDeg)} · {formatDeclination(center.decDeg)}
      </Text>
    </View>
  );
}

function wrapRotation(value: number) {
  let next = value % 360;
  if (next < 0) next += 360;
  return next;
}

function cornerBrackets(corners: Array<{ x: number; y: number }>): string[] {
  const [nw, ne, se, sw] = corners;
  if (!nw || !ne || !se || !sw) return [];
  const arm = 14;
  function bracket(corner: { x: number; y: number }, alongA: { x: number; y: number }, alongB: { x: number; y: number }) {
    const a = unitToward(corner, alongA, arm);
    const b = unitToward(corner, alongB, arm);
    return `M ${a.x} ${a.y} L ${corner.x} ${corner.y} L ${b.x} ${b.y}`;
  }
  return [bracket(nw, ne, sw), bracket(ne, nw, se), bracket(se, ne, sw), bracket(sw, se, nw)];
}

function unitToward(from: { x: number; y: number }, to: { x: number; y: number }, length: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const hyp = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / hyp) * length, y: from.y + (dy / hyp) * length };
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
  zoomLayer: {
    width: STAGE,
    height: STAGE,
  },
  plate: { ...StyleSheet.absoluteFillObject, width: STAGE, height: STAGE },
  ellipse: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 999,
  },
  handle: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    zIndex: 4,
  },
  compass: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "600",
    zIndex: 5,
  },
});
