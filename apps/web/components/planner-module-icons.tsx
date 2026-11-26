"use client";

export type PlannerModuleIconId =
  | "multi-target"
  | "single-target"
  | "multi-rigs"
  | "mosaic"
  | "collage"
  | "asterisms";

export function PlannerModuleIcon({
  id,
  className,
}: {
  id: PlannerModuleIconId;
  className?: string;
}) {
  switch (id) {
    case "multi-target":
      return (
        <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
          <path d="M8 44c8-18 16-26 24-26s16 8 24 26" />
          <path d="M10 48c7-12 14-18 22-18s15 6 22 18" />
          <circle className="fill" cx="22" cy="28" r="2.6" />
          <circle className="fill" cx="34" cy="22" r="2.6" />
          <circle className="fill" cx="46" cy="30" r="2.6" />
        </svg>
      );
    case "single-target":
      return (
        <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="28" cy="30" r="10" />
          <circle className="fill" cx="28" cy="30" r="3" />
          <path d="M28 14v4M28 42v4M14 30h4M38 30h4" />
          <path d="M44 18a10 10 0 0 1 10 14" />
          <path d="M16 50h32M20 50v4M32 50v4M44 50v4" />
        </svg>
      );
    case "multi-rigs":
      return (
        <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
          <rect x="10" y="18" width="14" height="28" rx="3" />
          <rect x="25" y="14" width="14" height="32" rx="3" />
          <rect x="40" y="20" width="14" height="26" rx="3" />
          <path d="M17 18V14M32 14V10M47 20V16" />
          <path d="M12 52h40" />
        </svg>
      );
    case "mosaic":
      return (
        <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
          <rect x="10" y="12" width="20" height="16" rx="2" />
          <rect x="26" y="12" width="20" height="16" rx="2" />
          <rect x="42" y="12" width="12" height="16" rx="2" />
          <rect x="10" y="24" width="20" height="16" rx="2" />
          <rect x="26" y="24" width="20" height="16" rx="2" />
          <rect x="42" y="24" width="12" height="16" rx="2" />
          <rect x="10" y="36" width="20" height="16" rx="2" />
          <rect x="26" y="36" width="20" height="16" rx="2" />
          <rect x="42" y="36" width="12" height="16" rx="2" />
        </svg>
      );
    case "collage":
      return (
        <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
          <rect x="10" y="16" width="44" height="32" rx="3" />
          <circle className="fill" cx="22" cy="28" r="2.4" />
          <circle className="fill" cx="34" cy="24" r="2.4" />
          <circle className="fill" cx="44" cy="30" r="2.4" />
          <circle className="fill" cx="28" cy="38" r="2.4" />
          <circle className="fill" cx="40" cy="40" r="2.4" />
          <path d="M8 20h4M52 44h4M18 12v4M46 48v4" />
        </svg>
      );
    case "asterisms":
      return (
        <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
          <path d="M16 40L28 20L40 28L48 16" />
          <path d="M28 20L24 48" />
          <circle className="fill" cx="16" cy="40" r="2.6" />
          <circle className="fill" cx="28" cy="20" r="2.6" />
          <circle className="fill" cx="40" cy="28" r="2.6" />
          <circle className="fill" cx="48" cy="16" r="2.6" />
          <circle className="fill" cx="24" cy="48" r="2.6" />
        </svg>
      );
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
