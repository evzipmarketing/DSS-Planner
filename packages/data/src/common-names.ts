import type { DeepSkyObject } from "@dss/core";

/**
 * Widely accepted common names keyed by a catalogue id that appears on the object.
 * Only names in general use; nothing invented for this app.
 */
export const COMMON_NAMES_BY_ID: Readonly<Record<string, readonly string[]>> = {
  // User-listed targets and close cross-ids
  IC1805: ["Heart Nebula"],
  "Sh2-190": ["Heart Nebula"],
  IC1848: ["Soul Nebula"],
  IC1396: ["Elephant's Trunk Nebula"],
  "Sh2-131": ["Elephant's Trunk Nebula"],
  NGC7000: ["North America Nebula"],
  IC5070: ["Pelican Nebula"],
  NGC6960: ["Veil Nebula", "Western Veil", "Filamentary Nebula"],
  NGC6992: ["Veil Nebula", "Eastern Veil", "Network Nebula"],
  NGC6995: ["Veil Nebula", "Eastern Veil", "Network Nebula"],
  NGC6979: ["Pickering's Triangle"],
  IC434: ["Horsehead Nebula"],
  B33: ["Horsehead Nebula"],
  NGC2244: ["Rosette Nebula"],
  NGC2237: ["Rosette Nebula"],
  NGC2238: ["Rosette Nebula"],
  NGC2239: ["Rosette Nebula"],
  NGC2246: ["Rosette Nebula"],
  "Sh2-275": ["Rosette Nebula"],
  IC405: ["Flaming Star Nebula"],
  "Sh2-229": ["Flaming Star Nebula"],
  IC410: ["Tadpoles Nebula"],
  "Sh2-236": ["Tadpoles Nebula"],
  NGC281: ["Pacman Nebula"],
  "Sh2-129": ["Flying Bat Nebula"],
  NGC7635: ["Bubble Nebula"],
  "Sh2-162": ["Bubble Nebula"],
  IC5146: ["Cocoon Nebula"],
  "Sh2-125": ["Cocoon Nebula"],
  NGC1499: ["California Nebula"],

  // Other widely used deep-sky names missing from OpenNGC rows
  IC1795: ["Fish Head Nebula"],
  NGC896: ["Fish Head Nebula"],
  IC2177: ["Seagull Nebula"],
  "Sh2-292": ["Seagull Nebula"],
  NGC2174: ["Monkey Head Nebula"],
  NGC2175: ["Monkey Head Nebula"],
  "Sh2-252": ["Monkey Head Nebula"],
  NGC2359: ["Thor's Helmet"],
  NGC2467: ["Skull and Crossbones Nebula"],
  NGC6888: ["Crescent Nebula"],
  NGC7023: ["Iris Nebula"],
  NGC7293: ["Helix Nebula"],
  NGC6543: ["Cat's Eye Nebula"],
  NGC2392: ["Eskimo Nebula", "Clownface Nebula"],
  NGC3242: ["Ghost of Jupiter"],
  NGC7009: ["Saturn Nebula"],
  NGC7662: ["Blue Snowball Nebula"],
  NGC6826: ["Blinking Planetary"],
  NGC6210: ["Turtle Nebula"],
  NGC2261: ["Hubble's Variable Nebula"],
  NGC7380: ["Wizard Nebula"],
  "Sh2-142": ["Wizard Nebula"],
  NGC4565: ["Needle Galaxy"],
  NGC253: ["Sculptor Galaxy", "Silver Coin Galaxy"],
  NGC5128: ["Centaurus A"],
  NGC891: ["Silver Sliver Galaxy"],
  NGC2070: ["Tarantula Nebula"],
  NGC3372: ["Carina Nebula", "Eta Carinae Nebula"],
  NGC104: ["47 Tucanae"],
  NGC5139: ["Omega Centauri"],

  // Messier objects with widely accepted common names (skip those without)
  M1: ["Crab Nebula"],
  M6: ["Butterfly Cluster"],
  M7: ["Ptolemy's Cluster"],
  M8: ["Lagoon Nebula"],
  M11: ["Wild Duck Cluster"],
  M13: ["Hercules Globular Cluster", "Great Hercules Cluster"],
  M16: ["Eagle Nebula"],
  M17: ["Omega Nebula", "Swan Nebula", "Lobster Nebula", "Checkmark Nebula"],
  M20: ["Trifid Nebula"],
  M24: ["Sagittarius Star Cloud", "Small Sagittarius Star Cloud"],
  M27: ["Dumbbell Nebula"],
  M31: ["Andromeda Galaxy"],
  M32: ["Le Gentil"],
  M33: ["Triangulum Galaxy", "Triangulum Pinwheel"],
  M40: ["Winnecke 4"],
  M42: ["Great Orion Nebula", "Orion Nebula"],
  M43: ["De Mairan's Nebula", "Mairan's Nebula"],
  M44: ["Beehive Cluster", "Praesepe"],
  M45: ["Pleiades", "Seven Sisters"],
  M51: ["Whirlpool Galaxy"],
  M57: ["Ring Nebula"],
  M63: ["Sunflower Galaxy"],
  M64: ["Black Eye Galaxy", "Evil Eye Galaxy"],
  M74: ["Phantom Galaxy"],
  M76: ["Little Dumbbell Nebula", "Barbell Nebula", "Cork Nebula"],
  M77: ["Squid Galaxy"],
  M81: ["Bode's Galaxy"],
  M82: ["Cigar Galaxy"],
  M83: ["Southern Pinwheel Galaxy"],
  M87: ["Virgo A"],
  M97: ["Owl Nebula"],
  M99: ["Coma Pinwheel", "Virgo Cluster Pinwheel"],
  M101: ["Pinwheel Galaxy"],
  M102: ["Spindle Galaxy"],
  M104: ["Sombrero Galaxy"],
  M110: ["Andromeda Satellite"],
};

/** Merge known common names into catalogue rows. Returns how many objects gained at least one name. */
export function applyCommonNames(objects: DeepSkyObject[]): { objects: DeepSkyObject[]; named: number } {
  let named = 0;
  const next = objects.map((object) => {
    const extras: string[] = [];
    const seen = new Set(object.names);
    const keys = [object.id, ...object.aliases];
    if (object.messier != null) keys.push(`M${object.messier}`);
    for (const key of keys) {
      for (const name of COMMON_NAMES_BY_ID[key] ?? []) {
        if (seen.has(name)) continue;
        seen.add(name);
        extras.push(name);
      }
    }
    if (extras.length === 0) return object;
    named += 1;
    // Prefer a known common name as the title when the row had none.
    const names = object.names.length === 0 ? extras : [...object.names, ...extras];
    return { ...object, names };
  });
  return { objects: next, named };
}
