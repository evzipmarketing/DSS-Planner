/**
 * Starter asterism catalogue — well-known informal star patterns.
 * Coordinates are approximate J2000 for the principal stars.
 */

export type AsterismStar = {
  id: string;
  name: string;
  raDeg: number;
  decDeg: number;
};

export type Asterism = {
  id: string;
  name: string;
  aliases: string[];
  constellation: string;
  description: string;
  stars: AsterismStar[];
  /** Optional stick-figure edges as star id pairs. */
  edges: [string, string][];
};

function star(id: string, name: string, raHours: number, decDeg: number): AsterismStar {
  return { id, name, raDeg: raHours * 15, decDeg };
}

export const ASTERISMS: Asterism[] = [
  {
    id: "big-dipper",
    name: "Big Dipper",
    aliases: ["Plough", "Saucepan"],
    constellation: "Ursa Major",
    description: "The familiar ladle in Ursa Major — seven bright stars.",
    stars: [
      star("dubhe", "Dubhe", 11.0621, 61.751),
      star("merak", "Merak", 11.0306, 56.382),
      star("phecda", "Phecda", 11.8971, 53.695),
      star("megrez", "Megrez", 12.2571, 57.033),
      star("alioth", "Alioth", 12.9004, 55.96),
      star("mizar", "Mizar", 13.3987, 54.925),
      star("alkaid", "Alkaid", 13.7923, 49.313),
    ],
    edges: [
      ["dubhe", "merak"],
      ["merak", "phecda"],
      ["phecda", "megrez"],
      ["megrez", "dubhe"],
      ["megrez", "alioth"],
      ["alioth", "mizar"],
      ["mizar", "alkaid"],
    ],
  },
  {
    id: "little-dipper",
    name: "Little Dipper",
    aliases: ["Little Bear"],
    constellation: "Ursa Minor",
    description: "Ursa Minor’s dipper with Polaris at the handle tip.",
    stars: [
      star("polaris", "Polaris", 2.5303, 89.264),
      star("yildun", "Yildun", 17.5369, 86.586),
      star("epsilon-umi", "ε UMi", 16.7661, 82.037),
      star("zeta-umi", "ζ UMi", 15.7343, 77.795),
      star("coschab", "Kochab", 14.8451, 74.155),
      star("pherkad", "Pherkad", 15.3455, 71.834),
    ],
    edges: [
      ["polaris", "yildun"],
      ["yildun", "epsilon-umi"],
      ["epsilon-umi", "zeta-umi"],
      ["zeta-umi", "coschab"],
      ["coschab", "pherkad"],
      ["pherkad", "zeta-umi"],
    ],
  },
  {
    id: "summer-triangle",
    name: "Summer Triangle",
    aliases: [],
    constellation: "Multiple",
    description: "Vega, Deneb, and Altair — the bright summer sky triangle.",
    stars: [
      star("vega", "Vega", 18.6156, 38.783),
      star("deneb", "Deneb", 20.6905, 45.28),
      star("altair", "Altair", 19.8463, 8.868),
    ],
    edges: [
      ["vega", "deneb"],
      ["deneb", "altair"],
      ["altair", "vega"],
    ],
  },
  {
    id: "winter-triangle",
    name: "Winter Triangle",
    aliases: [],
    constellation: "Multiple",
    description: "Betelgeuse, Sirius, and Procyon framing the winter Milky Way.",
    stars: [
      star("betelgeuse", "Betelgeuse", 5.9195, 7.407),
      star("sirius", "Sirius", 6.7525, -16.716),
      star("procyon", "Procyon", 7.655, 5.225),
    ],
    edges: [
      ["betelgeuse", "sirius"],
      ["sirius", "procyon"],
      ["procyon", "betelgeuse"],
    ],
  },
  {
    id: "winter-hexagon",
    name: "Winter Hexagon",
    aliases: ["Winter Circle"],
    constellation: "Multiple",
    description: "Huge winter asterism ringing Orion: Rigel through Capella and back.",
    stars: [
      star("rigel", "Rigel", 5.2423, -8.202),
      star("aldeb", "Aldebaran", 4.5987, 16.509),
      star("capella", "Capella", 5.2781, 45.998),
      star("castor", "Castor", 7.5766, 31.888),
      star("pollux", "Pollux", 7.7553, 28.026),
      star("procyon-wh", "Procyon", 7.655, 5.225),
      star("sirius-wh", "Sirius", 6.7525, -16.716),
    ],
    edges: [
      ["rigel", "aldeb"],
      ["aldeb", "capella"],
      ["capella", "castor"],
      ["castor", "pollux"],
      ["pollux", "procyon-wh"],
      ["procyon-wh", "sirius-wh"],
      ["sirius-wh", "rigel"],
    ],
  },
  {
    id: "great-square",
    name: "Great Square of Pegasus",
    aliases: ["Autumn Square"],
    constellation: "Pegasus",
    description: "Four corner stars of Pegasus — a large autumn landmark.",
    stars: [
      star("markab", "Markab", 23.0793, 15.205),
      star("scheat", "Scheat", 23.0629, 28.083),
      star("algeneib", "Algenib", 0.2206, 15.183),
      star("alpheratz", "Alpheratz", 0.1398, 29.091),
    ],
    edges: [
      ["markab", "scheat"],
      ["scheat", "alpheratz"],
      ["alpheratz", "algeneib"],
      ["algeneib", "markab"],
    ],
  },
  {
    id: "northern-cross",
    name: "Northern Cross",
    aliases: [],
    constellation: "Cygnus",
    description: "The Cygnus cross: Deneb, Sadr, and the wing tips.",
    stars: [
      star("deneb-nc", "Deneb", 20.6905, 45.28),
      star("sadr", "Sadr", 20.3719, 40.257),
      star("gienah", "Gienah", 20.7701, 33.97),
      star("delta-cyg", "δ Cyg", 19.749, 45.131),
      star("albireo", "Albireo", 19.512, 27.96),
    ],
    edges: [
      ["deneb-nc", "sadr"],
      ["sadr", "albireo"],
      ["gienah", "sadr"],
      ["sadr", "delta-cyg"],
    ],
  },
  {
    id: "teapot",
    name: "Teapot",
    aliases: ["Sagittarius Teapot"],
    constellation: "Sagittarius",
    description: "The teapot outline in Sagittarius, pouring toward the galactic center.",
    stars: [
      star("kaus-aus", "Kaus Australis", 18.4028, -34.384),
      star("nunki", "Nunki", 18.9211, -26.297),
      star("ascella", "Ascella", 19.0435, -29.88),
      star("kaus-med", "Kaus Media", 18.2938, -29.828),
      star("kaus-bor", "Kaus Borealis", 18.4661, -25.421),
      star("albaldah", "Albaldah", 19.1627, -21.024),
    ],
    edges: [
      ["kaus-aus", "nunki"],
      ["nunki", "ascella"],
      ["ascella", "kaus-aus"],
      ["kaus-aus", "kaus-med"],
      ["kaus-med", "kaus-bor"],
      ["kaus-bor", "albaldah"],
      ["albaldah", "nunki"],
    ],
  },
  {
    id: "orions-belt",
    name: "Orion's Belt",
    aliases: ["Three Kings", "Three Sisters"],
    constellation: "Orion",
    description: "Alnitak, Alnilam, and Mintaka in a straight winter line.",
    stars: [
      star("alnitak", "Alnitak", 5.6793, -1.943),
      star("alnilam", "Alnilam", 5.6036, -1.202),
      star("mintaka", "Mintaka", 5.5334, -0.299),
    ],
    edges: [
      ["alnitak", "alnilam"],
      ["alnilam", "mintaka"],
    ],
  },
  {
    id: "orion",
    name: "Orion",
    aliases: ["The Hunter"],
    constellation: "Orion",
    description: "Classic hunter outline: shoulders, belt, and knees.",
    stars: [
      star("betel-or", "Betelgeuse", 5.9195, 7.407),
      star("bellatrix", "Bellatrix", 5.4188, 6.35),
      star("alnitak-or", "Alnitak", 5.6793, -1.943),
      star("alnilam-or", "Alnilam", 5.6036, -1.202),
      star("mintaka-or", "Mintaka", 5.5334, -0.299),
      star("saiph", "Saiph", 5.7959, -9.67),
      star("rigel-or", "Rigel", 5.2423, -8.202),
    ],
    edges: [
      ["betel-or", "bellatrix"],
      ["bellatrix", "mintaka-or"],
      ["mintaka-or", "alnilam-or"],
      ["alnilam-or", "alnitak-or"],
      ["alnitak-or", "saiph"],
      ["saiph", "rigel-or"],
      ["rigel-or", "mintaka-or"],
      ["betel-or", "alnitak-or"],
    ],
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    aliases: ["W of Cassiopeia", "M of Cassiopeia"],
    constellation: "Cassiopeia",
    description: "The bright W (or M) of the northern queen.",
    stars: [
      star("schedar", "Schedar", 0.6751, 56.537),
      star("caph", "Caph", 0.1529, 59.15),
      star("gamma-cas", "Navi", 0.9451, 60.717),
      star("ruchbah", "Ruchbah", 1.4302, 60.235),
      star("segin", "Segin", 1.9066, 63.67),
    ],
    edges: [
      ["caph", "schedar"],
      ["schedar", "gamma-cas"],
      ["gamma-cas", "ruchbah"],
      ["ruchbah", "segin"],
    ],
  },
  {
    id: "sickle",
    name: "Sickle of Leo",
    aliases: ["Lion's Head", "Question Mark"],
    constellation: "Leo",
    description: "The backwards question mark marking Leo’s head, with Regulus at the tip.",
    stars: [
      star("regulus", "Regulus", 10.1395, 11.967),
      star("eta-leo", "η Leo", 10.1222, 16.763),
      star("algieba", "Algieba", 10.3328, 19.842),
      star("adhaferea", "Adhafera", 10.2781, 23.417),
      star("rasalas", "Rasalas", 9.8794, 26.007),
      star("alterf", "Alterf", 9.6858, 22.968),
    ],
    edges: [
      ["regulus", "eta-leo"],
      ["eta-leo", "algieba"],
      ["algieba", "adhaferea"],
      ["adhaferea", "rasalas"],
      ["rasalas", "alterf"],
    ],
  },
  {
    id: "keystone",
    name: "Keystone",
    aliases: ["Hercules Keystone"],
    constellation: "Hercules",
    description: "Four mid-brightness stars forming Hercules’ body.",
    stars: [
      star("pi-her", "π Her", 17.2505, 36.809),
      star("eta-her", "η Her", 16.7149, 38.922),
      star("zeta-her", "ζ Her", 16.6881, 31.603),
      star("epsilon-her", "ε Her", 17.0046, 30.926),
    ],
    edges: [
      ["pi-her", "eta-her"],
      ["eta-her", "zeta-her"],
      ["zeta-her", "epsilon-her"],
      ["epsilon-her", "pi-her"],
    ],
  },
  {
    id: "corona-borealis",
    name: "Northern Crown",
    aliases: ["Corona Borealis", "Circlet of Corona"],
    constellation: "Corona Borealis",
    description: "The semicircle of Corona Borealis with Alphecca at the gem.",
    stars: [
      star("alphecca", "Alphecca", 15.5781, 26.715),
      star("nusakan", "Nusakan", 15.4638, 29.106),
      star("theta-crb", "θ CrB", 15.5489, 31.359),
      star("gamma-crb", "γ CrB", 15.7111, 26.295),
      star("delta-crb", "δ CrB", 15.8241, 26.068),
      star("epsilon-crb", "ε CrB", 15.9571, 26.878),
      star("iota-crb", "ι CrB", 16.0244, 29.851),
    ],
    edges: [
      ["theta-crb", "nusakan"],
      ["nusakan", "alphecca"],
      ["alphecca", "gamma-crb"],
      ["gamma-crb", "delta-crb"],
      ["delta-crb", "epsilon-crb"],
      ["epsilon-crb", "iota-crb"],
    ],
  },
  {
    id: "coathanger",
    name: "Coathanger",
    aliases: ["Brocchi's Cluster", "Cr 399"],
    constellation: "Vulpecula",
    description: "A tiny binocular asterism that looks like an upside-down coathanger.",
    stars: [
      star("cr399-1", "4 Vul", 19.2917, 19.783),
      star("cr399-2", "5 Vul", 19.3083, 20.0),
      star("cr399-3", "7 Vul", 19.3417, 20.15),
      star("cr399-4", "HD 182955", 19.425, 20.2),
      star("cr399-5", "HD 182955b", 19.4583, 20.05),
      star("cr399-6", "HD 183261", 19.4917, 19.9),
      star("cr399-hook", "Lucida", 19.3583, 20.183),
    ],
    edges: [
      ["cr399-1", "cr399-2"],
      ["cr399-2", "cr399-3"],
      ["cr399-3", "cr399-4"],
      ["cr399-4", "cr399-5"],
      ["cr399-5", "cr399-6"],
      ["cr399-3", "cr399-hook"],
    ],
  },
  {
    id: "jobs-coffin",
    name: "Job's Coffin",
    aliases: ["Dolphin"],
    constellation: "Delphinus",
    description: "The compact diamond of Delphinus nicknamed Job’s Coffin.",
    stars: [
      star("sualocin", "Sualocin", 20.6606, 15.912),
      star("rotanev", "Rotanev", 20.6258, 14.595),
      star("gamma-del", "γ Del", 20.7776, 16.124),
      star("delta-del", "δ Del", 20.7245, 15.075),
    ],
    edges: [
      ["sualocin", "rotanev"],
      ["rotanev", "delta-del"],
      ["delta-del", "gamma-del"],
      ["gamma-del", "sualocin"],
    ],
  },
  {
    id: "spring-triangle",
    name: "Spring Triangle",
    aliases: [],
    constellation: "Multiple",
    description: "Arcturus, Spica, and Regulus spanning the spring sky.",
    stars: [
      star("arcturus", "Arcturus", 14.261, 19.182),
      star("spica", "Spica", 13.4199, -11.161),
      star("regulus-st", "Regulus", 10.1395, 11.967),
    ],
    edges: [
      ["arcturus", "spica"],
      ["spica", "regulus-st"],
      ["regulus-st", "arcturus"],
    ],
  },
  {
    id: "diamond-virgo",
    name: "Diamond of Virgo",
    aliases: ["Virgo Diamond"],
    constellation: "Multiple",
    description: "Arcturus, Spica, Denebola, and Cor Caroli framing the Virgo Cluster region.",
    stars: [
      star("arcturus-dv", "Arcturus", 14.261, 19.182),
      star("spica-dv", "Spica", 13.4199, -11.161),
      star("denebola", "Denebola", 11.8177, 14.572),
      star("cor-caroli", "Cor Caroli", 12.9338, 38.318),
    ],
    edges: [
      ["arcturus-dv", "spica-dv"],
      ["spica-dv", "denebola"],
      ["denebola", "cor-caroli"],
      ["cor-caroli", "arcturus-dv"],
    ],
  },
  {
    id: "southern-cross",
    name: "Southern Cross",
    aliases: ["Crux"],
    constellation: "Crux",
    description: "The compact southern cross — a southern-hemisphere landmark.",
    stars: [
      star("acrux", "Acrux", 12.4433, -63.099),
      star("mimosa", "Mimosa", 12.7953, -59.689),
      star("gacrux", "Gacrux", 12.5194, -57.113),
      star("delta-cru", "δ Cru", 12.2524, -58.749),
    ],
    edges: [
      ["acrux", "gacrux"],
      ["mimosa", "delta-cru"],
    ],
  },
  {
    id: "fishhook",
    name: "Fish Hook",
    aliases: ["Scorpius Hook"],
    constellation: "Scorpius",
    description: "The curved stinger of Scorpius from Antares down to Shaula.",
    stars: [
      star("antares", "Antares", 16.4901, -26.432),
      star("tau-sco", "τ Sco", 16.5986, -28.216),
      star("epsilon-sco", "ε Sco", 16.8339, -34.293),
      star("upsilon-sco", "Lesath", 17.5122, -37.296),
      star("shaula", "Shaula", 17.5601, -37.104),
    ],
    edges: [
      ["antares", "tau-sco"],
      ["tau-sco", "epsilon-sco"],
      ["epsilon-sco", "upsilon-sco"],
      ["upsilon-sco", "shaula"],
    ],
  },
  {
    id: "circlet-pisces",
    name: "Circlet of Pisces",
    aliases: ["Western Fish"],
    constellation: "Pisces",
    description: "The faint circlet marking the western fish of Pisces.",
    stars: [
      star("theta-psc", "θ Psc", 23.4658, 6.379),
      star("iota-psc", "ι Psc", 23.6652, 5.626),
      star("lambda-psc", "λ Psc", 23.7041, 1.78),
      star("kappa-psc", "κ Psc", 23.4504, 1.255),
      star("tx-psc", "TX Psc", 23.7711, 3.482),
      star("19-psc", "19 Psc", 23.7692, 3.482),
    ],
    edges: [
      ["theta-psc", "iota-psc"],
      ["iota-psc", "lambda-psc"],
      ["lambda-psc", "kappa-psc"],
      ["kappa-psc", "theta-psc"],
    ],
  },
  {
    id: "water-jar",
    name: "Water Jar",
    aliases: ["Aquarius Urn"],
    constellation: "Aquarius",
    description: "The compact Y-shaped water jar in Aquarius.",
    stars: [
      star("sadalmelik", "Sadalmelik", 22.0963, -0.32),
      star("sadachbia", "Sadachbia", 22.9108, -15.821),
      star("skat", "Skat", 22.9608, -15.821),
      star("eta-aqr", "η Aqr", 22.5893, -0.117),
      star("zeta-aqr", "ζ Aqr", 22.4805, -0.001),
      star("pi-aqr", "π Aqr", 22.2913, 1.388),
      star("gamma-aqr", "γ Aqr", 22.2806, -1.387),
    ],
    edges: [
      ["zeta-aqr", "eta-aqr"],
      ["eta-aqr", "pi-aqr"],
      ["pi-aqr", "gamma-aqr"],
      ["gamma-aqr", "zeta-aqr"],
      ["zeta-aqr", "sadalmelik"],
    ],
  },
  {
    id: "false-cross",
    name: "False Cross",
    aliases: [],
    constellation: "Multiple",
    description: "A southern cross lookalike from Carina and Vela — larger and askew of Crux.",
    stars: [
      star("avior", "Avior", 8.3752, -59.51),
      star("aspidiske", "Aspidiske", 9.2847, -59.275),
      star("delta-vel", "δ Vel", 8.7451, -54.708),
      star("kappa-vel", "κ Vel", 9.3686, -55.011),
    ],
    edges: [
      ["avior", "aspidiske"],
      ["delta-vel", "kappa-vel"],
    ],
  },
];

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchAsterisms(query: string, limit = 40): Asterism[] {
  const q = normalizeSearchText(query);
  if (!q) return ASTERISMS.slice(0, limit);
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = ASTERISMS.map((item) => {
    const name = normalizeSearchText(item.name);
    const aliases = item.aliases.map((alias) => normalizeSearchText(alias));
    const constellation = normalizeSearchText(item.constellation);
    const hay = normalizeSearchText(
      `${item.name} ${item.aliases.join(" ")} ${item.constellation} ${item.description} ${item.stars.map((s) => s.name).join(" ")}`,
    );
    let score = 0;
    if (name === q) score += 100;
    else if (name.startsWith(q)) score += 80;
    else if (name.includes(q)) score += 60;
    if (aliases.some((alias) => alias.includes(q))) score += 40;
    if (constellation.includes(q)) score += 25;
    if (tokens.every((token) => hay.includes(token))) score += 20;
    else if (hay.includes(q)) score += 10;
    return { item, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((row) => row.item);
}

export function getAsterism(id: string): Asterism | undefined {
  return ASTERISMS.find((item) => item.id === id);
}
