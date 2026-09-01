import "server-only";

export type GrapeMindsWine = {
  id: number;
  displayName: string;
  color: "red" | "white" | "rose";
  subType: "still" | "sparkling";
  residualSugar?: string;
  producerName?: string;
  regionName?: string;
  country?: string;
};

export type GrapeMindsWineQuery = {
  color: GrapeMindsWine["color"];
  subType?: GrapeMindsWine["subType"];
  perPage?: number;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const safeId = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;

const normalizeWine = (value: unknown): GrapeMindsWine | undefined => {
  if (!isRecord(value)) return undefined;
  const id = safeId(value.id);
  const displayName = nonEmptyString(value.display_name);
  const color = nonEmptyString(value.color)?.toLowerCase();
  const subType = nonEmptyString(value.sub_type)?.toLowerCase();
  if (!id || !displayName || !color || !["red", "white", "rose"].includes(color)) return undefined;
  if (!subType || !["still", "sparkling"].includes(subType)) return undefined;
  const producer = isRecord(value.producer) ? value.producer : undefined;
  const region = isRecord(value.region) ? value.region : undefined;
  return {
    id,
    displayName: displayName.slice(0, 180),
    color: color as GrapeMindsWine["color"],
    subType: subType as GrapeMindsWine["subType"],
    residualSugar: nonEmptyString(value.residual_sugar)?.slice(0, 40),
    producerName: nonEmptyString(producer?.display_name ?? producer?.name)?.slice(0, 120),
    regionName: nonEmptyString(region?.name)?.slice(0, 100),
    country: nonEmptyString(region?.country)?.slice(0, 8).toUpperCase(),
  };
};

const parseWineList = (value: unknown) => {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("GrapeMinds returned an unexpected wine-list response.");
  }
  const wines = value.data.map(normalizeWine).filter((wine): wine is GrapeMindsWine => Boolean(wine));
  if (!wines.length) throw new Error("GrapeMinds returned no usable wine records.");
  return wines;
};

export async function listGrapeMindsWines(
  query: GrapeMindsWineQuery,
  signal: AbortSignal,
): Promise<GrapeMindsWine[]> {
  const key = process.env.GRAPEMINDS_API_KEY;
  if (!key) throw new Error("GRAPEMINDS_API_KEY is not configured");
  const url = new URL("https://api.grapeminds.eu/public/v1/wines");
  url.searchParams.set("color", query.color);
  if (query.subType) url.searchParams.set("sub_type", query.subType);
  url.searchParams.set("per_page", String(Math.min(100, Math.max(1, query.perPage ?? 20))));
  const timeout = AbortSignal.timeout(8_000);
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, timeout]),
    headers: {
      accept: "application/json",
      "accept-language": "en",
      authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GrapeMinds returned ${response.status}.`);
  return parseWineList(await response.json());
}
