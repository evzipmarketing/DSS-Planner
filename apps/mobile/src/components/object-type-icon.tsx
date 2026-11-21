import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { type DeepSkyType } from "@dss/core";

type IconKind = "galaxy" | "nebula" | "open-cluster" | "globular" | "star" | "other";

function iconKind(type: DeepSkyType): IconKind {
  switch (type) {
    case "G":
    case "GPair":
    case "GTrpl":
    case "GGroup":
    case "ClG":
      return "galaxy";
    case "PN":
    case "HII":
    case "EmN":
    case "Neb":
    case "RfN":
    case "SNR":
    case "DrkN":
    case "Cl+N":
      return "nebula";
    case "OCl":
    case "StCl":
    case "*Ass":
    case "Ast":
      return "open-cluster";
    case "GCl":
      return "globular";
    case "*":
    case "**":
    case "Nova":
      return "star";
    case "NonEx":
    case "Other":
    case "Dup":
      return "other";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function ObjectTypeIcon({
  type,
  color,
  size = 16,
}: {
  type: DeepSkyType;
  color: string;
  size?: number;
}) {
  const kind = iconKind(type);
  switch (kind) {
    case "galaxy":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Ellipse cx="12" cy="12" rx="9" ry="4.5" fill="none" stroke={color} strokeWidth={1.7} transform="rotate(-28 12 12)" />
          <Ellipse cx="12" cy="12" rx="3.2" ry="1.6" fill={color} transform="rotate(-28 12 12)" />
        </Svg>
      );
    case "nebula":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M7.5 16.5c-2.2 0-3.8-1.8-3.8-3.8 0-1.5.9-2.8 2.2-3.4.2-2.4 2.2-4.3 4.6-4.3 1.5 0 2.8.7 3.6 1.7.7-.4 1.6-.6 2.5-.6 2.5 0 4.5 1.9 4.7 4.3 1.5.4 2.6 1.8 2.6 3.4 0 2-1.6 3.7-3.6 3.7H7.5z"
            fill="none"
            stroke={color}
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "open-cluster":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="8" cy="8" r="1.4" fill={color} />
          <Circle cx="14.5" cy="7" r="1.2" fill={color} />
          <Circle cx="18" cy="11.5" r="1.3" fill={color} />
          <Circle cx="12" cy="12.5" r="1.5" fill={color} />
          <Circle cx="7" cy="14.5" r="1.1" fill={color} />
          <Circle cx="15.5" cy="16.5" r="1.3" fill={color} />
          <Circle cx="10.5" cy="18" r="1" fill={color} />
        </Svg>
      );
    case "globular":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth={1.5} />
          <Circle cx="12" cy="12" r="1.4" fill={color} />
          <Circle cx="9.2" cy="10.2" r="1" fill={color} />
          <Circle cx="14.8" cy="10.2" r="1" fill={color} />
          <Circle cx="9.2" cy="13.8" r="1" fill={color} />
          <Circle cx="14.8" cy="13.8" r="1" fill={color} />
          <Circle cx="12" cy="8.4" r="0.9" fill={color} />
          <Circle cx="12" cy="15.6" r="0.9" fill={color} />
        </Svg>
      );
    case "star":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3.2 13.4 9.1 19.5 10.2 14.8 14.1 16.2 20.2 12 16.9 7.8 20.2 9.2 14.1 4.5 10.2 10.6 9.1Z" fill={color} />
        </Svg>
      );
    case "other":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="7.2" fill="none" stroke={color} strokeWidth={1.7} />
          <Circle cx="12" cy="12" r="1.6" fill={color} />
        </Svg>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
