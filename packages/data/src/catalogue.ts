import { parseCatalogue, type DeepSkyObject } from "@dss/core";
import rows from "../catalogue/deep-sky.json";

export const deepSkyCatalogue: DeepSkyObject[] = parseCatalogue(rows);
