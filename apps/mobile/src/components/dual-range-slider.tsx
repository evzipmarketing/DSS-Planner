import { useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from "react-native";
import { colors, type ThemeName } from "@/theme/tokens";

type DualRangeSliderProps = {
  theme: ThemeName;
  label: string;
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  formatValue: (value: number) => string;
  onChange: (low: number, high: number) => void;
};

export function DualRangeSlider({
  theme,
  label,
  min,
  max,
  step,
  low,
  high,
  formatValue,
  onChange,
}: DualRangeSliderProps) {
  const c = colors(theme);
  const [width, setWidth] = useState(0);
  const span = Math.max(max - min, step);
  const lowRatio = clamp01((low - min) / span);
  const highRatio = clamp01((high - min) / span);
  const active = useRef<"low" | "high" | null>(null);
  const latest = useRef({ low, high, width, min, max, step, onChange });
  latest.current = { low, high, width, min, max, step, onChange };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { width: trackWidth, low: currentLow, high: currentHigh, min: rangeMin, max: rangeMax } =
            latest.current;
          if (trackWidth <= 0) return;
          const x = event.nativeEvent.locationX;
          const lowX = ((currentLow - rangeMin) / Math.max(rangeMax - rangeMin, 1)) * trackWidth;
          const highX = ((currentHigh - rangeMin) / Math.max(rangeMax - rangeMin, 1)) * trackWidth;
          active.current = Math.abs(x - lowX) <= Math.abs(x - highX) ? "low" : "high";
          updateFromX(x);
        },
        onPanResponderMove: (event) => {
          updateFromX(event.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          active.current = null;
        },
        onPanResponderTerminate: () => {
          active.current = null;
        },
      }),
    [],
  );

  function updateFromX(x: number) {
    const {
      width: trackWidth,
      low: currentLow,
      high: currentHigh,
      min: rangeMin,
      max: rangeMax,
      step: rangeStep,
      onChange: emit,
    } = latest.current;
    if (trackWidth <= 0 || !active.current) return;
    const raw = rangeMin + (clamp01(x / trackWidth) * (rangeMax - rangeMin));
    const snapped = snap(raw, rangeMin, rangeMax, rangeStep);
    if (active.current === "low") {
      emit(Math.min(snapped, currentHigh), currentHigh);
      return;
    }
    emit(currentLow, Math.max(snapped, currentLow));
  }

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
        <Text style={[styles.value, { color: c.text }]}>
          {formatValue(low)} – {formatValue(high)}
        </Text>
      </View>
      <View
        style={[styles.trackHit, { borderColor: c.line }]}
        onLayout={onLayout}
        {...pan.panHandlers}
      >
        <View style={[styles.track, { backgroundColor: c.line }]} />
        <View
          style={[
            styles.fill,
            {
              backgroundColor: c.accent,
              left: `${lowRatio * 100}%`,
              width: `${Math.max(highRatio - lowRatio, 0) * 100}%`,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: `${lowRatio * 100}%`,
              backgroundColor: c.bgRaised,
              borderColor: c.accent,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: `${highRatio * 100}%`,
              backgroundColor: c.bgRaised,
              borderColor: c.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function snap(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  return Math.min(max, Math.max(min, min + steps * step));
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
  },
  trackHit: {
    position: "relative",
    height: 36,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 99,
  },
  fill: {
    position: "absolute",
    top: 15,
    height: 6,
    borderRadius: 99,
  },
  thumb: {
    position: "absolute",
    top: 7,
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    borderWidth: 2,
  },
});
