import type { CreativeBrief, ThemeIdea } from "@/lib/types";

type Tone = "HOPEFUL" | "BALANCED" | "SURVIVALIST";

type ThemeVocabulary = {
  interpretation: string;
  experienceIdeas: string[];
  emotions: string[];
  visuals: string[];
  hospitality: string[];
  flavors: string[];
  ingredients: string[];
  music: string[];
  avoid: string[];
};

const vocabulary: Record<string, ThemeVocabulary> = {
  ADAPTATION: {
    interpretation: "Adaptation becomes a practice of changing form while preserving care and purpose.",
    experienceIdeas: ["Offer flexible substitutions", "Let one element transform between courses"],
    emotions: ["curiosity", "resourcefulness"],
    visuals: ["modular forms", "layered materials"],
    hospitality: ["make substitutions feel intentional", "invite guests to shape one shared element"],
    flavors: ["fermented", "bright", "layered"],
    ingredients: ["mushroom", "miso", "citrus", "legume"],
    music: ["evolving", "polyrhythmic", "textural"],
    avoid: ["presenting hardship as spectacle"],
  },
  COMMUNITY: {
    interpretation: "Community is expressed through mutual care, shared labor, and generous exchange.",
    experienceIdeas: ["Serve at least one dish family-style", "Give every guest a small hosting role"],
    emotions: ["belonging", "generosity"],
    visuals: ["gathered vessels", "interlocking circles"],
    hospitality: ["favor shared dishes", "create an easy invitation into conversation"],
    flavors: ["warming", "generous", "communal"],
    ingredients: ["beans", "rice", "greens", "bread"],
    music: ["collective", "warm", "rhythmic"],
    avoid: ["forcing disclosure from guests"],
  },
  RESILIENCE: {
    interpretation: "Resilience is framed as supported endurance rather than solitary toughness.",
    experienceIdeas: ["Build the meal around sturdy pantry ingredients", "End with a gesture of replenishment"],
    emotions: ["steadiness", "earned hope"],
    visuals: ["roots", "mended seams", "weathered surfaces"],
    hospitality: ["plan low-stress service", "make nourishment more important than performance"],
    flavors: ["earthy", "smoky", "deeply savory"],
    ingredients: ["root vegetable", "grain", "lentil", "mushroom"],
    music: ["grounded", "patient", "ascending"],
    avoid: ["romanticizing suffering"],
  },
  CHANGE: {
    interpretation: "Change is made tangible through contrast, movement, and deliberate transformation.",
    experienceIdeas: ["Shift the table mood between courses", "Pair a familiar ingredient with an unexpected form"],
    emotions: ["anticipation", "release"],
    visuals: ["gradients", "fractures", "emerging color"],
    hospitality: ["signal transitions clearly", "leave room for revision"],
    flavors: ["contrasting", "charred", "fresh"],
    ingredients: ["pepper", "tomato", "herb", "citrus"],
    music: ["kinetic", "shifting", "expansive"],
    avoid: ["literal plot reenactment"],
  },
  IMAGINED_FUTURES: {
    interpretation: "The future is treated as something guests can rehearse together through beauty and choice.",
    experienceIdeas: ["Introduce one unfamiliar flavor with context", "Invite a closing wish for the shared future"],
    emotions: ["wonder", "possibility"],
    visuals: ["iridescence", "botanical geometry", "night-sky contrast"],
    hospitality: ["balance discovery with familiarity", "make speculation welcoming"],
    flavors: ["floral", "sparkling", "unexpected"],
    ingredients: ["hibiscus", "citrus", "herb", "pear"],
    music: ["cosmic", "electronic", "spacious"],
    avoid: ["generic science-fiction decoration"],
  },
  ANCESTRY: {
    interpretation: "Ancestry is approached through credited lineages, living traditions, and careful listening.",
    experienceIdeas: ["Credit culinary sources at the table", "Invite optional reflection on inherited knowledge"],
    emotions: ["reverence", "continuity"],
    visuals: ["woven patterns", "archive blue", "handwritten notation"],
    hospitality: ["name cultural sources", "avoid claiming traditions as universal"],
    flavors: ["slow-built", "spiced", "toasted"],
    ingredients: ["heritage grain", "ginger", "sesame", "leafy green"],
    music: ["ancestral", "acoustic", "ceremonial"],
    avoid: ["flattening distinct cultures", "inventing tradition"],
  },
  CLIMATE: {
    interpretation: "Climate awareness appears through seasonality, low-waste choices, and collective responsibility.",
    experienceIdeas: ["Center plant-forward dishes", "Use scraps in a garnish, stock, or drink"],
    emotions: ["attention", "collective resolve"],
    visuals: ["stone strata", "seed forms", "drought-to-green gradients"],
    hospitality: ["favor seasonal ingredients", "explain low-waste choices without moralizing"],
    flavors: ["seasonal", "plant-forward", "mineral"],
    ingredients: ["squash", "bean", "grain", "seasonal greens"],
    music: ["tectonic", "organic", "spacious"],
    avoid: ["disaster-themed gimmicks", "eco-purity tests"],
  },
};

const fallbackVocabulary: ThemeVocabulary = {
  interpretation: "The theme becomes an invitation to gather, notice, and create meaning together.",
  experienceIdeas: ["Connect one course to the theme", "Offer an optional conversation prompt"],
  emotions: ["curiosity", "connection"],
  visuals: ["layered paper", "shared marks"],
  hospitality: ["make participation optional", "explain creative choices plainly"],
  flavors: ["balanced", "seasonal"],
  ingredients: ["vegetable", "grain", "fruit"],
  music: ["warm", "textural"],
  avoid: ["overly literal interpretation"],
};

const unique = (values: string[], limit: number) => [...new Set(values)].slice(0, limit);
const profile = (theme: string) => vocabulary[theme.toUpperCase()] ?? fallbackVocabulary;

export function themeIdeaFromVocabulary(theme: string, sourceId: string): ThemeIdea {
  const key = theme.toUpperCase().replaceAll(" ", "_");
  const entry = profile(key);
  return {
    themeId: `theme-${key.toLowerCase().replaceAll("_", "-")}`,
    name: key,
    interpretation: entry.interpretation,
    experienceIdeas: entry.experienceIdeas,
    sourceIds: [sourceId],
  };
}

export function buildCreativeBrief(input: {
  title: string;
  author: string;
  themes: string[];
  tone: Tone;
  provenance: CreativeBrief["provenance"];
}): CreativeBrief {
  const themes = unique(input.themes.map((item) => item.toUpperCase().replaceAll(" ", "_")), 6);
  const entries = (themes.length ? themes : ["COMMUNITY", "CHANGE"]).map(profile);
  const toneArc: Record<Tone, string[]> = {
    HOPEFUL: ["grounding", "discovery", "collective possibility"],
    BALANCED: ["attention", "tension", "shared release"],
    SURVIVALIST: ["readiness", "endurance", "replenishment"],
  };
  const music = unique(entries.flatMap((entry) => entry.music), 8);
  return {
    schemaVersion: "1.0",
    inspirationLabel: `${input.title} by ${input.author}`,
    themes,
    emotionalArc: unique([...toneArc[input.tone], ...entries.flatMap((entry) => entry.emotions)], 6),
    visualLanguage: unique(entries.flatMap((entry) => entry.visuals), 7),
    hospitalityPrinciples: unique(entries.flatMap((entry) => entry.hospitality), 7),
    flavorDirections: unique(entries.flatMap((entry) => entry.flavors), 7),
    ingredientMotifs: unique(entries.flatMap((entry) => entry.ingredients), 8),
    serviceStyle: themes.includes("COMMUNITY") ? "SHARED_TABLE" : input.tone === "SURVIVALIST" ? "FLEXIBLE" : "PLATED",
    musicDirections: {
      arrival: unique(["spare", "welcoming", ...music], 4),
      table: unique(["grounded", "rhythmic", ...music.slice(1)], 4),
      reflection: unique(["spacious", "patient", ...music.slice(2)], 4),
      closing: unique([input.tone === "SURVIVALIST" ? "replenishing" : "warm", "expansive", ...music.slice(3)], 4),
    },
    avoid: unique(["copyrighted passages", "author or estate endorsement claims", ...entries.flatMap((entry) => entry.avoid)], 8),
    provenance: input.provenance,
  };
}

export function briefFromPlanTheme(input: {
  title: string;
  author: string;
  tone: Tone;
  ideas: ThemeIdea[];
  existing?: CreativeBrief;
}) {
  return input.existing ?? buildCreativeBrief({
    title: input.title,
    author: input.author,
    themes: input.ideas.map((idea) => idea.name),
    tone: input.tone,
    provenance: "REVIEWED_CATALOG",
  });
}
