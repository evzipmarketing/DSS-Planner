import { bandLabel, type BandAdvice } from "./planning";
import { objectTitle, objectTypeLabel, primaryDesignation } from "./catalogue";
import { formatDeclination, formatRightAscension, roundHours } from "./format";
import type { DeepSkyObject } from "./types";

export const PLAN_CSV_HEADERS = [
  "id",
  "name",
  "designation",
  "ra",
  "dec",
  "type",
  "constellation",
  "frameFillPercent",
  "usableHours",
  "band",
  "listName",
] as const;

export type PlanCsvRow = {
  id: string;
  name: string;
  designation: string;
  ra: string;
  dec: string;
  type: string;
  constellation: string;
  frameFillPercent: string;
  usableHours: string;
  band: string;
  listName: string;
};

export function planCsvRowFromTarget(input: {
  object: DeepSkyObject;
  frameFillPercent?: number | null;
  usableHours?: number | null;
  band?: BandAdvice | string | null;
  constellation?: string | null;
  listName: string;
}): PlanCsvRow {
  const band =
    input.band == null || input.band === ""
      ? ""
      : typeof input.band === "string" && (input.band === "narrowband" || input.band === "broadband" || input.band === "both")
        ? bandLabel(input.band)
        : String(input.band);
  return {
    id: input.object.id,
    name: objectTitle(input.object),
    designation: primaryDesignation(input.object),
    ra: formatRightAscension(input.object.raDeg),
    dec: formatDeclination(input.object.decDeg),
    type: objectTypeLabel(input.object.type),
    constellation: input.constellation?.trim() || "",
    frameFillPercent: input.frameFillPercent == null ? "" : String(Math.round(input.frameFillPercent)),
    usableHours: input.usableHours == null ? "" : roundHours(input.usableHours).toFixed(1),
    band,
    listName: input.listName,
  };
}

export function buildPlanCsv(rows: PlanCsvRow[]): string {
  const lines = [PLAN_CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      PLAN_CSV_HEADERS.map((key) => escapeCsvField(row[key])).join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
