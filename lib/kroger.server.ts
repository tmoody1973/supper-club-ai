import "server-only";

import type { PartyPlan } from "@/lib/types";

type KrogerTokenResponse = { access_token?: string; expires_in?: number; token_type?: string; error?: string; error_description?: string };
type KrogerLocation = {
  locationId?: string;
  name?: string;
  chain?: string;
  address?: { addressLine1?: string; city?: string; state?: string; zipCode?: string };
};
type KrogerProduct = {
  productId?: string;
  description?: string;
  brand?: string;
  productPageURI?: string;
  items?: Array<{
    itemId?: string;
    size?: string;
    soldBy?: string;
    price?: { regular?: number; promo?: number };
    inventory?: { stockLevel?: string };
  }>;
};

const API_BASE = "https://api.kroger.com/v1";
const timeoutSignal = (signal: AbortSignal) => AbortSignal.any([signal, AbortSignal.timeout(10_000)]);
let tokenCache: { value: string; expiresAt: number } | undefined;
type PricingLine = Record<string, unknown> & { lineTotal?: number; status: "PRICED" | "UNPRICED" };
type PricingSnapshot = {
  provider: "Kroger";
  store: { locationId: string; name: string; chain?: string; address: string };
  estimate: {
    subtotal: number;
    currency: "USD";
    pricedItems: number;
    totalItems: number;
    coveragePercent: number;
    status: "COMPLETE" | "PARTIAL";
    confidence: "LOW" | "MEDIUM";
    mediumConfidenceItems: number;
    lowConfidenceItems: number;
    planBudget: number;
    remainingPlanBudget: number;
    isWithinPlanBudget: boolean;
    note: string;
  };
  lines: PricingLine[];
  retrievedAt: string;
};
const pricingCache = new Map<string, { expiresAt: number; snapshot: PricingSnapshot }>();

const pageSnapshot = (snapshot: PricingSnapshot, page: number, pageSize: number) => {
  const safePageSize = Math.min(5, Math.max(1, pageSize));
  const totalPages = Math.max(1, Math.ceil(snapshot.lines.length / safePageSize));
  const safePage = Math.min(totalPages, Math.max(1, page));
  const start = (safePage - 1) * safePageSize;
  return {
    ...snapshot,
    page: { number: safePage, pageSize: safePageSize, totalPages, totalItems: snapshot.lines.length },
    lines: snapshot.lines.slice(start, start + safePageSize),
  };
};

const credentials = () => {
  const clientId = process.env.KROGER_CLIENT_ID?.trim();
  const clientSecret = process.env.KROGER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("KROGER_NOT_CONFIGURED");
  return { clientId, clientSecret };
};

const accessToken = async (signal: AbortSignal) => {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  const { clientId, clientSecret } = credentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${API_BASE}/connect/oauth2/token`, {
    method: "POST",
    signal: timeoutSignal(signal),
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "product.compact" }),
  });
  const payload = await response.json() as KrogerTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(`KROGER_AUTH_${response.status}:${payload.error_description ?? payload.error ?? "token unavailable"}`);
  }
  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 1_800) * 1_000,
  };
  return tokenCache.value;
};

const krogerGet = async <T>(path: string, params: Record<string, string>, signal: AbortSignal): Promise<T> => {
  const token = await accessToken(signal);
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
  const response = await fetch(url, {
    signal: timeoutSignal(signal),
    headers: { authorization: `Bearer ${token}`, accept: "application/json", "cache-control": "no-cache" },
  });
  const payload = await response.json() as T & { errors?: Array<{ reason?: string; description?: string }> };
  if (!response.ok) {
    const reason = payload.errors?.map((item) => item.description ?? item.reason).filter(Boolean).join("; ");
    throw new Error(`KROGER_${response.status}:${reason || "request failed"}`);
  }
  return payload;
};

export async function findKrogerStores(zipCode: string, radiusInMiles: number, limit: number, signal: AbortSignal) {
  if (!/^\d{5}$/.test(zipCode)) throw new Error("INVALID_ZIP_CODE");
  const payload = await krogerGet<{ data?: KrogerLocation[] }>("/locations", {
    "filter.zipCode.near": zipCode,
    "filter.radiusInMiles": String(Math.min(25, Math.max(1, radiusInMiles))),
    "filter.limit": String(Math.min(5, Math.max(1, limit))),
  }, signal);
  const stores = (payload.data ?? []).flatMap((location) => {
    if (!location.locationId || !location.name || !location.address?.city || !location.address.state) return [];
    return [{
      locationId: location.locationId,
      name: location.name,
      chain: location.chain ?? "Kroger family",
      address: [location.address.addressLine1, location.address.city, location.address.state, location.address.zipCode].filter(Boolean).join(", "),
    }];
  });
  return { stores, provider: "Kroger", zipCode, retrievedAt: new Date().toISOString() };
}

const canonical = (value: string) => value
  .toLowerCase()
  .replace(/\bchickpeas?\b/g, "garbanzo bean")
  .replace(/\bscallions?\b/g, "green onion")
  .replace(/\bconfectioners'? sugar\b/g, "powdered sugar")
  .replace(/\bcoriander leaves?\b/g, "cilantro")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const tokens = (value: string) => new Set(canonical(value).split(/\s+/).filter((word) => word.length > 1));
const overlap = (left: Set<string>, right: Set<string>) => [...left].filter((word) => right.has(word)).length;

type Dimension = "WEIGHT_OZ" | "VOLUME_FLOZ" | "COUNT";
type Measured = { value: number; dimension: Dimension };

const desiredMeasure = (value: number, unit: string): Measured | undefined => {
  const normalized = unit.toLowerCase();
  if (normalized === "gram") return { value: value / 28.3495, dimension: "WEIGHT_OZ" };
  if (normalized === "ounce") return { value, dimension: "WEIGHT_OZ" };
  if (normalized === "pound") return { value: value * 16, dimension: "WEIGHT_OZ" };
  if (normalized === "milliliter") return { value: value / 29.5735, dimension: "VOLUME_FLOZ" };
  if (normalized === "cup") return { value: value * 8, dimension: "VOLUME_FLOZ" };
  if (normalized === "tablespoon") return { value: value * 0.5, dimension: "VOLUME_FLOZ" };
  if (normalized === "teaspoon") return { value: value / 6, dimension: "VOLUME_FLOZ" };
  if (normalized === "quart") return { value: value * 32, dimension: "VOLUME_FLOZ" };
  if (["item", "slice", "sprig", "stalk"].includes(normalized)) return { value, dimension: "COUNT" };
  return undefined;
};

const packageMeasure = (size?: string): Measured | undefined => {
  if (!size) return undefined;
  const match = size.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|lb|kg|g|gal|qt|pt|ct|count)\b/);
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2].replace(/\s+/g, "");
  if (unit === "oz") return { value, dimension: "WEIGHT_OZ" };
  if (unit === "lb") return { value: value * 16, dimension: "WEIGHT_OZ" };
  if (unit === "g") return { value: value / 28.3495, dimension: "WEIGHT_OZ" };
  if (unit === "kg") return { value: value * 35.274, dimension: "WEIGHT_OZ" };
  if (unit === "floz") return { value, dimension: "VOLUME_FLOZ" };
  if (unit === "gal") return { value: value * 128, dimension: "VOLUME_FLOZ" };
  if (unit === "qt") return { value: value * 32, dimension: "VOLUME_FLOZ" };
  if (unit === "pt") return { value: value * 16, dimension: "VOLUME_FLOZ" };
  return { value, dimension: "COUNT" };
};

const ingredientQuantities = (plan: PartyPlan, itemId: string) => {
  const ingredientId = itemId.replace(/^shop-/, "");
  return plan.courses.flatMap((course) => course.ingredients.flatMap((ingredient) =>
    ingredient.ingredientId === ingredientId && ingredient.normalizedQuantity
      ? [{ ...ingredient.normalizedQuantity, courseId: course.courseId }]
      : []));
};

const packageCount = (quantities: Array<{ value: number; unit: string }>, size?: string) => {
  const desired = quantities.map((item) => desiredMeasure(item.value, item.unit));
  const pack = packageMeasure(size);
  if (!pack || desired.some((item) => !item) || desired.some((item) => item?.dimension !== pack.dimension)) {
    return { packages: 1, confidence: "LOW" as const, reason: "Package size could not be reconciled with the recipe unit; one package is estimated." };
  }
  const total = desired.reduce((sum, item) => sum + (item?.value ?? 0), 0);
  return { packages: Math.max(1, Math.ceil(total / pack.value)), confidence: "MEDIUM" as const, reason: "Package count was estimated from normalized recipe quantity and retailer package size." };
};

const searchProducts = async (term: string, locationId: string, signal: AbortSignal) => {
  const payload = await krogerGet<{ data?: KrogerProduct[] }>("/products", {
    "filter.term": term,
    "filter.locationId": locationId,
    "filter.limit": "5",
  }, signal);
  return payload.data ?? [];
};

export async function pricePlanAtKroger(plan: PartyPlan, locationId: string, page: number, pageSize: number, signal: AbortSignal) {
  if (!/^\d{5,12}$/.test(locationId)) throw new Error("INVALID_LOCATION_ID");
  const cacheKey = `${plan.planId}:${plan.planVersion}:${locationId}`;
  const cached = pricingCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return pageSnapshot(cached.snapshot, page, pageSize);
  const locationPayload = await krogerGet<{ data?: KrogerLocation }>(`/locations/${encodeURIComponent(locationId)}`, {}, signal);
  const location = locationPayload.data;
  if (!location?.locationId || !location.name) throw new Error("KROGER_LOCATION_NOT_FOUND");

  const priced: PricingLine[] = [];
  for (let offset = 0; offset < plan.shopping.length; offset += 4) {
    const batch = plan.shopping.slice(offset, offset + 4);
    const results = await Promise.all(batch.map(async (shoppingItem) => {
      const quantities = ingredientQuantities(plan, shoppingItem.itemId);
      let products: KrogerProduct[];
      try {
        products = await searchProducts(shoppingItem.label, locationId, signal);
      } catch {
        return {
          itemId: shoppingItem.itemId,
          ingredient: shoppingItem.label,
          quantity: shoppingItem.quantity,
          sourceCourseIds: shoppingItem.sourceCourseIds,
          sourceCourses: plan.courses.filter((course) => shoppingItem.sourceCourseIds.includes(course.courseId)).map((course) => ({ courseId: course.courseId, title: course.title })),
          status: "UNPRICED" as const,
          reason: "The retailer search was unavailable for this ingredient.",
        };
      }
      const queryTokens = tokens(shoppingItem.label);
      const candidates = products.flatMap((product) => (product.items ?? []).flatMap((item) => {
        const regular = item.price?.regular;
        const promo = item.price?.promo;
        const unitPrice = typeof promo === "number" && promo > 0 ? promo : regular;
        if (!product.productId || !product.description || typeof unitPrice !== "number" || unitPrice <= 0) return [];
        const score = overlap(queryTokens, tokens(product.description)) * 10 + (item.inventory?.stockLevel === "HIGH" ? 3 : 0) - (item.inventory?.stockLevel === "TEMPORARILY_OUT_OF_STOCK" ? 20 : 0);
        return [{ product, item, unitPrice, regular, promo, score }];
      })).sort((left, right) => right.score - left.score || left.unitPrice - right.unitPrice);
      const selected = candidates[0];
      if (!selected) return {
        itemId: shoppingItem.itemId,
        ingredient: shoppingItem.label,
        quantity: shoppingItem.quantity,
        sourceCourseIds: shoppingItem.sourceCourseIds,
        sourceCourses: plan.courses.filter((course) => shoppingItem.sourceCourseIds.includes(course.courseId)).map((course) => ({ courseId: course.courseId, title: course.title })),
        status: "UNPRICED" as const,
        reason: "No in-store product with a usable price was returned.",
      };
      const count = packageCount(quantities, selected.item.size);
      const lineTotal = Number((selected.unitPrice * count.packages).toFixed(2));
      return {
        itemId: shoppingItem.itemId,
        ingredient: shoppingItem.label,
        quantity: shoppingItem.quantity,
        sourceCourseIds: shoppingItem.sourceCourseIds,
        sourceCourses: plan.courses.filter((course) => shoppingItem.sourceCourseIds.includes(course.courseId)).map((course) => ({ courseId: course.courseId, title: course.title })),
        status: "PRICED" as const,
        productId: selected.product.productId,
        product: selected.product.description,
        brand: selected.product.brand,
        packageSize: selected.item.size,
        packages: count.packages,
        unitPrice: selected.unitPrice,
        regularPrice: selected.regular,
        promoPrice: selected.promo && selected.promo > 0 ? selected.promo : undefined,
        stockLevel: selected.item.inventory?.stockLevel,
        lineTotal,
        confidence: count.confidence,
        rationale: count.reason,
        productUrl: selected.product.productPageURI ? `https://www.kroger.com${selected.product.productPageURI}` : undefined,
      };
    }));
    priced.push(...results);
  }

  const matched = priced.filter((item) => item.status === "PRICED");
  const subtotal = Number(matched.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0).toFixed(2));
  const mediumConfidenceItems = matched.filter((item) => item.confidence === "MEDIUM").length;
  const lowConfidenceItems = matched.filter((item) => item.confidence === "LOW").length;
  const snapshot: PricingSnapshot = {
    provider: "Kroger",
    store: {
      locationId: location.locationId,
      name: location.name,
      chain: location.chain,
      address: [location.address?.addressLine1, location.address?.city, location.address?.state, location.address?.zipCode].filter(Boolean).join(", "),
    },
    estimate: {
      subtotal,
      currency: "USD" as const,
      pricedItems: matched.length,
      totalItems: priced.length,
      coveragePercent: priced.length ? Math.round((matched.length / priced.length) * 100) : 0,
      status: matched.length === priced.length ? "COMPLETE" as const : "PARTIAL" as const,
      confidence: lowConfidenceItems > mediumConfidenceItems ? "LOW" : "MEDIUM",
      mediumConfidenceItems,
      lowConfidenceItems,
      planBudget: plan.budget.amount,
      remainingPlanBudget: Number((plan.budget.amount - subtotal).toFixed(2)),
      isWithinPlanBudget: subtotal <= plan.budget.amount,
      note: "Estimate uses retailer package prices and estimated package counts. It excludes tax, delivery, fees, loyalty-only pricing, substitutions, and optional purchasing decisions.",
    },
    lines: priced,
    retrievedAt: new Date().toISOString(),
  };
  pricingCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, snapshot });
  return pageSnapshot(snapshot, page, pageSize);
}
