#!/usr/bin/env node
/**
 * ingest.mjs — normalize the paleo.gg scrape into the app's dataset.
 *
 *   scraper/jwe3_dinos.json  (raw, source of truth)
 *        -> data/species.json      (app schema)
 *        -> data/formations.json   (dig-site formations, for Formation rulesets)
 *        -> data/manifest.json     (freshness + provenance)
 *
 * Re-run after any re-scrape:  node scripts/ingest.mjs
 *
 * Data-quality rules applied here (reported at the end):
 *  - "None" sentinel in cohabitation lists is dropped.
 *  - Relationship names are resolved to slugs via the species name index.
 *  - If a species both likes AND dislikes another, DISLIKE WINS. A missed
 *    conflict is the dangerous error; a missed "like" only costs a nudge.
 *  - Dig sites are normalized ("Hell Creek Formation A" -> "Hell Creek Formation").
 *  - Continent slugs that leaked instead of labels are mapped back to a region.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(root, "scraper", "jwe3_dinos.json");

// ---- parsing helpers -------------------------------------------------------

const num = (v) => {
  if (v == null) return undefined;
  const n = parseFloat(String(v).replace(/,/g, "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

/** "4593 | 23%" -> {area:4593, pct:23};  "9437" -> {area:9437} */
const parseNeedValue = (v) => {
  const [areaPart, pctPart] = String(v).split("|").map((s) => s.trim());
  const area = num(areaPart);
  const pct = pctPart != null ? num(pctPart) : undefined;
  return { area: area ?? 0, ...(pct != null ? { pct } : {}) };
};

/** "≤2" -> {max:2}; "≥1" -> {min:1}; "1 - 2" -> {min:1,max:2}; "2" -> {min:2,max:2} */
const parseBound = (v) => {
  if (v == null) return {};
  const s = String(v).trim();
  const range = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) return { min: +range[1], max: +range[2] };
  if (s.startsWith("≤")) return { max: num(s) };
  if (s.startsWith("≥")) return { min: num(s) };
  const n = num(s);
  return n != null ? { min: n, max: n } : {};
};

const splitList = (v) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== "none");

/** "Hell Creek Formation A" / "Lance Formation Site A" -> base formation name */
const normalizeSite = (s) =>
  s
    .replace(/\s+Site\s+[A-Z]$/i, "")
    .replace(/\s+[A-Z]$/, "")
    .trim();

const CONTINENT_FIXUPS = { "jwe3-digsite:india": "Asia" };

const HABITAT = { Terrestrial: "land", Aquatic: "marine", Aerial: "aviary" };

/** Needs a plant can satisfy; everything else is terrain/water infrastructure. */
const PLANT_NEEDS = new Set([
  "Cover",
  "Pasture",
  "Ground Leaf",
  "Ground Fiber",
  "Ground Fruit",
  "Ground Nut",
  "Tall Leaf",
  "Tall Fruit",
  "Tall Nut",
]);
/** Needs satisfied by a feeder rather than terrain or flora. */
const FOOD_NEEDS = new Set(["Prey", "Fish", "Meat"]);

// ---- main ------------------------------------------------------------------

const raw = JSON.parse(readFileSync(RAW, "utf8"));

const nameToSlug = new Map(raw.map((d) => [d.name.toLowerCase(), d.slug]));
const resolve = (names) =>
  names.map((n) => nameToSlug.get(n.toLowerCase())).filter(Boolean);

const report = {
  total: raw.length,
  unresolvedNames: new Set(),
  contradictions: [],
  missingDigSites: [],
  missingFamily: [],
};

const formationCounts = new Map();

const species = raw.map((d) => {
  const cls = d.Classification ?? {};
  const cohab = d["Cohabitation Preferences"] ?? {};
  const opt = (d["Cohabitation Preferences_options"] ?? [])[0] ?? {};

  // --- relationships (dislike wins over like) ---
  const likeNames = splitList(cohab.Likes);
  const dislikeNames = splitList(cohab.Dislikes);
  [...likeNames, ...dislikeNames].forEach((n) => {
    if (!nameToSlug.has(n.toLowerCase())) report.unresolvedNames.add(n);
  });
  const dislikes = resolve(dislikeNames);
  const dislikeSet = new Set(dislikes);
  const likesAll = resolve(likeNames);
  const likes = likesAll.filter((s) => !dislikeSet.has(s));
  if (likes.length !== likesAll.length) {
    report.contradictions.push({
      species: d.slug,
      demoted: likesAll.filter((s) => dislikeSet.has(s)),
    });
  }

  // --- environment needs ---
  const envRaw = d["Environmental Needs"] ?? {};
  const envNeeds = [];
  let comfort;
  for (const [key, value] of Object.entries(envRaw)) {
    if (key === "Comfort") {
      comfort = value;
      continue;
    }
    const need = key.replace(/\s*\(m²\)\s*$/, "").trim();
    const { area, pct } = parseNeedValue(value);
    envNeeds.push({
      need,
      area,
      ...(pct != null ? { pct } : {}),
      kind: PLANT_NEEDS.has(need) ? "plant" : FOOD_NEEDS.has(need) ? "food" : "terrain",
    });
  }

  // --- population / sex constraints ---
  const social = parseBound(opt["Social Group"]);
  const ideal = parseBound(opt["Ideal Population"]);
  const male = parseBound(opt.male);
  const female = parseBound(opt.female);
  const juvenile = parseBound(opt.juvenile);

  // --- dig sites -> formations + continents ---
  const unlock = d["Unlock requirements_options"] ?? [];
  const formations = new Set();
  const continents = new Set();
  for (const row of unlock) {
    splitList(row["Dig Sites"]).forEach((s) => {
      const f = normalizeSite(s);
      if (f) {
        formations.add(f);
        formationCounts.set(f, (formationCounts.get(f) ?? 0) + 1);
      }
    });
    const loc = String(row.Locations ?? "").split("┗")[0].trim();
    if (loc) continents.add(CONTINENT_FIXUPS[loc] ?? loc);
  }
  if (formations.size === 0) report.missingDigSites.push(d.slug);
  if (!cls.Family) report.missingFamily.push(d.slug);

  const breeding = d.Breeding ?? {};

  return {
    id: d.slug,
    name: d.name,
    family: cls.Family ?? "Unknown",
    genus: cls.Genus ?? undefined,
    bioGroup: cls["Bio Group"] ?? undefined,
    lifestyle: HABITAT[cls.Habitat] ?? "land",
    period: d.Era ?? cls.Era ?? "Unknown",
    // Every "Holocene" entry in this source is a genetically engineered hybrid
    // (Indominus rex, Indoraptor, ...) — no fossil record, so it can't be
    // judged anachronistic the way a real animal can.
    isHybrid: (d.Era ?? cls.Era) === "Holocene",

    appeal: num(d["Base Appeal"]) ?? 0,
    appealPerHectare: num(d["Appeal (Per Hectare)"]),
    dominance: num(d["Base Dominance"]),
    security: num(d["Security Rating"]) ?? 0,

    diet: splitList(d.Diet),
    size: d.Size?.Size,
    heightM: num(d["Height (m)"]),
    lengthM: num(d["Length (m)"]),
    weightKg: num(d["Weight (kg)"]),

    comfort,
    envNeeds,
    /** % the area requirement grows per additional animal */
    areaNeedGrowth: num(opt["Area Need Growth"]) ?? 0,

    socialGroupMin: social.min,
    socialGroupMax: social.max,
    minPopulation: ideal.min ?? social.min ?? 1,
    maxMales: male.max,
    maxFemales: female.max,
    maxJuveniles: juvenile.max,

    likes,
    dislikes,

    nestSize: breeding["Nest Size"],
    nestLocation: breeding["Nest Location"],

    formations: [...formations],
    continents: [...continents],

    releaseVersion: d["Release Version"] ?? d.release_version,
    imageUrl: d.image_url,
    description: d.Description_text,
  };
});

// formations worth offering as a ruleset (>= 2 species can actually co-exist)
const formations = [...formationCounts.entries()]
  .filter(([, n]) => n >= 2)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([name, count]) => ({ name, count }));

writeFileSync(join(root, "data", "species.json"), JSON.stringify(species, null, 2) + "\n");
writeFileSync(join(root, "data", "formations.json"), JSON.stringify(formations, null, 2) + "\n");

// ---- rulesets (generated so they always match the dataset) ----------------
// No canon-era rulesets: the paleo.gg source carries no film-canon data.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const eraCounts = new Map();
for (const s of species) eraCounts.set(s.period, (eraCounts.get(s.period) ?? 0) + 1);

const rulesets = [
  {
    id: "sandbox",
    kind: "sandbox",
    label: "Sandbox",
    note: "Anything goes — no accuracy checks.",
  },
  ...[...eraCounts.entries()]
    .filter(([era, n]) => n >= 3 && era !== "Unknown")
    .sort((a, b) => b[1] - a[1])
    .map(([era]) => ({
      id: `period-${slug(era)}`,
      kind: "period",
      label: `Period · ${era}`,
      period: era,
      note: "Species from other periods are flagged, not hidden.",
    })),
  ...formations
    .filter((f) => f.count >= 3)
    .map((f) => ({
      id: `formation-${slug(f.name)}`,
      kind: "formation",
      label: `Formation · ${f.name.replace(/\s+Formation$/, "")}`,
      formation: f.name,
      note: "Species that never shared this dig-site formation are flagged.",
    })),
];
writeFileSync(join(root, "data", "rulesets.json"), JSON.stringify(rulesets, null, 2) + "\n");
writeFileSync(
  join(root, "data", "manifest.json"),
  JSON.stringify(
    {
      asOf: "Jul 2026",
      provenance: "paleo.gg DinoDB",
      sourceUrl: "https://www.paleo.gg/games/jurassic-world-evolution-3/dino-db",
      note:
        "Generated by scripts/ingest.mjs from scraper/jwe3_dinos.json. Do not edit by hand. " +
        "Canon-era, variant and precise-mya data are not in this source (see README).",
    },
    null,
    2,
  ) + "\n",
);

// ---- report ----------------------------------------------------------------
console.log(`species written      : ${species.length}`);
console.log(`formations (>=2 spp) : ${formations.length}`);
console.log(`rulesets generated   : ${rulesets.length}`);
console.log(`unresolved names     : ${report.unresolvedNames.size}`, [...report.unresolvedNames]);
console.log(`like/dislike clashes : ${report.contradictions.length} (dislike wins)`);
console.log(`no dig-site data     : ${report.missingDigSites.length}`, report.missingDigSites);
console.log(`missing family       : ${report.missingFamily.length}`, report.missingFamily);
const noPlantNeeds = species.filter((s) => !s.envNeeds.some((n) => n.kind === "plant")).length;
console.log(`species w/o plant needs: ${noPlantNeeds}`);
