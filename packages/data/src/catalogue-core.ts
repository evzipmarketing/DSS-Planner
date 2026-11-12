import { parseCatalogue, type DeepSkyObject } from "@dss/core";
import rows from "../catalogue/core.json";

export const deepSkyCore: DeepSkyObject[] = parseCatalogue(rows);
