import type { MenuCourse, PartyPlan, SourceRef } from "@/lib/types";

export type RecipeInstructionStatus =
  | "LICENSED_PROVIDER_INSTRUCTIONS"
  | "REVIEWED_CATALOG_INSTRUCTIONS"
  | "STRUCTURED_PREPARATION_OUTLINE"
  | "SOURCE_LINK_REQUIRED";

export type RecipeScalingStatus =
  | "EXACT_NORMALIZED"
  | "PROVIDER_SCALED"
  | "UNSCALED_UNNORMALIZED"
  | "NOT_SCALED";

export type RecipeCardIngredient = {
  name: string;
  quantityText: string;
  category: string;
  isOptional: boolean;
  scalingStatus: "EXACT_NORMALIZED" | "PROVIDER_SCALED" | "UNSCALED_UNNORMALIZED";
};

export type RecipeCardPreview = {
  courseId: string;
  recipeId: string;
  title: string;
  subtitle: string;
  role: MenuCourse["role"];
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  ingredients: RecipeCardIngredient[];
  dietaryTags: string[];
  allergens: string[];
  winePairings: Array<{ name: string; style: string; pairingReason: string }>;
  source: SourceRef;
  instructionStatus: RecipeInstructionStatus;
  steps: string[];
  warnings: string[];
  scaling: {
    status: RecipeScalingStatus;
    sourceServings: number;
    targetServings: number;
    factor?: number;
    note: string;
  };
};

export type RecipeCardPacketPreview = {
  planId: string;
  planVersion: number;
  title: string;
  generatedAt: string;
  cards: RecipeCardPreview[];
};

export type RecipePacketManifest = {
  schemaVersion: "1.0";
  planId: string;
  planVersion: number;
  generatedAt: string;
  files: Array<{
    path: string;
    type: "application/pdf" | "application/json";
    courseId?: string;
  }>;
  cards: Array<{
    courseId: string;
    recipeId: string;
    filename: string;
    provider: string;
    sourceUrl: string;
    attribution?: string;
    licenseNote?: string;
    instructionStatus: RecipeInstructionStatus;
    scalingStatus: RecipeScalingStatus;
    warnings: string[];
  }>;
};

export type RecipePacketDownloadResult = {
  filename: string;
  cardCount: number;
  manifest: RecipePacketManifest;
};

const safeName = (value: string) => value
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 72) || "recipe";

const originalPreparationOutline = (course: MenuCourse) => [
  `Verify the authoritative source for ${course.title}, including dietary, allergen, and food-safety guidance, before cooking.`,
  "Set out and organize the listed ingredients and required equipment before beginning.",
  "Follow the authoritative source for preparation method, heat, timing, and doneness; this outline does not replace those instructions.",
  "Hold and serve according to the source guidance, then recheck guest dietary and cross-contact requirements.",
];

const courseSteps = (course: MenuCourse): {
  status: RecipeInstructionStatus;
  steps: string[];
  warnings: string[];
} => {
  if (course.instructions?.mode === "EMBEDDED" && course.instructions.steps?.length) {
    return {
      status: course.instructions.status,
      steps: course.instructions.steps,
      warnings: [course.instructions.rightsNote],
    };
  }
  return {
    status: "STRUCTURED_PREPARATION_OUTLINE",
    steps: originalPreparationOutline(course),
    warnings: [
      "SOURCE_LINK_REQUIRED: Open the original source for authoritative preparation, heat, timing, and doneness instructions.",
      course.instructions?.rightsNote ?? "Instructions remain at the linked source and are not reproduced in this packet.",
    ],
  };
};

export function buildRecipeCardPreview(plan: PartyPlan): RecipeCardPacketPreview {
  return {
    planId: plan.planId,
    planVersion: plan.planVersion,
    title: plan.title,
    generatedAt: new Date().toISOString(),
    cards: plan.courses.map((course) => {
      const instructions = courseSteps(course);
      const scaling = course.quantityScaling ?? {
        status: "NOT_SCALED" as const,
        sourceServings: course.servings,
        targetServings: course.servings,
        note: "No scaling metadata was recorded; verify all quantities against the source.",
      };
      return {
        courseId: course.courseId,
        recipeId: course.recipeId,
        title: course.title,
        subtitle: course.subtitle,
        role: course.role,
        servings: course.servings,
        prepMinutes: course.prepMinutes,
        cookMinutes: course.cookMinutes,
        totalMinutes: course.prepMinutes + course.cookMinutes,
        ingredients: course.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantityText: ingredient.quantityText,
          category: ingredient.category,
          isOptional: ingredient.isOptional,
          scalingStatus: ingredient.scalingStatus
            ?? (scaling.status === "PROVIDER_SCALED" ? "PROVIDER_SCALED" : "UNSCALED_UNNORMALIZED"),
        })),
        dietaryTags: [...course.dietaryTags],
        allergens: [...course.allergens],
        winePairings: plan.pairings
          .filter((pairing) => pairing.courseId === course.courseId && pairing.kind === "WINE")
          .map((pairing) => ({
            name: pairing.name,
            style: pairing.style,
            pairingReason: pairing.pairingReason,
          })),
        source: { ...course.source },
        instructionStatus: instructions.status,
        steps: instructions.steps,
        warnings: [
          ...instructions.warnings,
          "All dietary and allergen labels require host verification, including packaged ingredients and cross-contact.",
          scaling.note,
        ],
        scaling,
      };
    }),
  };
}

type PdfDocument = InstanceType<typeof import("jspdf").jsPDF>;

const renderRecipeCardPdf = (
  jsPDF: typeof import("jspdf").jsPDF,
  cards: RecipeCardPreview[],
  packetTitle: string,
) => {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 48;
  let firstCard = true;

  const renderCard = (card: RecipeCardPreview) => {
    if (!firstCard) doc.addPage();
    firstCard = false;
    let y = 48;
    const ensure = (needed: number) => {
      if (y + needed <= height - 42) return;
      doc.addPage();
      y = 48;
    };
    const text = (value: string, size = 9.5, bold = false, color: [number, number, number] = [42, 40, 34]) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(value, width - margin * 2) as string[];
      ensure(lines.length * (size + 3) + 6);
      doc.text(lines, margin, y);
      y += lines.length * (size + 3) + 6;
    };
    const heading = (value: string) => {
      ensure(26);
      text(value.toUpperCase(), 10, true, [176, 72, 52]);
    };
    doc.setFillColor(23, 22, 17);
    doc.rect(0, 0, width, 28, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(244, 237, 225);
    doc.text(`SUPPER CLUB AI / ${packetTitle.toUpperCase()}`, margin, 18);
    doc.setFont("times", "bold");
    doc.setFontSize(25);
    doc.setTextColor(28, 27, 23);
    const titleLines = doc.splitTextToSize(card.title, width - margin * 2) as string[];
    doc.text(titleLines, margin, y);
    y += titleLines.length * 27 + 4;
    text(`${card.role} · ${card.servings} servings · Prep ${card.prepMinutes} min · Cook ${card.cookMinutes} min`, 10, true);
    heading("Ingredients");
    card.ingredients.forEach((ingredient) => text(
      `${ingredient.isOptional ? "Optional · " : ""}${ingredient.quantityText} — ${ingredient.name} [${ingredient.scalingStatus}]`,
      9,
    ));
    heading("Preparation");
    text(`Instruction status: ${card.instructionStatus}`, 9, true);
    card.steps.forEach((step, index) => text(`${index + 1}. ${step}`, 9));
    heading("Dietary + allergen review");
    text(`Dietary labels: ${card.dietaryTags.join(", ") || "None recorded"}`);
    text(`Allergens: ${card.allergens.join(", ") || "None recorded; host verification still required"}`);
    if (card.winePairings.length) {
      heading("Wine pairing");
      card.winePairings.forEach((pairing) => text(`${pairing.name} · ${pairing.style} — ${pairing.pairingReason}`));
    }
    heading("Source + provenance");
    text(`${card.source.provider}: ${card.source.title}`, 9, true);
    text(card.source.url, 8.5);
    if (card.source.attribution) text(`Attribution: ${card.source.attribution}`, 8.5);
    if (card.source.licenseNote) text(`Rights note: ${card.source.licenseNote}`, 8.5);
    text(`Scaling: ${card.scaling.status}. ${card.scaling.note}`, 8.5);
    heading("Host warnings");
    card.warnings.forEach((warning) => text(`• ${warning}`, 8.5, false, [112, 55, 43]));
  };

  cards.forEach(renderCard);
  return doc as PdfDocument;
};

export async function downloadRecipePacket(plan: PartyPlan): Promise<RecipePacketDownloadResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Recipe packet downloads require a browser.");
  }
  const preview = buildRecipeCardPreview(plan);
  const [{ jsPDF }, { default: JSZip }] = await Promise.all([import("jspdf"), import("jszip")]);
  const zip = new JSZip();
  const packetFilename = "kitchen-recipe-packet.pdf";
  zip.file(packetFilename, renderRecipeCardPdf(jsPDF, preview.cards, preview.title).output("blob"));
  const manifestCards = preview.cards.map((card) => {
    const filename = `recipes/${card.role.toLowerCase()}-${safeName(card.title)}.pdf`;
    zip.file(filename, renderRecipeCardPdf(jsPDF, [card], preview.title).output("blob"));
    return {
      courseId: card.courseId,
      recipeId: card.recipeId,
      filename,
      provider: card.source.provider,
      sourceUrl: card.source.url,
      ...(card.source.attribution ? { attribution: card.source.attribution } : {}),
      ...(card.source.licenseNote ? { licenseNote: card.source.licenseNote } : {}),
      instructionStatus: card.instructionStatus,
      scalingStatus: card.scaling.status,
      warnings: card.warnings,
    };
  });
  const manifest: RecipePacketManifest = {
    schemaVersion: "1.0",
    planId: preview.planId,
    planVersion: preview.planVersion,
    generatedAt: preview.generatedAt,
    files: [
      { path: packetFilename, type: "application/pdf" },
      ...manifestCards.map((card) => ({
        path: card.filename,
        type: "application/pdf" as const,
        courseId: card.courseId,
      })),
      { path: "manifest.json", type: "application/json" },
    ],
    cards: manifestCards,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `${safeName(plan.title)}-kitchen-recipe-packet.zip`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return { filename, cardCount: preview.cards.length, manifest };
}
