import type { PartyPlan } from "./types";

export type GuestShareKitOptions = {
  includeLocation?: boolean;
  tone?: "EDITORIAL" | "CELEBRATORY";
};

export type GuestShareKitPreview = {
  title: string;
  inspiration: string;
  date: string;
  time: string;
  guestCount: number;
  location?: string;
  framing: string;
  movements: Array<{ number: string; time: string; title: string; summary: string }>;
  menu: Array<{ role: string; title: string; summary: string; dietary: string[] }>;
  pairings: Array<{ course: string; wine?: string; zeroProof?: string }>;
  music: Array<{ moment: string; title: string; artist: string }>;
  announcementCaption: string;
  reminderCaption: string;
  hashtags: string[];
  altText: string;
  dietaryNote: string;
  manifest: { files: Array<{ path: string; type: string; width?: number; height?: number }> };
};

const clean = (value: unknown, max = 220) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const roleLabel = (role: string) => role.toLowerCase().replace(/(^|_)(.)/g, (_, s, c) => `${s ? " " : ""}${c.toUpperCase()}`);
const formatEventDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return clean(value, 40);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
};

export function buildGuestShareKitPreview(plan: PartyPlan, options: GuestShareKitOptions = {}): GuestShareKitPreview {
  const tone = options.tone ?? "EDITORIAL";
  const menu = plan.courses.map((course) => ({ role: roleLabel(course.role), title: clean(course.title, 90), summary: clean(course.description, 180), dietary: course.dietaryTags.slice(0, 8).map((tag) => clean(tag, 40)) }));
  const pairings = plan.courses.map((course) => {
    const choices = plan.pairings.filter((pairing) => pairing.courseId === course.courseId);
    return { course: clean(course.title, 70), wine: choices.find((p) => p.kind === "WINE")?.name, zeroProof: choices.find((p) => p.kind === "ZERO_PROOF")?.name };
  });
  const movements = plan.movements.map((movement) => ({ number: clean(movement.number, 8), time: clean(movement.time, 30), title: clean(movement.title, 80), summary: clean(movement.subtitle || movement.hostCue, 140) }));
  const music = plan.soundtrack.slice(0, 8).map((track) => ({ moment: clean(track.moment, 40), title: clean(track.title, 80), artist: clean(track.artist, 70) }));
  const framing = clean(plan.theme.framing || plan.theme.headline, 260);
  const date = formatEventDate(plan.eventDate);
  const location = options.includeLocation ? clean(plan.location, 140) : undefined;
  const invitation = tone === "CELEBRATORY" ? `Join us for ${clean(plan.title, 100)} — a dinner shaped by ${clean(plan.inspiration.title, 100)}.` : `${clean(plan.title, 100)}: an evening in six movements, inspired by ${clean(plan.inspiration.title, 100)}.`;
  const reminder = `A reminder for ${date} at ${clean(plan.eventTime, 30)}: come ready to eat, listen, and linger.`;
  const hashtags = ["#SupperClubAI", "#SharedTable", `#${plan.title.replace(/[^a-z0-9]+/gi, "").slice(0, 24)}`];
  const dietaryNote = "Dietary and allergen labels are guides only. Please verify ingredients and cross-contact with the host before eating.";
  return {
    title: clean(plan.title, 100), inspiration: `${clean(plan.inspiration.title, 100)} · ${clean(plan.inspiration.author, 80)}`, date, time: clean(plan.eventTime, 40), guestCount: plan.guestCount, ...(location ? { location } : {}), framing, movements, menu, pairings, music,
    announcementCaption: `${invitation} ${framing}`.slice(0, 500), reminderCaption: `${reminder} ${dietaryNote}`.slice(0, 500), hashtags, altText: `Editorial dinner invitation for ${clean(plan.title, 90)}, inspired by ${clean(plan.inspiration.title, 90)}, for ${plan.guestCount} guests on ${date}.`, dietaryNote,
    manifest: { files: [
      { path: "guest-program.pdf", type: "application/pdf" }, { path: "guest-square.png", type: "image/png", width: 1080, height: 1080 }, { path: "guest-portrait.png", type: "image/png", width: 1080, height: 1350 }, { path: "guest-story.png", type: "image/png", width: 1080, height: 1920 }, { path: "captions.txt", type: "text/plain" }, { path: "alt-text.txt", type: "text/plain" }, { path: "manifest.json", type: "application/json" },
    ] },
  };
}

const wrap = (text: string, max: number) => { const words = clean(text, 500).split(" "); const lines: string[] = []; let line = ""; for (const word of words) { if ((line + " " + word).trim().length > max) { if (line) lines.push(line); line = word; } else line = `${line} ${word}`.trim(); } if (line) lines.push(line); return lines; };

export async function downloadGuestShareKit(plan: PartyPlan, options: GuestShareKitOptions = {}): Promise<{ filename: string; files: string[] }> {
  if (typeof window === "undefined" || typeof document === "undefined") throw new Error("Guest share downloads require a browser.");
  const preview = buildGuestShareKitPreview(plan, options);
  const [{ jsPDF }, { default: JSZip }] = await Promise.all([import("jspdf"), import("jszip")]);
  const pdf = new jsPDF({ unit: "pt", format: "letter" }); let y = 58;
  const line = (text: string, size = 10) => { pdf.setFontSize(size); for (const item of wrap(text, 92)) { if (y > 740) { pdf.addPage(); y = 58; } pdf.text(item, 52, y); y += size + 7; } y += 5; };
  pdf.setTextColor(32, 31, 27); pdf.setFont("times", "bold"); line(preview.title, 24); pdf.setFont("times", "italic"); line(`Inspired by ${preview.inspiration}`, 12); pdf.setFont("helvetica", "normal"); line(`${preview.date} · ${preview.time} · ${preview.guestCount} guests${preview.location ? ` · ${preview.location}` : ""}`); line(preview.framing); line("The evening"); preview.movements.forEach((m) => line(`${m.number}  ${m.time}  ${m.title} — ${m.summary}`)); line("Menu and pairings"); preview.menu.forEach((m) => line(`${m.role}: ${m.title} — ${m.summary}${m.dietary.length ? ` (${m.dietary.join(", ")})` : ""}`)); preview.pairings.forEach((p) => line(`${p.course}: ${[p.wine, p.zeroProof].filter(Boolean).join(" · ")}`)); line("Music"); preview.music.forEach((m) => line(`${m.moment}: ${m.title} — ${m.artist}`)); line(preview.dietaryNote, 9); const pdfBlob = pdf.output("blob");
  const zip = new JSZip(); zip.file("guest-program.pdf", pdfBlob); const files = ["guest-square.png", "guest-portrait.png", "guest-story.png"];
  for (const filename of files) { const size = filename.includes("square") ? [1080, 1080] : filename.includes("portrait") ? [1080, 1350] : [1080, 1920]; const canvas = document.createElement("canvas"); canvas.width = size[0]; canvas.height = size[1]; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable"); ctx.fillStyle = "#eee6dd"; ctx.fillRect(0, 0, size[0], size[1]); ctx.fillStyle = "#201f1b"; ctx.font = `${Math.round(size[0] / 18)}px Georgia`; wrap(preview.title, 22).forEach((t, i) => ctx.fillText(t, size[0] / 12, size[1] / 3 + i * size[0] / 16)); ctx.fillStyle = "#b84d38"; ctx.fillRect(size[0] / 12, size[1] / 3 - size[0] / 18, size[0] / 5, 8); ctx.fillStyle = "#4f6f83"; ctx.font = `${Math.round(size[0] / 38)}px monospace`; ctx.fillText(`${preview.date} · ${preview.time}`, size[0] / 12, size[1] * 0.7); const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(`Could not render ${filename}.`)), "image/png")); zip.file(filename, blob); }
  zip.file("captions.txt", `${preview.announcementCaption}\n\n${preview.reminderCaption}\n\n${preview.hashtags.join(" ")}`); zip.file("alt-text.txt", preview.altText); zip.file("manifest.json", JSON.stringify(preview.manifest, null, 2)); const blob = await zip.generateAsync({ type: "blob" }); const filename = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "guest-share-kit"}-guest-share-kit.zip`; const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return { filename, files: ["guest-program.pdf", ...files, "captions.txt", "alt-text.txt", "manifest.json"] };
}
