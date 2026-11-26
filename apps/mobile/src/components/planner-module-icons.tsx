import Svg, { Circle, Path, Rect } from "react-native-svg";

export type PlannerModuleIconId =
  | "multi-target"
  | "single-target"
  | "multi-rigs"
  | "mosaic"
  | "collage"
  | "asterisms";

export function PlannerModuleIcon({
  id,
  color,
  size = 28,
}: {
  id: PlannerModuleIconId;
  color: string;
  size?: number;
}) {
  const stroke = color;
  const common = {
    stroke,
    strokeWidth: size >= 64 ? 1.45 : 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
  };

  switch (id) {
    case "multi-target":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M8 44c8-18 16-26 24-26s16 8 24 26" {...common} />
          <Path d="M10 48c7-12 14-18 22-18s15 6 22 18" {...common} />
          <Circle cx={22} cy={28} r={2.6} fill={stroke} stroke="none" />
          <Circle cx={34} cy={22} r={2.6} fill={stroke} stroke="none" />
          <Circle cx={46} cy={30} r={2.6} fill={stroke} stroke="none" />
        </Svg>
      );
    case "single-target":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Circle cx={28} cy={30} r={10} {...common} />
          <Circle cx={28} cy={30} r={3} fill={stroke} stroke="none" />
          <Path d="M28 14v4M28 42v4M14 30h4M38 30h4" {...common} />
          <Path d="M44 18a10 10 0 0 1 10 14" {...common} />
          <Path d="M16 50h32M20 50v4M32 50v4M44 50v4" {...common} />
        </Svg>
      );
    case "multi-rigs":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x={10} y={18} width={14} height={28} rx={3} {...common} />
          <Rect x={25} y={14} width={14} height={32} rx={3} {...common} />
          <Rect x={40} y={20} width={14} height={26} rx={3} {...common} />
          <Path d="M17 18V14M32 14V10M47 20V16" {...common} />
          <Path d="M12 52h40" {...common} />
        </Svg>
      );
    case "mosaic":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x={10} y={12} width={20} height={16} rx={2} {...common} />
          <Rect x={26} y={12} width={20} height={16} rx={2} {...common} />
          <Rect x={42} y={12} width={12} height={16} rx={2} {...common} />
          <Rect x={10} y={24} width={20} height={16} rx={2} {...common} />
          <Rect x={26} y={24} width={20} height={16} rx={2} {...common} />
          <Rect x={42} y={24} width={12} height={16} rx={2} {...common} />
          <Rect x={10} y={36} width={20} height={16} rx={2} {...common} />
          <Rect x={26} y={36} width={20} height={16} rx={2} {...common} />
          <Rect x={42} y={36} width={12} height={16} rx={2} {...common} />
        </Svg>
      );
    case "collage":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x={10} y={16} width={44} height={32} rx={3} {...common} />
          <Circle cx={22} cy={28} r={2.4} fill={stroke} stroke="none" />
          <Circle cx={34} cy={24} r={2.4} fill={stroke} stroke="none" />
          <Circle cx={44} cy={30} r={2.4} fill={stroke} stroke="none" />
          <Circle cx={28} cy={38} r={2.4} fill={stroke} stroke="none" />
          <Circle cx={40} cy={40} r={2.4} fill={stroke} stroke="none" />
          <Path d="M8 20h4M52 44h4M18 12v4M46 48v4" {...common} />
        </Svg>
      );
    case "asterisms":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M16 40L28 20L40 28L48 16" {...common} />
          <Path d="M28 20L24 48" {...common} />
          <Circle cx={16} cy={40} r={2.6} fill={stroke} stroke="none" />
          <Circle cx={28} cy={20} r={2.6} fill={stroke} stroke="none" />
          <Circle cx={40} cy={28} r={2.6} fill={stroke} stroke="none" />
          <Circle cx={48} cy={16} r={2.6} fill={stroke} stroke="none" />
          <Circle cx={24} cy={48} r={2.6} fill={stroke} stroke="none" />
        </Svg>
      );
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
