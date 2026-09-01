import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import type { PartyPlan, PlanEnvelope } from "../../shared.js";
import "./styles.css";

const app = new App({ name: "Supper Club AI Planner", version: "0.1.0" }, {});

const parseEnvelope = (value: unknown): PlanEnvelope | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PlanEnvelope>;
  return candidate.plan?.planId && candidate.storage && candidate.websiteUrl
    ? (candidate as PlanEnvelope)
    : null;
};

const getStructuredEnvelope = (result: { structuredContent?: unknown }) =>
  parseEnvelope(result.structuredContent);

function Planner() {
  const [envelope, setEnvelope] = useState<PlanEnvelope | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Connecting to your shared plan…");
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState({
    title: "",
    inspirationTitle: "",
    inspirationAuthor: "",
    guestCount: 8,
    budgetAmount: 280,
    dietaryRequirements: "",
    tone: "HOPEFUL" as PartyPlan["tone"],
    eventDate: "",
  });

  const hydrate = (next: PlanEnvelope) => {
    setEnvelope(next);
    setForm({
      title: next.plan.title,
      inspirationTitle: next.plan.inspiration.title,
      inspirationAuthor: next.plan.inspiration.author,
      guestCount: next.plan.guestCount,
      budgetAmount: next.plan.budget.amount,
      dietaryRequirements: next.plan.dietaryRequirements.join(", "),
      tone: next.plan.tone,
      eventDate: next.plan.eventDate,
    });
    setMessage(`Shared plan v${next.plan.planVersion}`);
  };

  useEffect(() => {
    app.ontoolresult = (params) => {
      const next = parseEnvelope(params.structuredContent);
      if (next) hydrate(next);
    };
    app.ontoolinput = (params) => {
      const planId = typeof params.arguments?.planId === "string" ? params.arguments.planId : null;
      if (planId) setMessage(`Opening ${planId}…`);
    };
    void app.connect().catch((error) => {
      console.error(error);
      setMessage("Open this planner from a compatible MCP Apps host.");
    });
  }, []);

  const call = async (name: string, args: Record<string, unknown>) => {
    setBusy(true);
    try {
      const result = await app.callServerTool({ name, arguments: args });
      const next = getStructuredEnvelope(result);
      if (result.isError || !next) {
        const text = result.content.find((item) => item.type === "text");
        throw new Error(text?.type === "text" ? text.text : "The tool returned an error.");
      }
      hydrate(next);
      return next;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!envelope) return;
    setMessage("Saving the host brief…");
    try {
      await call("configure_party", {
        planId: envelope.plan.planId,
        expectedPlanVersion: envelope.plan.planVersion,
        title: form.title,
        inspirationTitle: form.inspirationTitle,
        inspirationAuthor: form.inspirationAuthor,
        guestCount: Number(form.guestCount),
        budgetAmount: Number(form.budgetAmount),
        dietaryRequirements: form.dietaryRequirements.split(",").map((item) => item.trim()).filter(Boolean),
        tone: form.tone,
        ...(form.eventDate ? { eventDate: form.eventDate } : {}),
      });
      setMessage("Host brief saved to the shared plan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    }
  };

  const finalize = async () => {
    if (!envelope) return;
    setMessage("Finalizing the reviewed plan…");
    try {
      await call("finalize_party_plan", {
        planId: envelope.plan.planId,
        expectedPlanVersion: envelope.plan.planVersion,
        confirm: true,
      });
      setConfirming(false);
      setMessage("Plan finalized. It is ready for the host packet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Finalization failed.");
    }
  };

  const overview = useMemo(() => {
    if (!envelope) return [];
    return [
      ["Menu", `${envelope.plan.courses.length} courses`],
      ["Pairings", `${envelope.plan.pairings.length} choices`],
      ["Soundtrack", `${envelope.plan.soundtrack.length} cues`],
      ["Shopping", `${envelope.plan.shopping.length} items`],
    ];
  }, [envelope]);

  if (!envelope) {
    return <main className="loading"><div className="orb" /><h1>Supper Club AI</h1><p>{message}</p></main>;
  }

  return (
    <main className="shell">
      <header className="masthead">
        <div><span className="eyebrow">Creative Host workspace</span><h1>{envelope.plan.title}</h1></div>
        <div className="version">{envelope.plan.status}<br /><strong>v{envelope.plan.planVersion}</strong></div>
      </header>

      <section className="intro">
        <p className="kicker">Dinner as a cultural composition</p>
        <p>{envelope.plan.theme.framing}</p>
      </section>

      <section className="form-grid" aria-label="Host brief">
        <label className="wide">Party name<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Inspiration<input value={form.inspirationTitle} onChange={(event) => setForm({ ...form, inspirationTitle: event.target.value })} /></label>
        <label>Author or creator<input value={form.inspirationAuthor} onChange={(event) => setForm({ ...form, inspirationAuthor: event.target.value })} /></label>
        <label>Guests<input type="number" min="1" max="30" value={form.guestCount} onChange={(event) => setForm({ ...form, guestCount: Number(event.target.value) })} /></label>
        <label>Budget in USD<input type="number" min="0" max="10000" value={form.budgetAmount} onChange={(event) => setForm({ ...form, budgetAmount: Number(event.target.value) })} /></label>
        <label>Tone<select value={form.tone} onChange={(event) => setForm({ ...form, tone: event.target.value as PartyPlan["tone"] })}><option value="HOPEFUL">Hopeful</option><option value="BALANCED">Balanced</option><option value="SURVIVALIST">Survivalist</option></select></label>
        <label>Date<input type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></label>
        <label className="wide">Dietary needs, separated by commas<input value={form.dietaryRequirements} onChange={(event) => setForm({ ...form, dietaryRequirements: event.target.value })} placeholder="vegan, gluten-free" /></label>
      </section>

      <div className="overview">{overview.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>

      <section className="actions">
        <button className="primary" disabled={busy} onClick={save}>{busy ? "Working…" : "Save host brief"}</button>
        <button disabled={busy} onClick={() => void app.openLink({ url: envelope.websiteUrl })}>Open full workspace</button>
        <button disabled={busy || envelope.plan.status === "FINALIZED"} onClick={() => setConfirming(true)}>Finalize plan</button>
      </section>

      {confirming && (
        <section className="confirmation" role="alertdialog" aria-label="Confirm finalization">
          <strong>Ready to lock the plan?</strong>
          <p>This sets every movement and allows host-packet export. Please review dietary labels and cross-contact risks first.</p>
          <div><button onClick={() => setConfirming(false)}>Keep editing</button><button className="danger" disabled={busy} onClick={finalize}>Yes, finalize</button></div>
        </section>
      )}

      <footer><span>{message}</span><code>{envelope.plan.planId}</code><small>{envelope.storage.durable ? "Durable store" : "Prototype memory store · expires after 24 hours"}</small></footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Planner />);
