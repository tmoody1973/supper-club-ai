import "server-only";

import booksCatalog from "@/data/catalogs/books.json";
import {
  courseFromRecipe,
  pairingFromBeverage,
} from "@/lib/seed-plan";
import type {
  CurationRequest,
  CurationResponse,
  MenuCurationData,
  PairingCurationData,
  ProviderStatus,
  SoundtrackCurationData,
  ThemeCurationData,
} from "@/lib/curation-contracts";
import type {
  MenuCourse,
  SourceRef,
  ThemeIdea,
  ToolWarning,
  Track,
} from "@/lib/types";

type BookRecord = {
  title: string;
  authors: string[];
  themes: Array<{
    theme: string;
    explanation: string;
    experienceIdeas: string[];
    sourceIds: string[];
  }>;
  sourceRefs: SourceRef[];
};

type OpenLibrarySearch = {
  docs?: Array<{
    key?: string;
    title?: string;
    author_name?: string[];
    first_publish_year?: number;
    subject?: string[];
  }>;
};

type SpoonacularIngredient = {
  id?: number;
  name?: string;
  original?: string;
  aisle?: string;
};

type SpoonacularRecipe = {
  id?: number;
  title?: string;
  sourceUrl?: string;
  spoonacularSourceUrl?: string;
  servings?: number;
  readyInMinutes?: number;
  preparationMinutes?: number;
  cookingMinutes?: number;
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  diets?: string[];
  extendedIngredients?: SpoonacularIngredient[];
};

type SpoonacularSearch = { results?: SpoonacularRecipe[] };

type AppleMusicSearch = {
  results?: {
    songs?: {
      data?: Array<{
        id?: string;
        attributes?: {
          name?: string;
          artistName?: string;
          url?: string;
          previews?: Array<{ url?: string }>;
        };
      }>;
    };
  };
};

type DiscogsSearch = {
  results?: Array<{
    id?: number;
    title?: string;
    year?: number;
    genre?: string[];
    style?: string[];
    uri?: string;
  }>;
};

const accessedAt = () => new Date().toISOString();

const fallbackWarning = (provider: string, reason: string): ToolWarning => ({
  code: "PROVIDER_FALLBACK",
  message: `${provider} was not used (${reason}). Supper Club AI used its reviewed local catalog instead.`,
});

const fetchJson = async <T>(url: URL | string, init: RequestInit = {}): Promise<T> => {
  const timeout = AbortSignal.timeout(8_000);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  const response = await fetch(url, {
    ...init,
    signal,
    headers: {
      accept: "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Provider returned ${response.status}.`);
  }
  return (await response.json()) as T;
};

const normalizeText = (value: string) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replace(/<[^>]+>/g, "")
    .trim();

const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);

const sourceUrl = (recipe: SpoonacularRecipe) =>
  recipe.sourceUrl ?? recipe.spoonacularSourceUrl ??
  `https://spoonacular.com/recipes/${slug(recipe.title ?? "recipe")}-${recipe.id ?? ""}`;

const ingredientCategory = (ingredient: SpoonacularIngredient): string => {
  const aisle = (ingredient.aisle ?? "").toLowerCase();
  if (/produce|fruit|vegetable/.test(aisle)) return "PRODUCE";
  if (/refrigerated|cheese|milk|yogurt/.test(aisle)) return "REFRIGERATED";
  if (/frozen/.test(aisle)) return "FROZEN";
  if (/bakery|bread/.test(aisle)) return "BAKERY";
  if (/beverage|alcohol|wine/.test(aisle)) return "BEVERAGES";
  return "PANTRY";
};

const inferAllergens = (ingredients: SpoonacularIngredient[]) => {
  const names = ingredients.map((item) => item.name?.toLowerCase() ?? "").join(" ");
  const allergens: string[] = [];
  if (/peanut/.test(names)) allergens.push("PEANUT");
  if (/almond|cashew|walnut|pecan|pistachio|hazelnut/.test(names)) allergens.push("TREE_NUT");
  if (/milk|butter|cream|cheese|yogurt/.test(names)) allergens.push("MILK");
  if (/egg/.test(names)) allergens.push("EGG");
  if (/wheat|flour|bread|pasta/.test(names)) allergens.push("WHEAT");
  if (/soy|tofu|miso|tempeh/.test(names)) allergens.push("SOY");
  if (/sesame|tahini/.test(names)) allergens.push("SESAME");
  if (/shrimp|crab|lobster/.test(names)) allergens.push("CRUSTACEAN_SHELLFISH");
  if (/fish|salmon|tuna|cod|anchov/.test(names)) allergens.push("FISH");
  return allergens;
};

const dietaryTags = (recipe: SpoonacularRecipe) => {
  const tags = new Set<string>();
  if (recipe.vegan) tags.add("VEGAN");
  if (recipe.vegetarian) tags.add("VEGETARIAN");
  if (recipe.glutenFree) tags.add("GLUTEN_FREE");
  if (recipe.dairyFree) tags.add("DAIRY_FREE");
  for (const diet of recipe.diets ?? []) tags.add(diet.toUpperCase().replaceAll(" ", "_"));
  return [...tags];
};

const recipeToCourse = (
  recipe: SpoonacularRecipe,
  courseId: string,
  role: MenuCourse["role"],
  servings: number,
): MenuCourse => {
  if (!recipe.id || !recipe.title) throw new Error("Recipe result is missing an id or title.");
  const ingredients = recipe.extendedIngredients ?? [];
  const url = sourceUrl(recipe);
  const source: SourceRef = {
    sourceId: `src-spoonacular-${recipe.id}`,
    provider: "Spoonacular",
    title: normalizeText(recipe.title),
    url,
    accessedAt: accessedAt(),
    attribution: "Recipe discovery metadata supplied by Spoonacular; host must review the original source.",
    licenseNote: "Instructions and images remain at the linked source unless separate rights are confirmed.",
  };
  const total = Math.max(1, recipe.readyInMinutes ?? 45);
  const prep = recipe.preparationMinutes ?? Math.min(20, Math.round(total / 3));
  const cook = recipe.cookingMinutes ?? Math.max(1, total - prep);
  return {
    courseId,
    recipeId: `spoonacular-${recipe.id}`,
    role,
    title: normalizeText(recipe.title),
    subtitle: "Live recipe discovery for host review",
    description: `A ${role.toLowerCase()} candidate discovered for the current guest and dietary constraints. Review the source before confirming it for the table.`,
    servings,
    ingredients: ingredients.slice(0, 24).map((ingredient, index) => ({
      ingredientId: `ingredient-${ingredient.id ?? slug(ingredient.name ?? String(index))}`,
      name: normalizeText(ingredient.name ?? "ingredient"),
      quantityText: normalizeText(ingredient.original ?? ingredient.name ?? "quantity at source"),
      category: ingredientCategory(ingredient),
      isOptional: false,
    })),
    instructionsUrl: url,
    prepMinutes: prep,
    cookMinutes: cook,
    dietaryTags: dietaryTags(recipe),
    allergens: inferAllergens(ingredients),
    themeConnection: "A live candidate chosen to support a generous shared meal; cultural and thematic framing remains with the host.",
    sourceId: source.sourceId,
    source,
    confirmed: false,
  };
};

const localCourses = (servings: number): MenuCourse[] => {
  const courses = [
    courseFromRecipe("recipe-black-eyed-pea-fritters", "course-first", "STARTER", "Seeds become a first offering"),
    courseFromRecipe("recipe-yassa-style-mushrooms-and-onions", "course-main", "MAIN", "Adaptation through brightness and patience"),
    courseFromRecipe("recipe-hibiscus-poached-pears", "course-dessert", "DESSERT", "A bright future held in common"),
  ];
  courses.forEach((course) => { course.servings = servings; });
  return courses;
};

async function researchTheme(
  request: Extract<CurationRequest, { action: "RESEARCH_THEME" }>,
  signal: AbortSignal,
): Promise<CurationResponse<ThemeCurationData>> {
  const localBook = (booksCatalog.items as BookRecord[]).find(
    (book) => book.title.toLowerCase() === request.inspiration.title.toLowerCase(),
  ) ?? (booksCatalog.items as BookRecord[])[0];
  const requested = new Set(request.requestedThemes.map((item) => item.toLowerCase()));
  const ideas: ThemeIdea[] = localBook.themes
    .filter((item) => requested.size === 0 || requested.has(item.theme.toLowerCase()))
    .map((item) => ({
      themeId: `theme-${item.theme.toLowerCase()}`,
      name: item.theme,
      interpretation: item.explanation,
      experienceIdeas: item.experienceIdeas,
      sourceIds: item.sourceIds,
    }));
  const fallbackIdeas = ideas.length ? ideas : localBook.themes.slice(0, 4).map((item) => ({
    themeId: `theme-${item.theme.toLowerCase()}`,
    name: item.theme,
    interpretation: item.explanation,
    experienceIdeas: item.experienceIdeas,
    sourceIds: item.sourceIds,
  }));
  const base: ThemeCurationData = {
    headline: "Change is a practice we tend together",
    framing: `${request.inspiration.title} becomes a hospitable lens for change, mutual care, climate awareness, and practical resilience.`,
    ideas: fallbackIdeas,
    source: localBook.sourceRefs[0],
  };

  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("title", request.inspiration.title);
    url.searchParams.set("author", request.inspiration.author);
    url.searchParams.set("limit", "1");
    url.searchParams.set("fields", "key,title,author_name,first_publish_year,subject");
    const payload = await fetchJson<OpenLibrarySearch>(url, { signal });
    const book = payload.docs?.[0];
    if (!book?.key || !book.title) throw new Error("No matching work was returned.");
    const source: SourceRef = {
      sourceId: `src-open-library-${book.key.replaceAll("/", "-")}`,
      provider: "Open Library",
      title: `${book.title}${book.author_name?.length ? ` by ${book.author_name.join(", ")}` : ""}`,
      url: `https://openlibrary.org${book.key}`,
      accessedAt: accessedAt(),
      attribution: "Bibliographic metadata from Open Library; Supper Club AI thematic notes are original.",
      licenseNote: "Metadata does not grant rights to reproduce book text, covers, or previews.",
    };
    return {
      ok: true,
      mode: "HYBRID",
      provider: "Open Library + reviewed theme catalog",
      data: { ...base, source },
      sources: [source],
      warnings: [],
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "provider unavailable";
    return {
      ok: true,
      mode: "LOCAL_FALLBACK",
      provider: "Reviewed book catalog",
      data: base,
      sources: [base.source],
      warnings: [fallbackWarning("Open Library", reason)],
    };
  }
}

async function curateMenu(
  request: Extract<CurationRequest, { action: "CURATE_MENU" }>,
  signal: AbortSignal,
): Promise<CurationResponse<MenuCurationData>> {
  const key = process.env.SPOONACULAR_API_KEY;
  const fallback = localCourses(request.servings);
  if (!key) {
    return {
      ok: true,
      mode: "LOCAL_FALLBACK",
      provider: "Reviewed recipe catalog",
      data: { courses: fallback, estimatedMenuCost: { amount: 118, currency: "USD", confidence: "LOW" } },
      sources: fallback.map((course) => course.source),
      warnings: [fallbackWarning("Spoonacular", "SPOONACULAR_API_KEY is not configured")],
    };
  }

  const searches: Array<{ role: MenuCourse["role"]; type: string; query: string; courseId: string }> = [
    { role: "STARTER", type: "appetizer", query: "vegan gluten free appetizer", courseId: "course-first" },
    { role: "MAIN", type: "main course", query: "vegan gluten free dinner", courseId: "course-main" },
    { role: "DESSERT", type: "dessert", query: "vegan gluten free fruit dessert", courseId: "course-dessert" },
  ];
  try {
    const results = await Promise.all(searches.map(async (search) => {
      const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
      url.searchParams.set("query", search.query);
      url.searchParams.set("type", search.type);
      url.searchParams.set("number", "1");
      url.searchParams.set("addRecipeInformation", "true");
      url.searchParams.set("fillIngredients", "true");
      url.searchParams.set("instructionsRequired", "false");
      const payload = await fetchJson<SpoonacularSearch>(url, {
        signal,
        headers: { "x-api-key": key },
      });
      const recipe = payload.results?.[0];
      if (!recipe) throw new Error(`No ${search.role.toLowerCase()} candidate was returned.`);
      return recipeToCourse(recipe, search.courseId, search.role, request.servings);
    }));
    return {
      ok: true,
      mode: "LIVE",
      provider: "Spoonacular",
      data: { courses: results, estimatedMenuCost: { amount: 118, currency: "USD", confidence: "LOW" } },
      sources: results.map((course) => course.source),
      warnings: [{
        code: "LIVE_RECIPE_REVIEW",
        message: "Live recipe candidates are unconfirmed. Verify the original instructions, ingredient labels, allergens, cultural framing, and cross-contact before serving.",
        affectedIds: results.map((course) => course.courseId),
      }],
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "provider unavailable";
    return {
      ok: true,
      mode: "LOCAL_FALLBACK",
      provider: "Reviewed recipe catalog",
      data: { courses: fallback, estimatedMenuCost: { amount: 118, currency: "USD", confidence: "LOW" } },
      sources: fallback.map((course) => course.source),
      warnings: [fallbackWarning("Spoonacular", reason)],
    };
  }
}

async function curatePairings(
  request: Extract<CurationRequest, { action: "CURATE_PAIRINGS" }>,
): Promise<CurationResponse<PairingCurationData>> {
  const map: Record<MenuCourse["role"], { wine: string; zero: string }> = {
    STARTER: { wine: "wine-cremant-dalsace-brut", zero: "zero-proof-sparkling-verjus-orange" },
    MAIN: { wine: "wine-south-african-chenin-blanc", zero: "zero-proof-ginger-lemon-soda" },
    DESSERT: { wine: "wine-late-harvest-chenin-blanc", zero: "zero-proof-coconut-water-lime" },
  };
  const pairings = request.courses.flatMap((course) => {
    const values = [];
    if (request.includeWine) values.push(pairingFromBeverage(
      map[course.role].wine,
      course.courseId,
      `pair-${course.courseId}-wine`,
      `Selected for the ${course.role.toLowerCase()} course's spice, texture, and acidity.`,
    ));
    if (request.includeZeroProof) values.push(pairingFromBeverage(
      map[course.role].zero,
      course.courseId,
      `pair-${course.courseId}-zero`,
      "A complete alcohol-free pairing with equal attention to structure and finish.",
    ));
    return values;
  });
  return {
    ok: true,
    mode: "LOCAL_FALLBACK",
    provider: "Reviewed local wine catalog",
    data: { pairings },
    sources: pairings.map((pairing) => pairing.source),
    warnings: [{
      code: "LOCAL_WINE_CATALOG",
      message: "Pairings use reviewed style records, not current bottle, vintage, price, or retail availability claims.",
    }],
  };
}

const soundtrackSeeds = [
  { title: "Cellophane", artist: "FKA twigs", moment: "Arrival" },
  { title: "Suite for Max Brown", artist: "Jeff Parker", moment: "First course" },
  { title: "The Precision of Infinity", artist: "Jlin", moment: "Main table" },
  { title: "Space 1.8", artist: "Nala Sinephro", moment: "Listening interval" },
];

const localSoundtrack = (): Track[] => soundtrackSeeds.map((track, index) => ({
  trackId: `track-${index + 1}`,
  ...track,
  provider: "Apple Music",
  status: "DRAFT",
}));

async function discogsContext(
  title: string,
  artist: string,
  signal: AbortSignal,
): Promise<Track["releaseContext"] | undefined> {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) return undefined;
  const url = new URL("https://api.discogs.com/database/search");
  url.searchParams.set("q", `${artist} ${title}`);
  url.searchParams.set("type", "release");
  url.searchParams.set("per_page", "1");
  const payload = await fetchJson<DiscogsSearch>(url, {
    signal,
    headers: {
      authorization: `Discogs token=${token}`,
      "user-agent": process.env.DISCOGS_USER_AGENT ?? "SupperClubAI/0.1",
    },
  });
  const result = payload.results?.[0];
  if (!result?.id) return undefined;
  return {
    year: result.year,
    genres: result.genre ?? [],
    styles: result.style ?? [],
    source: {
      sourceId: `src-discogs-${result.id}`,
      provider: "Discogs",
      title: result.title ?? `${artist} — ${title}`,
      url: result.uri ? `https://www.discogs.com${result.uri}` : `https://www.discogs.com/release/${result.id}`,
      accessedAt: accessedAt(),
      attribution: "Release metadata supplied by Discogs.",
    },
  };
}

async function curateSoundtrack(
  request: Extract<CurationRequest, { action: "CURATE_SOUNDTRACK" }>,
  signal: AbortSignal,
): Promise<CurationResponse<SoundtrackCurationData>> {
  const token = process.env.APPLE_MUSIC_DEVELOPER_TOKEN;
  const fallback = localSoundtrack();
  if (!token) {
    return {
      ok: true,
      mode: "LOCAL_FALLBACK",
      provider: "Reviewed soundtrack anchors",
      data: { soundtrack: fallback, savedToLibrary: false },
      sources: [],
      warnings: [fallbackWarning("Apple Music", "APPLE_MUSIC_DEVELOPER_TOKEN is not configured")],
    };
  }
  try {
    const tracks = await Promise.all(soundtrackSeeds.map(async (seed, index) => {
      const url = new URL(`https://api.music.apple.com/v1/catalog/${encodeURIComponent(request.storefront)}/search`);
      url.searchParams.set("term", `${seed.artist} ${seed.title}`);
      url.searchParams.set("types", "songs");
      url.searchParams.set("limit", "1");
      const payload = await fetchJson<AppleMusicSearch>(url, {
        signal,
        headers: { authorization: `Bearer ${token}` },
      });
      const item = payload.results?.songs?.data?.[0];
      const attributes = item?.attributes;
      if (!item?.id || !attributes?.name || !attributes.artistName) {
        throw new Error(`No Apple Music match for ${seed.artist} — ${seed.title}.`);
      }
      const source: SourceRef = {
        sourceId: `src-apple-music-${item.id}`,
        provider: "Apple Music",
        title: `${attributes.artistName} — ${attributes.name}`,
        url: attributes.url ?? "https://music.apple.com/",
        accessedAt: accessedAt(),
        attribution: "Catalog metadata supplied by Apple Music.",
      };
      let releaseContext: Track["releaseContext"];
      try {
        releaseContext = await discogsContext(attributes.name, attributes.artistName, signal);
      } catch {
        releaseContext = undefined;
      }
      return {
        trackId: `apple-${item.id}`,
        providerId: item.id,
        title: attributes.name,
        artist: attributes.artistName,
        moment: seed.moment,
        provider: "Apple Music" as const,
        status: "DRAFT" as const,
        source,
        sourceUrl: source.url,
        previewUrl: attributes.previews?.[0]?.url,
        releaseContext,
        sequence: index + 1,
      };
    }));
    const sources = tracks.flatMap((track) => [track.source, track.releaseContext?.source].filter((item): item is SourceRef => Boolean(item)));
    return {
      ok: true,
      mode: process.env.DISCOGS_TOKEN ? "HYBRID" : "LIVE",
      provider: process.env.DISCOGS_TOKEN ? "Apple Music + Discogs" : "Apple Music",
      data: { soundtrack: tracks, savedToLibrary: false },
      sources,
      warnings: process.env.DISCOGS_TOKEN ? [] : [{
        code: "DISCOGS_NOT_CONFIGURED",
        message: "Apple Music catalog matches are live; Discogs historical enrichment is not configured.",
      }],
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "provider unavailable";
    return {
      ok: true,
      mode: "LOCAL_FALLBACK",
      provider: "Reviewed soundtrack anchors",
      data: { soundtrack: fallback, savedToLibrary: false },
      sources: [],
      warnings: [fallbackWarning("Apple Music", reason)],
    };
  }
}

export function providerStatus(): ProviderStatus[] {
  return [
    { provider: "Open Library", configured: true, mode: "LIVE" },
    { provider: "Spoonacular", configured: Boolean(process.env.SPOONACULAR_API_KEY), mode: "LIVE" },
    { provider: "Local wine catalog", configured: true, mode: "LOCAL" },
    { provider: "Apple Music", configured: Boolean(process.env.APPLE_MUSIC_DEVELOPER_TOKEN), mode: "LIVE" },
    { provider: "Discogs", configured: Boolean(process.env.DISCOGS_TOKEN), mode: "OPTIONAL_ENRICHMENT" },
  ];
}

export async function curate(
  request: CurationRequest,
  signal: AbortSignal,
) {
  switch (request.action) {
    case "RESEARCH_THEME":
      return researchTheme(request, signal);
    case "CURATE_MENU":
      return curateMenu(request, signal);
    case "CURATE_PAIRINGS":
      return curatePairings(request);
    case "CURATE_SOUNDTRACK":
      return curateSoundtrack(request, signal);
  }
}
