import { parseCatalogue, type DeepSkyObject } from "@dss/core";
import rows from "../catalogue/extended.json";
import { applyCommonNames } from "./common-names";

const parsed: DeepSkyObject[] = parseCatalogue(rows);
const applied = applyCommonNames(parsed);

export const deepSkyExtended: DeepSkyObject[] = applied.objects;
export const extendedCommonNamesAdded = applied.named;
