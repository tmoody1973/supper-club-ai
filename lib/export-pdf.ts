import type { PartyPlan } from "@/lib/types";

export async function downloadHostPacket(plan: PartyPlan) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 52;
  const contentWidth = pageWidth - margin * 2;
  let y = 58;

  const ensureSpace = (height = 48) => {
    if (y + height < pageHeight - 52) return;
    doc.addPage();
    y = 58;
  };

  const rule = () => {
    doc.setDrawColor(45, 44, 38);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
  };

  const heading = (text: string, size = 16) => {
    ensureSpace(36);
    doc.setFont("times", "bold");
    doc.setFontSize(size);
    doc.setTextColor(32, 31, 27);
    doc.text(text, margin, y);
    y += size + 9;
  };

  const body = (text: string, options: { indent?: number; color?: [number, number, number] } = {}) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...(options.color ?? [45, 44, 38]));
    const indent = options.indent ?? 0;
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    ensureSpace(lines.length * 12 + 8);
    doc.text(lines, margin + indent, y);
    y += lines.length * 12 + 7;
  };

  doc.setFillColor(23, 22, 17);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(243, 235, 221);
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.text("SUPPER CLUB AI / CREATIVE HOST PACKET", margin, 22);

  doc.setFont("times", "bold");
  doc.setFontSize(31);
  doc.setTextColor(22, 23, 19);
  doc.text(plan.title, margin, y);
  y += 31;
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.text(`Inspired by ${plan.inspiration.title} · ${plan.inspiration.author}`, margin, y);
  y += 24;
  body(`${plan.eventDate} at ${plan.eventTime} · ${plan.guestCount} guests · ${plan.location}`);
  rule();
  body(plan.theme.framing);

  if (plan.theme.bookBriefing) {
    const briefing = plan.theme.bookBriefing;
    heading("About the book · spoiler-light");
    body(briefing.summary);
    body(`Setting: ${briefing.setting}`);
    body(`Publication: ${briefing.publicationDetails}`);
    body(`Why it belongs at the table: ${briefing.hostingConnection}`);
    if (briefing.contentNotes.length) body(`General content notes: ${briefing.contentNotes.join(" · ")}`);
    heading("Conversation starters", 12);
    briefing.conversationPrompts.forEach((prompt, index) => body(`${index + 1}. ${prompt}`, { indent: 12 }));
    body(`Research sources: ${briefing.sources.map((source) => source.title).join(" · ")}`, { color: [90, 89, 78] });
  }

  heading("The evening in six movements");
  plan.movements.forEach((movement) => {
    ensureSpace(40);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(184, 77, 56);
    doc.text(`${movement.number}  ${movement.time}`, margin, y);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(32, 31, 27);
    doc.text(movement.title, margin + 88, y);
    y += 14;
    body(`${movement.recipeLabel} · ${movement.pairingLabel} · ${movement.musicLabel} · Host cue: ${movement.hostCue}`, { indent: 88 });
  });

  heading("Menu and pairings");
  plan.courses.forEach((course) => {
    ensureSpace(72);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(32, 31, 27);
    doc.text(`${course.role} · ${course.title}`, margin, y);
    y += 14;
    body(course.description);
    const pairings = plan.pairings.filter((pairing) => pairing.courseId === course.courseId);
    pairings.forEach((pairing) => body(`${pairing.kind === "WINE" ? "Wine" : "Zero-proof"}: ${pairing.name} — ${pairing.pairingReason}`, { indent: 14 }));
    body(`Dietary labels: ${course.dietaryTags.join(", ") || "None listed"}`, { color: [90, 89, 78] });
  });

  heading("Shopping list");
  plan.shopping.forEach((item) => body(`${item.checked ? "☑" : "□"}  ${item.label} — ${item.quantity}`));

  heading("Prep timeline");
  plan.prep.forEach((task) => body(`${task.done ? "DONE" : "TO DO"} · ${task.when} · ${task.title} (${task.minutes} min)`));

  heading("Host safety note");
  body("Dietary and allergen labels are informational. Verify every ingredient label, preparation surface, and cross-contact risk directly with guests before serving.");
  body(plan.theme.copyrightNotice, { color: [90, 89, 78] });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 108, 96);
    doc.text(`SUPPER CLUB AI · ${plan.title} · PAGE ${page}/${totalPages}`, margin, pageHeight - 28);
  }

  const filename = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-host-packet.pdf`;
  doc.save(filename);
  return { filename };
}
