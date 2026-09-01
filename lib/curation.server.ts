import "server-only";

import booksCatalog from "@/data/catalogs/books.json";
import recipesCatalog from "@/data/catalogs/recipes.json";
import {
  buildCreativeBrief,
  themeIdeaFromVocabulary,
} from "@/lib/creative-brief";
import { curatePairingsWithFallback } from "@/lib/pairing-engine.server";
import { courseFromRecipe } from "@/lib/seed-plan";
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
  CreativeBrief,
  MenuCourse,
  SourceRef,
  ThemeIdea,
  ToolWarning,
  Track,
} from "@/lib/types";

type BookRecord = {
  title: string;
  authors: string[];
  summary?: string;
  subjects?: string[];
  themes: Array<{
    theme: string;
    explanation: string;
    experienceIdeas: string[];
    sourceIds: string[];
  }>;
  sourceRefs: SourceRef[];
};

type RecipeRecord = {
  id: string;
  title: string;
  summary: string;
  courseRoles: string[];
  times: { prepMinutes: number; cookMinutes: number; totalMinutes: number };
  dietaryTags: string[];
  allergens: string[];
  ingredients: Array<{ name: string; canonicalName?: string }>;
  themeConnections: Array<{ theme: string; explanation: string }>;
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

type AppleMusicArtwork = {
  width?: number;
  height?: number;
  url?: string;
  bgColor?: string;
};

type AppleMusicSong = {
  id?: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    url?: string;
    previews?: Array<{ url?: string }>;
    artwork?: AppleMusicArtwork;
  };
};

type AppleMusicSearch = {
  results?: {
    songs?: {
      data?: AppleMusicSong[];
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

const tokens = (values: string[]) =>
  new Set(values.join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean));

const normalizedDietaryRequirements = (requirements: string[]) => {
  const joined = requirements.join(" ").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return ["VEGAN", "VEGETARIAN", "GLUTEN_FREE", "DAIRY_FREE", "NUT_FREE"]
    .filter((tag) => joined.includes(tag));
};

const briefFoodWords = (brief?: CreativeBrief) => tokens([
  ...(brief?.themes ?? []),
  ...(brief?.ingredientMotifs ?? []),
  ...(brief?.flavorDirections ?? []),
]);

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
  brief?: CreativeBrief,
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
    themeConnection: brief?.themes.length
      ? `Chosen to carry ${brief.themes.slice(0, 2).map((theme) => theme.toLowerCase().replaceAll("_", " ")).join(" and ")} through flavor and shared service; cultural framing remains with the host.`
      : "A live candidate chosen to support a generous shared meal; cultural and thematic framing remains with the host.",
    sourceId: source.sourceId,
    source,
    confirmed: false,
  };
};

const recipes = recipesCatalog.items as RecipeRecord[];

const recipeScore = (
  recipe: RecipeRecord,
  role: MenuCourse["role"],
  brief?: CreativeBrief,
  dietaryRequirements: string[] = [],
  preparationMinutesMax?: number,
) => {
  if (!recipe.courseRoles.includes(role)) return Number.NEGATIVE_INFINITY;
  const required = normalizedDietaryRequirements(dietaryRequirements);
  if (required.some((tag) => !recipe.dietaryTags.includes(tag))) return Number.NEGATIVE_INFINITY;
  let score = 10;
  const briefWords = briefFoodWords(brief);
  const recipeWords = tokens([
    recipe.title,
    recipe.summary,
    ...recipe.ingredients.flatMap((ingredient) => [ingredient.name, ingredient.canonicalName ?? ""]),
  ]);
  briefWords.forEach((word) => { if (recipeWords.has(word)) score += 2; });
  const themes = new Set(brief?.themes ?? []);
  recipe.themeConnections.forEach((connection) => {
    if (themes.has(connection.theme)) score += 12;
  });
  if (preparationMinutesMax !== undefined) {
    score += recipe.times.totalMinutes <= preparationMinutesMax ? 5 : -Math.ceil((recipe.times.totalMinutes - preparationMinutesMax) / 15);
  }
  return score;
};

const courseSubtitle = (recipe: RecipeRecord, brief?: CreativeBrief) => {
  const matchedTheme = recipe.themeConnections.find((connection) => brief?.themes.includes(connection.theme));
  if (matchedTheme) return `${matchedTheme.theme.toLowerCase().replaceAll("_", " ")} at the table`;
  const motif = brief?.ingredientMotifs[0];
  return motif ? `${motif} as a shared gesture` : "A generous shared course";
};

const localCourses = (
  servings: number,
  brief?: CreativeBrief,
  dietaryRequirements: string[] = [],
  preparationMinutesMax?: number,
): MenuCourse[] => {
  const roles: Array<{ role: MenuCourse["role"]; courseId: string }> = [
    { role: "STARTER", courseId: "course-first" },
    { role: "MAIN", courseId: "course-main" },
    { role: "DESSERT", courseId: "course-dessert" },
  ];
  const courses = roles.map(({ role, courseId }) => {
    const candidates = recipes
      .map((recipe) => ({
        recipe,
        score: recipeScore(recipe, role, brief, dietaryRequirements, preparationMinutesMax),
      }))
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort((left, right) => right.score - left.score);
    const candidate = candidates[0]?.recipe;
    if (!candidate) {
      throw new Error(`No reviewed ${role.toLowerCase()} satisfies the dietary requirements.`);
    }
    const course = courseFromRecipe(candidate.id, courseId, role, courseSubtitle(candidate, brief));
    const themeConnection = candidate.themeConnections.find((connection) => brief?.themes.includes(connection.theme));
    if (themeConnection) course.themeConnection = themeConnection.explanation;
    return course;
  });
  courses.forEach((course) => { course.servings = servings; });
  return courses;
};

async function researchTheme(
  request: Extract<CurationRequest, { action: "RESEARCH_THEME" }>,
  signal: AbortSignal,
): Promise<CurationResponse<ThemeCurationData>> {
  const localBook = (booksCatalog.items as BookRecord[]).find(
    (book) => book.title.toLowerCase() === request.inspiration.title.toLowerCase(),
  );
  const editorialSource: SourceRef = {
    sourceId: "src-supper-club-theme-framework",
    provider: "Supper Club AI",
    title: "Original cultural-host theme framework",
    url: "https://github.com/tmoody1973/supper-club-ai",
    accessedAt: accessedAt(),
    attribution: "Original theme vocabulary and hosting interpretation by Supper Club AI.",
    licenseNote: "Does not reproduce book text or imply author or estate endorsement.",
  };
  const requested = new Set(request.requestedThemes.map((item) => item.toLowerCase()));
  const catalogIdeas: ThemeIdea[] = localBook?.themes.map((item) => ({
    themeId: `theme-${item.theme.toLowerCase()}`,
    name: item.theme,
    interpretation: item.explanation,
    experienceIdeas: item.experienceIdeas,
    sourceIds: item.sourceIds,
  })) ?? [];
  const requestedIdeas = request.requestedThemes.map((theme) =>
    themeIdeaFromVocabulary(theme, editorialSource.sourceId));
  const filteredIdeas = catalogIdeas.filter(
    (item) => requested.size === 0 || requested.has(item.name.toLowerCase()),
  );
  const fallbackIdeas = filteredIdeas.length
    ? filteredIdeas
    : requestedIdeas.length
      ? requestedIdeas
      : catalogIdeas.length
        ? catalogIdeas.slice(0, 4)
        : ["COMMUNITY", "CHANGE", "RESILIENCE"].map((theme) =>
          themeIdeaFromVocabulary(theme, editorialSource.sourceId));
  const creativeBrief = buildCreativeBrief({
    title: request.inspiration.title,
    author: request.inspiration.author,
    themes: fallbackIdeas.map((idea) => idea.name),
    tone: request.tone,
    provenance: localBook ? "REVIEWED_CATALOG" : "BIBLIOGRAPHIC_METADATA",
  });
  const themePhrase = creativeBrief.themes
    .slice(0, 3)
    .map((theme) => theme.toLowerCase().replaceAll("_", " "))
    .join(", ");
  const base: ThemeCurationData = {
    headline: `${request.inspiration.title}: a table for ${themePhrase}`,
    framing: `${request.inspiration.title} becomes a hospitable lens for ${themePhrase}. The interpretation guides atmosphere, flavor, service, and music without reproducing the book.`,
    ideas: fallbackIdeas,
    source: localBook?.sourceRefs[0] ?? editorialSource,
    creativeBrief,
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
  const fallback = localCourses(
    request.servings,
    request.creativeBrief,
    request.dietaryRequirements,
    request.preparationMinutesMax,
  );
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

  const motifs = request.creativeBrief?.ingredientMotifs ?? [];
  const searches: Array<{ role: MenuCourse["role"]; type: string; query: string; courseId: string }> = [
    { role: "STARTER", type: "appetizer", query: motifs.slice(0, 2).join(" ") || "seasonal vegetable", courseId: "course-first" },
    { role: "MAIN", type: "main course", query: motifs.slice(1, 4).join(" ") || "shared vegetable dinner", courseId: "course-main" },
    { role: "DESSERT", type: "dessert", query: motifs.slice(-2).join(" ") || "fruit dessert", courseId: "course-dessert" },
  ];
  const requiredDiet = normalizedDietaryRequirements(request.dietaryRequirements);
  const diet = requiredDiet.includes("VEGAN") ? "vegan" : requiredDiet.includes("VEGETARIAN") ? "vegetarian" : undefined;
  const intolerances = [
    requiredDiet.includes("GLUTEN_FREE") ? "gluten" : undefined,
    requiredDiet.includes("DAIRY_FREE") ? "dairy" : undefined,
    requiredDiet.includes("NUT_FREE") ? "peanut" : undefined,
    requiredDiet.includes("NUT_FREE") ? "tree nut" : undefined,
  ].filter((item): item is string => Boolean(item));
  try {
    const results = await Promise.all(searches.map(async (search) => {
      const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
      url.searchParams.set("query", search.query);
      url.searchParams.set("type", search.type);
      url.searchParams.set("number", "4");
      url.searchParams.set("addRecipeInformation", "true");
      url.searchParams.set("fillIngredients", "true");
      url.searchParams.set("instructionsRequired", "false");
      if (diet) url.searchParams.set("diet", diet);
      if (intolerances.length) url.searchParams.set("intolerances", intolerances.join(","));
      if (request.preparationMinutesMax) url.searchParams.set("maxReadyTime", String(request.preparationMinutesMax));
      const payload = await fetchJson<SpoonacularSearch>(url, {
        signal,
        headers: { "x-api-key": key },
      });
      const briefWords = briefFoodWords(request.creativeBrief);
      const recipe = [...(payload.results ?? [])].sort((left, right) => {
        const score = (candidate: SpoonacularRecipe) => {
          const candidateWords = tokens([
            candidate.title ?? "",
            ...(candidate.extendedIngredients ?? []).flatMap((ingredient) => [ingredient.name ?? "", ingredient.original ?? ""]),
          ]);
          let value = 0;
          briefWords.forEach((word) => { if (candidateWords.has(word)) value += 1; });
          return value;
        };
        return score(right) - score(left);
      })[0];
      if (!recipe) throw new Error(`No ${search.role.toLowerCase()} candidate was returned.`);
      return recipeToCourse(recipe, search.courseId, search.role, request.servings, request.creativeBrief);
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
  signal: AbortSignal,
): Promise<CurationResponse<PairingCurationData>> {
  return curatePairingsWithFallback(request, signal);
}

type SoundtrackSeed = { title: string; artist: string; moment: string };

const soundtrackAnchors: SoundtrackSeed[] = [
  { title: "Cellophane", artist: "FKA twigs", moment: "Arrival" },
  { title: "Suite for Max Brown", artist: "Jeff Parker", moment: "First course" },
  { title: "The Precision of Infinity", artist: "Jlin", moment: "Main table" },
  { title: "Space 1", artist: "Nala Sinephro", moment: "Listening interval" },
];

const musicSeedsByTheme: Record<string, SoundtrackSeed[]> = {
  CLIMATE: [
    { title: "Space 1", artist: "Nala Sinephro", moment: "Arrival" },
    { title: "Black Origami", artist: "Jlin", moment: "Main table" },
  ],
  RESILIENCE: [
    { title: "Rise", artist: "Solange", moment: "Arrival" },
    { title: "Optimistic", artist: "Sounds of Blackness", moment: "Closing" },
  ],
  COMMUNITY: [
    { title: "Free", artist: "SAULT", moment: "First course" },
    { title: "People Everywhere (Still Alive)", artist: "Khruangbin", moment: "Main table" },
  ],
  CHANGE: [
    { title: "Q.U.E.E.N.", artist: "Janelle Monáe", moment: "Main table" },
    { title: "Plastic 100°C", artist: "Sampha", moment: "Reflection" },
  ],
  IMAGINED_FUTURES: [
    { title: "Space Is the Place", artist: "Sun Ra", moment: "Arrival" },
    { title: "Many Moons", artist: "Janelle Monáe", moment: "Main table" },
  ],
  ANCESTRY: [
    { title: "Journey in Satchidananda", artist: "Alice Coltrane", moment: "Arrival" },
    { title: "My Queen Is Harriet Tubman", artist: "Sons of Kemet", moment: "Main table" },
  ],
  ADAPTATION: [
    { title: "The Precision of Infinity", artist: "Jlin", moment: "Main table" },
    { title: "Suite for Max Brown", artist: "Jeff Parker", moment: "Reflection" },
  ],
};

const soundtrackSeedsForBrief = (brief?: CreativeBrief, customNotes?: string): SoundtrackSeed[] => {
  const themedSeeds = brief?.themes.flatMap((theme, themeIndex, themes) => {
    const seeds = musicSeedsByTheme[theme] ?? [];
    return seeds.map((seed, seedIndex) => ({ seed, order: seedIndex * themes.length + themeIndex }));
  }).sort((left, right) => left.order - right.order).map(({ seed }) => seed) ?? [];
  const candidates = [
    ...themedSeeds,
    ...soundtrackAnchors,
  ];
  if (/quiet|meditative|ambient/i.test(customNotes ?? "")) {
    candidates.unshift(
      { title: "Space 1", artist: "Nala Sinephro", moment: "Arrival" },
      { title: "Journey in Satchidananda", artist: "Alice Coltrane", moment: "Reflection" },
    );
  }
  const seen = new Set<string>();
  return candidates.filter((seed) => {
    const key = `${seed.artist}-${seed.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
};

const normalizedCatalogText = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

const appleArtwork = (artwork?: AppleMusicArtwork): Track["artwork"] => {
  if (!artwork?.url || !artwork.width || !artwork.height) return undefined;
  const size = Math.min(320, artwork.width, artwork.height);
  return {
    url: artwork.url.replaceAll("{w}", String(size)).replaceAll("{h}", String(size)),
    width: size,
    height: size,
    backgroundColor: artwork.bgColor ? `#${artwork.bgColor.replace(/^#/, "")}` : undefined,
  };
};

const appleMatchScore = (
  item: AppleMusicSong,
  seed: SoundtrackSeed,
) => {
  const title = normalizedCatalogText(item.attributes?.name ?? "");
  const artist = normalizedCatalogText(item.attributes?.artistName ?? "");
  const wantedTitle = normalizedCatalogText(seed.title);
  const wantedArtist = normalizedCatalogText(seed.artist);
  let score = 0;
  if (title === wantedTitle) score += 20;
  else if (title.startsWith(wantedTitle)) score += 8;
  if (artist === wantedArtist) score += 20;
  else if (artist.includes(wantedArtist) || wantedArtist.includes(artist)) score += 8;
  if (/remix|karaoke|tribute|cover/.test(title) && !/remix|cover/.test(wantedTitle)) score -= 10;
  return score;
};

const localSoundtrack = (seeds: SoundtrackSeed[]): Track[] => seeds.map((track, index) => ({
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
  const soundtrackSeeds = soundtrackSeedsForBrief(request.creativeBrief, request.customEnergyNotes);
  const fallback = localSoundtrack(soundtrackSeeds);
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
      url.searchParams.set("limit", "10");
      const payload = await fetchJson<AppleMusicSearch>(url, {
        signal,
        headers: { authorization: `Bearer ${token}` },
      });
      const item = [...(payload.results?.songs?.data ?? [])]
        .sort((left, right) => appleMatchScore(right, seed) - appleMatchScore(left, seed))[0];
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
        artwork: appleArtwork(attributes.artwork),
        albumName: attributes.albumName,
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
    { provider: "GrapeMinds", configured: Boolean(process.env.GRAPEMINDS_API_KEY), mode: "LIVE" },
    { provider: "X-Wines", configured: true, mode: "LOCAL" },
    { provider: "Reviewed zero-proof catalog", configured: true, mode: "LOCAL" },
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
      return curatePairings(request, signal);
    case "CURATE_SOUNDTRACK":
      return curateSoundtrack(request, signal);
  }
}
