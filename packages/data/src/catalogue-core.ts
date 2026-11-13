import { parseCatalogue, type DeepSkyObject } from "@dss/core";
import rows from "../catalogue/core.json";
import { applyCommonNames } from "./common-names";

const parsed: DeepSkyObject[] = parseCatalogue(rows);
const applied = applyCommonNames(parsed);

export const deepSkyCore: DeepSkyObject[] = applied.objects;
export const coreCommonNamesAdded = applied.named;
