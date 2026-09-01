import booksCatalog from "@/data/catalogs/books.json";
import recipesCatalog from "@/data/catalogs/recipes.json";
import winesCatalog from "@/data/catalogs/wines.json";
import type {
  MenuCourse,
  Pairing,
  PartyPlan,
  PrepTask,
  ShoppingItem,
  SourceRef,
} from "@/lib/types";

type CatalogSource = {
  sourceId: string;
  provider: string;
  title: string;
  url: string;
  accessedAt: string;
  attribution?: string;
  licenseNote?: string;
};

type RecipeRecord = {
  id: string;
  title: string;
  summary: string;
  servings: number;
  times: { prepMinutes: number; cookMinutes: number; totalMinutes: number };
  ingredients: Array<{
    ingredientId: string;
    name: string;
    quantityText: string;
    category: string;
    isOptional: boolean;
  }>;
  instructions: { sourceUrl: string };
  dietaryTags: string[];
  allergens: string[];
  themeConnections: Array<{ explanation: string; sourceIds: string[] }>;
  sourceRefs: CatalogSource[];
};

type BeverageRecord = {
  id: string;
  kind: "WINE" | "ZERO_PROOF";
  name: string;
  style: string;
  tastingNotes: string[];
  themeConnections: Array<{ explanation: string }>;
  sourceRefs: CatalogSource[];
};

const recipes = recipesCatalog.items as RecipeRecord[];
const beverages = winesCatalog.items as BeverageRecord[];

const source = (record: CatalogSource): SourceRef => ({ ...record });

export const recipeById = (id: string) => recipes.find((item) => item.id === id);
export const beverageById = (id: string) => beverages.find((item) => item.id === id);

export const courseFromRecipe = (
  recipeId: string,
  courseId: string,
  role: MenuCourse["role"],
  subtitle: string,
): MenuCourse => {
  const recipe = recipeById(recipeId);
  if (!recipe) throw new Error(`Missing recipe ${recipeId}`);
  const firstSource = recipe.sourceRefs[0];
  return {
    courseId,
    recipeId,
    role,
    title: recipe.title,
    subtitle,
    description: recipe.summary,
    servings: 8,
    ingredients: recipe.ingredients,
    instructionsUrl: recipe.instructions.sourceUrl,
    prepMinutes: recipe.times.prepMinutes,
    cookMinutes: recipe.times.cookMinutes,
    dietaryTags: recipe.dietaryTags,
    allergens: recipe.allergens,
    themeConnection:
      recipe.themeConnections[0]?.explanation ??
      "This course transforms familiar ingredients through shared preparation.",
    sourceId: firstSource.sourceId,
    source: source(firstSource),
    confirmed: true,
  };
};

export const pairingFromBeverage = (
  beverageId: string,
  courseId: string,
  pairingId: string,
  pairingReason: string,
): Pairing => {
  const beverage = beverageById(beverageId);
  if (!beverage) throw new Error(`Missing beverage ${beverageId}`);
  const firstSource = beverage.sourceRefs[0];
  return {
    pairingId,
    courseId,
    kind: beverage.kind,
    name: beverage.name,
    style: beverage.style,
    tastingNotes: beverage.tastingNotes,
    pairingReason,
    sourceId: firstSource.sourceId,
    source: source(firstSource),
  };
};

export const buildShoppingList = (courses: MenuCourse[]): ShoppingItem[] => {
  const items = new Map<string, ShoppingItem>();
  courses.forEach((course) => {
    course.ingredients.forEach((ingredient) => {
      const key = ingredient.ingredientId;
      const existing = items.get(key);
      if (existing) {
        existing.sourceCourseIds.push(course.courseId);
        existing.quantity = `${existing.quantity} + ${ingredient.quantityText}`;
      } else {
        items.set(key, {
          itemId: `shop-${key}`,
          label: ingredient.name,
          quantity: ingredient.quantityText,
          category: ingredient.category,
          checked: false,
          sourceCourseIds: [course.courseId],
        });
      }
    });
  });
  return [...items.values()].sort((a, b) =>
    `${a.category}-${a.label}`.localeCompare(`${b.category}-${b.label}`),
  );
};

export const buildPrepTasks = (courses: MenuCourse[]): PrepTask[] =>
  courses.flatMap((course, index) => [
    {
      taskId: `prep-${course.courseId}-mise`,
      title: `Measure and prep ${course.title.toLowerCase()}`,
      when: index === 0 ? "Day before" : "Event day · 2:00 PM",
      minutes: course.prepMinutes,
      done: index === 0,
      courseId: course.courseId,
    },
    {
      taskId: `prep-${course.courseId}-cook`,
      title: `Cook and hold ${course.title.toLowerCase()}`,
      when: `Event day · ${index === 0 ? "5:15" : index === 1 ? "6:10" : "8:15"} PM`,
      minutes: course.cookMinutes,
      done: false,
      courseId: course.courseId,
    },
  ]);

export const makeSeedPlan = (): PartyPlan => {
  const book = booksCatalog.items.find((item) => item.id === "book-parable-of-the-sower");
  if (!book) throw new Error("Seed book is missing");

  const courses = [
    courseFromRecipe(
      "recipe-black-eyed-pea-fritters",
      "course-first",
      "STARTER",
      "Seeds become a first offering",
    ),
    courseFromRecipe(
      "recipe-trinidadian-channa-and-pumpkin",
      "course-main",
      "MAIN",
      "Nourish, adapt, and build",
    ),
    courseFromRecipe(
      "recipe-hibiscus-poached-pears",
      "course-dessert",
      "DESSERT",
      "A bright future held in common",
    ),
  ];

  // The approved Run-of-Show comp opens on the main movement while it is still
  // awaiting the host's decision.
  courses[1].confirmed = false;

  const pairings = [
    pairingFromBeverage(
      "wine-cremant-dalsace-brut",
      "course-first",
      "pair-first-wine",
      "High acidity and bubbles reset the palate after the fritters.",
    ),
    pairingFromBeverage(
      "zero-proof-sparkling-verjus-orange",
      "course-first",
      "pair-first-zero",
      "Bright citrus and verjus echo the welcome course without alcohol.",
    ),
    pairingFromBeverage(
      "wine-south-african-chenin-blanc",
      "course-main",
      "pair-main-wine",
      "Chenin Blanc’s fruit and acidity support pumpkin, ginger, and warm spice.",
    ),
    pairingFromBeverage(
      "zero-proof-ginger-lemon-soda",
      "course-main",
      "pair-main-zero",
      "Ginger and lemon mirror the curry’s aromatics while keeping the finish clean.",
    ),
    pairingFromBeverage(
      "wine-late-harvest-chenin-blanc",
      "course-dessert",
      "pair-dessert-wine",
      "The wine’s honeyed fruit meets pear and hibiscus without hiding their acidity.",
    ),
    pairingFromBeverage(
      "zero-proof-coconut-water-lime",
      "course-dessert",
      "pair-dessert-zero",
      "A light tropical finish lets the hibiscus remain the final bright note.",
    ),
  ];

  const shopping = buildShoppingList(courses);
  const prep = buildPrepTasks(courses);

  return {
    planId: "plan-seed-and-stars",
    planVersion: 7,
    title: "Seed & Stars",
    inspiration: {
      type: "BOOK",
      title: "Parable of the Sower",
      author: "Octavia E. Butler",
    },
    hostName: "Creative Host",
    location: "Milwaukee, WI",
    eventDate: "2026-10-17",
    eventTime: "6:30 PM",
    guestCount: 8,
    budget: { amount: 280, currency: "USD" },
    dietaryRequirements: ["2 vegan", "1 gluten-free", "1 no alcohol"],
    tone: "HOPEFUL",
    status: "BUILDING",
    completion: 74,
    theme: {
      headline: "Earthseed at the table",
      framing:
        "A dinner in six movements about change, mutual care, practical resilience, and the futures communities choose to tend together.",
      ideas: book.themes.slice(0, 4).map((theme) => ({
        themeId: `theme-${theme.theme.toLowerCase()}`,
        name: theme.theme,
        interpretation: theme.explanation,
        experienceIdeas: theme.experienceIdeas,
        sourceIds: theme.sourceIds,
      })),
      source: source(book.sourceRefs[0]),
      copyrightNotice:
        "This plan uses original thematic interpretation and bibliographic metadata. It does not reproduce text from the novel or imply endorsement by the author’s estate.",
    },
    movements: [
      {
        movementId: "movement-arrival",
        number: "01",
        time: "6:30 PM",
        title: "Arrival / seed ritual",
        subtitle: "Gather + ground",
        recipeLabel: "Black-eyed pea seed crackers",
        pairingLabel: "Hibiscus Ginger Spritz",
        musicLabel: "FKA twigs",
        hostCue: "Welcome circle",
        status: "SET",
      },
      {
        movementId: "movement-first",
        number: "02",
        time: "7:00 PM",
        title: "First course",
        subtitle: "Rooted beginnings",
        courseId: "course-first",
        recipeLabel: courses[0].title,
        pairingLabel: "Crémant / sparkling verjus",
        musicLabel: "Jeff Parker",
        hostCue: "First offering",
        status: "SET",
      },
      {
        movementId: "movement-main",
        number: "03",
        time: "7:45 PM",
        title: "Main table",
        subtitle: "Nourish + build",
        courseId: "course-main",
        recipeLabel: courses[1].title,
        pairingLabel: "Chenin Blanc / ginger lemon",
        musicLabel: "Jlin",
        hostCue: "Serve family-style",
        status: "EDITING",
      },
      {
        movementId: "movement-reading",
        number: "04",
        time: "8:30 PM",
        title: "Reading",
        subtitle: "Change + community",
        recipeLabel: "Original theme note",
        pairingLabel: "Herbal infusion",
        musicLabel: "Quiet room",
        hostCue: "Read + reflect",
        status: "SET",
      },
      {
        movementId: "movement-listening",
        number: "05",
        time: "9:00 PM",
        title: "Listening interval",
        subtitle: "Music for the long view",
        recipeLabel: "Table reset",
        pairingLabel: "Sparkling water",
        musicLabel: "Nala Sinephro",
        hostCue: "Sit with it",
        status: "SET",
      },
      {
        movementId: "movement-dessert",
        number: "06",
        time: "9:30 PM",
        title: "Dessert / reflection",
        subtitle: "Sweet futures",
        courseId: "course-dessert",
        recipeLabel: courses[2].title,
        pairingLabel: "Late-harvest Chenin / coconut lime",
        musicLabel: "Closing suite",
        hostCue: "Close the circle",
        status: "DRAFT",
      },
    ],
    courses,
    pairings,
    soundtrack: [
      { trackId: "track-arrival", title: "Cellophane", artist: "FKA twigs", moment: "Arrival", provider: "Apple Music", status: "DRAFT" },
      { trackId: "track-first", title: "Suite for Max Brown", artist: "Jeff Parker", moment: "First course", provider: "Apple Music", status: "DRAFT" },
      { trackId: "track-main", title: "The Precision of Infinity", artist: "Jlin", moment: "Main table", provider: "Apple Music", status: "DRAFT" },
      { trackId: "track-listen", title: "Space 1.8", artist: "Nala Sinephro", moment: "Listening interval", provider: "Apple Music", status: "DRAFT" },
    ],
    shopping,
    prep,
    receipts: [
      {
        receiptId: "receipt-recipe",
        tool: "curate_menu",
        title: "Menu matched",
        detail: "Three catalog recipes selected for 8 guests; dietary labels retained for host review.",
        timestamp: "10:31 AM",
        kind: "RECIPE",
        status: "APPLIED",
      },
      {
        receiptId: "receipt-pairing",
        tool: "curate_pairings",
        title: "Pairings revised",
        detail: "Wine and substantial zero-proof options attached to every food course.",
        timestamp: "10:33 AM",
        kind: "PAIRING",
        status: "APPLIED",
      },
      {
        receiptId: "receipt-music",
        tool: "curate_soundtrack",
        title: "Soundtrack sequenced",
        detail: "Four listening anchors arranged from arrival through reflection; playlist remains a draft.",
        timestamp: "10:36 AM",
        kind: "MUSIC",
        status: "APPLIED",
      },
      {
        receiptId: "receipt-shopping",
        tool: "create_shopping_list",
        title: "Shopping list reconciled",
        detail: `${shopping.length} catalog ingredients grouped by aisle with course links.`,
        timestamp: "10:41 AM",
        kind: "SHOPPING",
        status: "APPLIED",
      },
    ],
    warnings: [
      {
        code: "ALLERGEN_REVIEW",
        message:
          "One guest is gluten-free. Verify packaged ingredients and kitchen cross-contact before serving.",
        affectedIds: ["course-first", "course-main", "course-dessert"],
      },
    ],
    exports: [],
    updatedAt: "2026-08-31T15:00:00Z",
  };
};

export const RECIPE_CATALOG = recipes;
export const BEVERAGE_CATALOG = beverages;
