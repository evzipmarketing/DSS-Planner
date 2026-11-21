import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { DeviceMotion, Magnetometer } from "expo-sensors";
import {
  horizontalCoords,
  objectTitle,
  primaryDesignation,
  type DeepSkyObject,
  type Site,
} from "@dss/core";
import { constellationName } from "@dss/data";
import catalog from "@/data/sky-catalog.json";
import { colors, type ThemeName } from "@/theme/tokens";
import { projectToScreen, shortestDelta, starRadius, wrap360, type LookDirection } from "./sky-math";

type SkyStar = {
  id: string;
  name: string;
  raDeg: number;
  decDeg: number;
  mag: number;
  con: string;
};

type SkyLine = { con: string; stars: string[] };

type FocusTarget = {
  id: string;
  label: string;
  detail: string;
  raDeg: number;
  decDeg: number;
  kind: "star" | "dso";
};

const STARS = catalog.stars as SkyStar[];
const LINES = catalog.lines as SkyLine[];
const FOV_MIN = 35;
const FOV_MAX = 120;
const FOV_STEP = 12;
const FOV_DEFAULT = 100;

type Props = {
  theme: ThemeName;
  site: Site;
  locationReady: boolean;
  target: DeepSkyObject | null;
  popularDsos: DeepSkyObject[];
  onThemeToggle: () => void;
};

export function SkyExplorer({ theme, site, locationReady, target, popularDsos, onThemeToggle }: Props) {
  const c = colors(theme);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(25);
  const [sensorNote, setSensorNote] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [look, setLook] = useState<LookDirection>({ azimuthDeg: 0, altitudeDeg: 25 });
  const [now, setNow] = useState(() => new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showStarNames, setShowStarNames] = useState(true);
  const [showConstNames, setShowConstNames] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showDsos, setShowDsos] = useState(true);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const [fovDeg, setFovDeg] = useState(FOV_DEFAULT);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!target) return;
    setFocus({
      id: target.id,
      label: objectTitle(target),
      detail: primaryDesignation(target),
      raDeg: target.raDeg,
      decDeg: target.decDeg,
      kind: "dso",
    });
  }, [target?.id]);

  useEffect(() => {
    let magSub: { remove: () => void } | null = null;
    let motionSub: { remove: () => void } | null = null;
    void (async () => {
      const magOk = await Magnetometer.isAvailableAsync();
      if (!magOk) {
        setSensorNote("Compass unavailable — use pan mode.");
        setManual(true);
        return;
      }
      Magnetometer.setUpdateInterval(120);
      magSub = Magnetometer.addListener((data) => {
        const angle = (Math.atan2(data.y, data.x) * 180) / Math.PI;
        setHeading(wrap360(angle));
      });
      const motionOk = await DeviceMotion.isAvailableAsync();
      if (motionOk) {
        DeviceMotion.setUpdateInterval(120);
        motionSub = DeviceMotion.addListener((event) => {
          const beta = event.rotation?.beta;
          if (typeof beta !== "number") return;
          const alt = Math.max(-10, Math.min(80, (beta * 180) / Math.PI));
          setPitch(alt);
        });
      }
    })();
    return () => {
      magSub?.remove();
      motionSub?.remove();
    };
  }, []);

  useEffect(() => {
    if (manual) return;
    setLook({ azimuthDeg: heading, altitudeDeg: pitch });
  }, [manual, heading, pitch]);

  const starHoriz = useMemo(() => {
    if (!locationReady || size.width < 10) return new Map<string, { az: number; alt: number }>();
    const map = new Map<string, { az: number; alt: number }>();
    for (const star of STARS) {
      const coords = horizontalCoords(star.raDeg, star.decDeg, now, site);
      map.set(star.id, { az: coords.azimuthDeg, alt: coords.altitudeDeg });
    }
    return map;
  }, [locationReady, now, site, size.width]);

  const dsoHoriz = useMemo(() => {
    if (!locationReady || size.width < 10) return new Map<string, { az: number; alt: number }>();
    const map = new Map<string, { az: number; alt: number }>();
    for (const object of popularDsos) {
      const coords = horizontalCoords(object.raDeg, object.decDeg, now, site);
      map.set(object.id, { az: coords.azimuthDeg, alt: coords.altitudeDeg });
    }
    return map;
  }, [locationReady, now, site, size.width, popularDsos]);

  const focusHoriz = useMemo(() => {
    if (!focus || !locationReady) return null;
    return horizontalCoords(focus.raDeg, focus.decDeg, now, site);
  }, [focus, locationReady, now, site]);

  const projectedStars = useMemo(() => {
    const out: { star: SkyStar; x: number; y: number }[] = [];
    for (const star of STARS) {
      const horiz = starHoriz.get(star.id);
      if (!horiz || horiz.alt < -2) continue;
      const point = projectToScreen(horiz.az, horiz.alt, look, size.width, size.height, fovDeg);
      if (!point) continue;
      out.push({ star, x: point.x, y: point.y });
    }
    return out;
  }, [starHoriz, look, size, fovDeg]);

  const projectedDsos = useMemo(() => {
    if (!showDsos) return [] as { object: DeepSkyObject; x: number; y: number }[];
    const out: { object: DeepSkyObject; x: number; y: number }[] = [];
    for (const object of popularDsos) {
      const horiz = dsoHoriz.get(object.id);
      if (!horiz || horiz.alt < -1) continue;
      const point = projectToScreen(horiz.az, horiz.alt, look, size.width, size.height, fovDeg);
      if (!point) continue;
      out.push({ object, x: point.x, y: point.y });
    }
    return out;
  }, [showDsos, popularDsos, dsoHoriz, look, size, fovDeg]);

  const projectedLines = useMemo(() => {
    if (!showLines) return [] as { key: string; x1: number; y1: number; x2: number; y2: number }[];
    const byId = new Map(projectedStars.map((item) => [item.star.id, item]));
    const segments: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    LINES.forEach((line, lineIndex) => {
      for (let i = 0; i < line.stars.length - 1; i += 1) {
        const a = byId.get(line.stars[i]!);
        const b = byId.get(line.stars[i + 1]!);
        if (!a || !b) continue;
        segments.push({ key: `${lineIndex}-${i}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    });
    return segments;
  }, [projectedStars, showLines]);

  const constellationLabels = useMemo(() => {
    if (!showConstNames) return [] as { con: string; x: number; y: number }[];
    const groups = new Map<string, { x: number; y: number; n: number }>();
    for (const item of projectedStars) {
      const current = groups.get(item.star.con) ?? { x: 0, y: 0, n: 0 };
      groups.set(item.star.con, { x: current.x + item.x, y: current.y + item.y, n: current.n + 1 });
    }
    return [...groups.entries()]
      .filter(([, value]) => value.n >= 2)
      .map(([con, value]) => ({ con, x: value.x / value.n, y: value.y / value.n - 10 }));
  }, [projectedStars, showConstNames]);

  const horizonY = useMemo(() => {
    const point = projectToScreen(look.azimuthDeg, 0, look, size.width, size.height, fovDeg);
    return point?.y ?? null;
  }, [look, size, fovDeg]);

  const focusProjection = useMemo(() => {
    if (!focusHoriz || size.width < 10) return null;
    const point = projectToScreen(
      focusHoriz.azimuthDeg,
      Math.max(focusHoriz.altitudeDeg, -5),
      look,
      size.width,
      size.height,
      fovDeg,
    );
    const daz = shortestDelta(look.azimuthDeg, focusHoriz.azimuthDeg);
    const dalt = focusHoriz.altitudeDeg - look.altitudeDeg;
    return {
      point,
      belowHorizon: focusHoriz.altitudeDeg < 0,
      az: focusHoriz.azimuthDeg,
      alt: focusHoriz.altitudeDeg,
      left: daz < -12,
      right: daz > 12,
      up: dalt > 10,
      down: dalt < -10,
    };
  }, [focusHoriz, look, size, fovDeg]);

  function zoomIn() {
    setFovDeg((current) => Math.max(FOV_MIN, current - FOV_STEP));
  }

  function zoomOut() {
    setFovDeg((current) => Math.min(FOV_MAX, current + FOV_STEP));
  }

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onChange((event) => {
      if (!manual) return;
      setLook((current) => ({
        azimuthDeg: wrap360(current.azimuthDeg - event.changeX * 0.22),
        altitudeDeg: Math.max(-5, Math.min(85, current.altitudeDeg + event.changeY * 0.18)),
      }));
    });

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const stars = STARS.filter(
      (star) =>
        q.length < 1 ||
        star.name.toLowerCase().includes(q) ||
        constellationName(star.con).toLowerCase().includes(q) ||
        star.con.toLowerCase().includes(q),
    ).slice(0, 16);
    const dsos = popularDsos
      .filter((object) => {
        if (q.length < 1) return object.messier != null;
        const hay = `${objectTitle(object)} ${primaryDesignation(object)} ${object.names.join(" ")} ${object.aliases.join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 16);
    return { stars, dsos };
  }, [query, popularDsos]);

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }

  function centerOn(raDeg: number, decDeg: number, nextFocus: FocusTarget) {
    const coords = horizontalCoords(raDeg, decDeg, now, site);
    setFocus(nextFocus);
    setManual(true);
    setLook({
      azimuthDeg: coords.azimuthDeg,
      altitudeDeg: Math.max(5, Math.min(75, coords.altitudeDeg)),
    });
    setSearchOpen(false);
  }

  function goToStar(star: SkyStar) {
    centerOn(star.raDeg, star.decDeg, {
      id: star.id,
      label: star.name,
      detail: constellationName(star.con),
      raDeg: star.raDeg,
      decDeg: star.decDeg,
      kind: "star",
    });
  }

  function goToDso(object: DeepSkyObject) {
    centerOn(object.raDeg, object.decDeg, {
      id: object.id,
      label: objectTitle(object),
      detail: primaryDesignation(object),
      raDeg: object.raDeg,
      decDeg: object.decDeg,
      kind: "dso",
    });
  }

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View style={styles.hud}>
        <Text style={[styles.hudText, { color: c.text }]}>
          Azimuth: {look.azimuthDeg.toFixed(2)}{"  "}Altitude: {look.altitudeDeg.toFixed(2)}
        </Text>
        {focus ? (
          <Text style={[styles.focusChip, { color: c.accent }]} numberOfLines={1}>
            {focus.label}
            {focusProjection?.belowHorizon ? " · below horizon" : ""}
          </Text>
        ) : null}
      </View>

      {!locationReady ? (
        <View style={styles.centerMessage}>
          <Text style={{ color: c.muted }}>Set a location to unlock the live sky map.</Text>
        </View>
      ) : size.width > 0 ? (
        <GestureDetector gesture={panGesture}>
          <View style={styles.map}>
            <Svg width={size.width} height={size.height}>
              <Circle cx={size.width / 2} cy={size.height / 2} r={1.5} fill={c.faint} opacity={0.35} />
              {horizonY != null ? (
                <Line x1={0} y1={horizonY} x2={size.width} y2={horizonY} stroke={c.lineStrong} strokeWidth={1} opacity={0.7} />
              ) : null}
              {projectedLines.map((segment) => (
                <Line
                  key={segment.key}
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  stroke={theme === "night" ? "#7a3030" : "#3a4a6a"}
                  strokeWidth={1.2}
                  opacity={0.85}
                />
              ))}
              {projectedStars.map((item) => {
                const focused = focus?.id === item.star.id;
                return (
                  <Circle
                    key={item.star.id}
                    cx={item.x}
                    cy={item.y}
                    r={starRadius(item.star.mag) * (focused ? 1.35 : 1)}
                    fill={item.star.mag < 1.2 ? "#ffe8c8" : c.text}
                    opacity={0.55 + Math.max(0, (3.8 - item.star.mag) * 0.12)}
                  />
                );
              })}
              {showStarNames
                ? projectedStars
                    .filter((item) => item.star.mag <= 2.4 || item.star.id === focus?.id)
                    .map((item) => (
                      <SvgText key={`label-${item.star.id}`} x={item.x + 6} y={item.y + 3} fill={c.text} fontSize={10} opacity={0.9}>
                        {item.star.name}
                      </SvgText>
                    ))
                : null}
              {constellationLabels.map((label) => (
                <SvgText
                  key={label.con}
                  x={label.x}
                  y={label.y}
                  fill={theme === "night" ? "#c48a8a" : "#6aa8a0"}
                  fontSize={13}
                  fontWeight="600"
                  textAnchor="middle"
                  opacity={0.85}
                >
                  {constellationName(label.con)}
                </SvgText>
              ))}
              {projectedDsos.map((item) => {
                const focused = focus?.id === item.object.id;
                const label = objectTitle(item.object);
                return (
                  <Circle
                    key={`dso-dot-${item.object.id}`}
                    cx={item.x}
                    cy={item.y}
                    r={focused ? 7 : 5}
                    stroke={c.accent}
                    strokeWidth={1.4}
                    fill={focused ? "rgba(122,208,231,0.25)" : "transparent"}
                  />
                );
              })}
              {projectedDsos.map((item) => {
                const label = objectTitle(item.object);
                return (
                  <SvgText
                    key={`dso-label-${item.object.id}`}
                    x={item.x + 8}
                    y={item.y + 3}
                    fill={c.accent}
                    fontSize={10}
                    opacity={0.95}
                  >
                    {item.object.messier != null ? `M${item.object.messier}` : label}
                  </SvgText>
                );
              })}
              {focusProjection?.point ? (
                <>
                  <Circle
                    cx={focusProjection.point.x}
                    cy={focusProjection.point.y}
                    r={12}
                    stroke={c.clay}
                    strokeWidth={2}
                    fill="none"
                  />
                  <SvgText x={focusProjection.point.x + 14} y={focusProjection.point.y - 8} fill={c.clay} fontSize={11} fontWeight="700">
                    {focus?.label}
                  </SvgText>
                </>
              ) : null}
            </Svg>

            {focus && focusProjection && !focusProjection.point ? (
              <>
                {focusProjection.left ? (
                  <View style={[styles.edgeArrow, styles.edgeLeft]}>
                    <EdgeArrow color={c.clay} direction="left" />
                    <Text style={[styles.edgeHint, { color: c.clay }]}>Turn left</Text>
                  </View>
                ) : null}
                {focusProjection.right ? (
                  <View style={[styles.edgeArrow, styles.edgeRight]}>
                    <EdgeArrow color={c.clay} direction="right" />
                    <Text style={[styles.edgeHint, { color: c.clay }]}>Turn right</Text>
                  </View>
                ) : null}
                {focusProjection.up ? (
                  <View style={[styles.edgeArrow, styles.edgeTop]}>
                    <EdgeArrow color={c.clay} direction="up" />
                    <Text style={[styles.edgeHint, { color: c.clay }]}>Look up</Text>
                  </View>
                ) : null}
                {focusProjection.down ? (
                  <View style={[styles.edgeArrow, styles.edgeBottom]}>
                    <EdgeArrow color={c.clay} direction="down" />
                    <Text style={[styles.edgeHint, { color: c.clay }]}>Look down</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </GestureDetector>
      ) : null}

      <View style={styles.fabRow}>
        <Fab
          color={c}
          accessibilityLabel="Zoom out"
          onPress={zoomOut}
          disabled={fovDeg >= FOV_MAX}
          icon={<ZoomOutIcon color={c.text} />}
        />
        <Fab
          color={c}
          accessibilityLabel="Zoom in"
          onPress={zoomIn}
          disabled={fovDeg <= FOV_MIN}
          icon={<ZoomInIcon color={c.text} />}
        />
        <Fab
          color={c}
          active={manual}
          accessibilityLabel={manual ? "Pan mode" : "Compass mode"}
          onPress={() => setManual((value) => !value)}
          icon={manual ? <PanIcon color={manual ? c.accent : c.text} /> : <CompassIcon color={c.text} />}
        />
        <Fab color={c} accessibilityLabel="Search sky" onPress={() => setSearchOpen(true)} icon={<SearchIcon color={c.text} />} />
        <Fab
          color={c}
          accessibilityLabel="Toggle night flashlight theme"
          onPress={onThemeToggle}
          icon={<ThemeIcon color={c.text} night={theme === "night"} />}
        />
        <Fab color={c} accessibilityLabel="Sky settings" onPress={() => setSettingsOpen(true)} icon={<SettingsIcon color={c.text} />} />
      </View>

      {sensorNote ? (
        <Text style={[styles.note, { color: c.faint }]}>{sensorNote}</Text>
      ) : (
        <Text style={[styles.note, { color: c.faint }]}>
          {manual ? "Pan to find the focused object — arrows guide you" : "Map follows device heading"}
          {focusHoriz ? ` · az ${focusHoriz.azimuthDeg.toFixed(0)}° alt ${focusHoriz.altitudeDeg.toFixed(0)}°` : ""}
        </Text>
      )}

      <Modal visible={searchOpen} animationType="slide" transparent onRequestClose={() => setSearchOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSearchOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.bgRaised, borderColor: c.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Search sky</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Star, Messier, nebula…"
              placeholderTextColor={c.faint}
              autoFocus
              style={[styles.input, { color: c.text, borderColor: c.lineStrong, backgroundColor: c.bgSunken }]}
            />
            <ScrollView style={{ maxHeight: 380 }}>
              {searchHits.dsos.length > 0 ? (
                <>
                  <Text style={[styles.groupLabel, { color: c.faint }]}>Deep-sky</Text>
                  {searchHits.dsos.map((object) => (
                    <Pressable key={object.id} style={styles.searchRow} onPress={() => goToDso(object)}>
                      <Text style={{ color: c.text, fontWeight: "600" }}>{objectTitle(object)}</Text>
                      <Text style={{ color: c.muted }}>
                        {primaryDesignation(object)}
                        {object.magnitude != null ? ` · mag ${object.magnitude.toFixed(1)}` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
              {searchHits.stars.length > 0 ? (
                <>
                  <Text style={[styles.groupLabel, { color: c.faint }]}>Stars</Text>
                  {searchHits.stars.map((star) => (
                    <Pressable key={star.id} style={styles.searchRow} onPress={() => goToStar(star)}>
                      <Text style={{ color: c.text, fontWeight: "600" }}>{star.name}</Text>
                      <Text style={{ color: c.muted }}>
                        {constellationName(star.con)} · mag {star.mag.toFixed(1)}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={settingsOpen} animationType="fade" transparent onRequestClose={() => setSettingsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.bgRaised, borderColor: c.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Sky map</Text>
            <ToggleRow color={c} label="Star names" value={showStarNames} onToggle={() => setShowStarNames((v) => !v)} />
            <ToggleRow color={c} label="Constellation names" value={showConstNames} onToggle={() => setShowConstNames((v) => !v)} />
            <ToggleRow color={c} label="Constellation lines" value={showLines} onToggle={() => setShowLines((v) => !v)} />
            <ToggleRow color={c} label="Popular deep-sky objects" value={showDsos} onToggle={() => setShowDsos((v) => !v)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Fab({
  color,
  icon,
  onPress,
  active,
  disabled,
  accessibilityLabel,
}: {
  color: ReturnType<typeof colors>;
  icon: ReactNode;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.fab,
        {
          backgroundColor: color.bgRaised,
          borderColor: active ? color.accent : color.lineStrong,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      {icon}
    </Pressable>
  );
}

function ZoomOutIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M5 12h14" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ZoomInIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PanIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M12 3v18M3 12h18M7 7l-4 5 4 5M17 7l4 5-4 5M7 17l5 4 5-4M7 7l5-4 5 4"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CompassIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M14.5 9.5 11 13l-2.5 1.5L11 12l3.5-2.5Z" fill={color} />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="m16 16 4.5 4.5" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ThemeIcon({ color, night }: { color: string; night: boolean }) {
  if (night) {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d="M12 4.5a7.5 7.5 0 1 0 9 9.2A8 8 0 0 1 12 4.5Z"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" fill="none" stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M5.1 18.9l1.6-1.6M17.3 6.7l1.6-1.6"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.4-2.3.5a7.7 7.7 0 0 0-1.7-1L15 3.5h-6l-.5 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-.5-2 3.4 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.4 2.3-.5a7.7 7.7 0 0 0 1.7 1l.5 2.4h6l.5-2.4a7.7 7.7 0 0 0 1.7-1l2.3.5 2-3.4-2-1.2Z"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ToggleRow({
  color,
  label,
  value,
  onToggle,
}: {
  color: ReturnType<typeof colors>;
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.toggleRow}>
      <Text style={{ color: color.text, flex: 1 }}>{label}</Text>
      <Text style={{ color: value ? color.accent : color.muted }}>{value ? "On" : "Off"}</Text>
    </Pressable>
  );
}

function EdgeArrow({ color, direction }: { color: string; direction: "left" | "right" | "up" | "down" }) {
  const rotation =
    direction === "right" ? "0deg" : direction === "left" ? "180deg" : direction === "up" ? "-90deg" : "90deg";
  return (
    <Svg width={26} height={40} viewBox="0 0 28 56" style={{ transform: [{ rotate: rotation }] }}>
      <Path d="M4 8 L24 28 L4 48 Z" fill={color} opacity={0.75} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  hud: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    zIndex: 5,
    gap: 4,
  },
  hudText: { fontSize: 13, fontVariant: ["tabular-nums"] },
  focusChip: { fontSize: 12, fontWeight: "600" },
  map: { flex: 1 },
  centerMessage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  fabRow: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 22,
    zIndex: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  edgeArrow: {
    position: "absolute",
    alignItems: "center",
    gap: 4,
  },
  edgeLeft: { left: 8, top: "42%" },
  edgeRight: { right: 8, top: "42%" },
  edgeTop: { top: 36, left: 0, right: 0, alignItems: "center" },
  edgeBottom: { bottom: 86, left: 0, right: 0, alignItems: "center" },
  edgeHint: { fontSize: 11, fontWeight: "700" },
  note: {
    position: "absolute",
    left: 12,
    bottom: 10,
    fontSize: 11,
    maxWidth: "48%",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    maxHeight: "75%",
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  searchRow: { paddingVertical: 10, gap: 2 },
  groupLabel: { marginTop: 8, marginBottom: 2, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
});
