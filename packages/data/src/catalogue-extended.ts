import { parseCatalogue, type DeepSkyObject } from "@dss/core";
import rows from "../catalogue/extended.json";

export const deepSkyExtended: DeepSkyObject[] = parseCatalogue(rows);
