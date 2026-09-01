"use client";

import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Grape,
  Leaf,
  ListChecks,
  Menu as MenuIcon,
  Music2,
  PenLine,
  ReceiptText,
  RotateCcw,
  ShoppingBasket,
  Users,
  UtensilsCrossed,
  Wine,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadHostPacket } from "@/lib/export-pdf";
import {
  createSharedPlan,
  PlanClientError,
  readSharedPlan,
  replaceSharedPlan,
} from "@/lib/plan-store-client";
import {
  buildPrepTasks,
  buildShoppingList,
  courseFromRecipe,
  makeSeedPlan,
} from "@/lib/seed-plan";
import type { MenuCourse, PartyPlan, Receipt } from "@/lib/types";
import { registerSupperClubTools } from "@/lib/webmcp-tools";

type ActiveView = "RUN_OF_SHOW" | "SHOPPING" | "HOST_PACKET";
type PlanStoreMode = "BOOTING" | "SHARED" | "LOCAL";

const navItems = [
  { number: "01", label: "Overview", detail: "Seed & Stars", view: "RUN_OF_SHOW" as const, movementId: "movement-arrival" },
  { number: "02", label: "Run of show", view: "RUN_OF_SHOW" as const, movementId: "movement-main" },
  { number: "03", label: "Menu & pairings", view: "RUN_OF_SHOW" as const, movementId: "movement-main" },
  { number: "04", label: "Reading & music", view: "RUN_OF_SHOW" as const, movementId: "movement-reading" },
  { number: "05", label: "Guests & needs", view: "RUN_OF_SHOW" as const, movementId: "movement-arrival" },
  { number: "06", label: "Shopping & prep", view: "SHOPPING" as const },
  { number: "07", label: "Sourcing & notes", view: "RUN_OF_SHOW" as const, movementId: "movement-main" },
  { number: "08", label: "Budget & logistics", view: "HOST_PACKET" as const },
  { number: "09", label: "Host packet", view: "HOST_PACKET" as const },
];

const receiptIcon = {
  RECIPE: Leaf,
  PAIRING: Wine,
  MUSIC: Music2,
  SHOPPING: ShoppingBasket,
  THEME: BookOpen,
  SYSTEM: ReceiptText,
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatLastSaved = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));

function SalonMark({ size = 22 }: { size?: number }) {
  const rays = Array.from({ length: 16 }, (_, index) => index * 22.5);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="5.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
      {rays.map((angle) => (
        <path key={angle} d="M20 2.5V11" stroke="currentColor" strokeWidth={angle % 45 === 0 ? 1.6 : 0.9} transform={`rotate(${angle} 20 20)`} />
      ))}
    </svg>
  );
}

function EarthseedSeal() {
  return (
    <svg viewBox="0 0 140 140" role="img" aria-label="Earthseed — we shape change">
      <defs>
        <path id="earthseed-ring" d="M 70,70 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0" />
      </defs>
      <circle cx="70" cy="70" r="61" />
      <circle cx="70" cy="70" r="44" />
      <text><textPath href="#earthseed-ring" startOffset="2%">EARTHSEED · WE SHAPE CHANGE · </textPath></text>
      <path className="seal-stem" d="M70 96V47M70 60C58 57 52 50 51 40C62 40 69 46 70 60ZM70 72C82 69 88 62 89 52C78 52 71 58 70 72ZM70 86C60 83 55 77 54 69C63 69 69 75 70 86Z" />
      <path className="seal-roots" d="M70 95L58 105M70 95L82 105M70 95V108" />
    </svg>
  );
}

export function SupperClubWorkspace() {
  const [plan, setPlan] = useState<PartyPlan>(() => makeSeedPlan());
  const planRef = useRef(plan);
  const [activeView, setActiveView] = useState<ActiveView>("RUN_OF_SHOW");
  const [selectedMovementId, setSelectedMovementId] = useState("movement-main");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileReceiptsOpen, setMobileReceiptsOpen] = useState(false);
  const [utilityMenuOpen, setUtilityMenuOpen] = useState(false);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const [webmcpStatus, setWebmcpStatus] = useState<"CONNECTING" | "READY" | "PREVIEW" | "ERROR">("CONNECTING");
  const [planStoreMode, setPlanStoreMode] = useState<PlanStoreMode>("BOOTING");
  const [toast, setToast] = useState<string | null>(null);

  const updatePlan = useCallback((next: PartyPlan) => {
    planRef.current = next;
    setPlan(next);
    try {
      window.localStorage.setItem("supper-club-ai-plan-v2", JSON.stringify(next));
    } catch {
      // The shared plan still works when storage is unavailable.
    }
  }, []);

  const announce = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    let active = true;

    const initializePlan = async () => {
      let candidate = makeSeedPlan();
      try {
        const saved = window.localStorage.getItem("supper-club-ai-plan-v2");
        if (saved) candidate = JSON.parse(saved) as PartyPlan;
      } catch {
        // Keep the reviewed seed plan when stored state cannot be read.
      }

      const requestedPlanId = new URL(window.location.href).searchParams.get("plan");
      try {
        let result;
        if (requestedPlanId) {
          try {
            result = await readSharedPlan(requestedPlanId);
          } catch (error) {
            if (!(error instanceof PlanClientError) || error.code !== "PLAN_NOT_FOUND") throw error;
            result = await createSharedPlan(candidate);
          }
        } else {
          result = await createSharedPlan(candidate);
        }
        if (!active) return;
        updatePlan(result.plan);
        const url = new URL(window.location.href);
        url.searchParams.set("plan", result.plan.planId);
        window.history.replaceState({}, "", url);
        setPlanStoreMode("SHARED");
      } catch (error) {
        console.warn("[Supper Club AI] Shared PlanStore unavailable; using local state.", error);
        if (!active) return;
        updatePlan(candidate);
        setPlanStoreMode("LOCAL");
      }
    };

    void initializePlan();
    return () => {
      active = false;
    };
  }, [updatePlan]);

  const persistPlan = useCallback(
    async (next: PartyPlan, expectedPlanVersion: number) => {
      if (planStoreMode !== "SHARED") {
        updatePlan(next);
        return next;
      }
      try {
        const result = await replaceSharedPlan(next, expectedPlanVersion);
        updatePlan(result.plan);
        return result.plan;
      } catch (error) {
        if (error instanceof PlanClientError && error.code === "VERSION_CONFLICT") {
          const current = await readSharedPlan(next.planId);
          updatePlan(current.plan);
          announce(`A newer plan was loaded · v${current.plan.planVersion}`);
        }
        throw error;
      }
    },
    [announce, planStoreMode, updatePlan],
  );

  useEffect(() => {
    if (planStoreMode === "BOOTING") return;
    const controller = new AbortController();
    let active = true;
    registerSupperClubTools({
      getPlan: () => planRef.current,
      setPlan: async (next) => {
        const saved = await persistPlan(next, next.planVersion - 1);
        announce(`${saved.receipts[0]?.title ?? "Plan updated"} · v${saved.planVersion}`);
      },
      exportHostPacket: downloadHostPacket,
    }, controller)
      .then((registration) => {
        if (!active) {
          registration?.controller.abort();
          return;
        }
        if (registration) {
          setWebmcpStatus("READY");
        } else {
          setWebmcpStatus("PREVIEW");
        }
      })
      .catch((error) => {
        console.error("[Supper Club AI] WebMCP registration failed", error);
        if (active) setWebmcpStatus("ERROR");
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [announce, persistPlan, planStoreMode]);

  const selectedMovement =
    plan.movements.find((movement) => movement.movementId === selectedMovementId) ?? plan.movements[2];
  const selectedCourse = selectedMovement.courseId
    ? plan.courses.find((course) => course.courseId === selectedMovement.courseId)
    : undefined;
  const selectedPairings = selectedCourse
    ? plan.pairings.filter((pairing) => pairing.courseId === selectedCourse.courseId)
    : [];

  const shoppingDone = plan.shopping.filter((item) => item.checked).length;
  const prepDone = plan.prep.filter((task) => task.done).length;

  const selectedNavNumber = useMemo(() => {
    if (activeView === "SHOPPING") return "06";
    if (activeView === "HOST_PACKET") return "09";
    if (selectedMovementId === "movement-reading" || selectedMovementId === "movement-listening") return "04";
    if (selectedMovementId === "movement-main") return "02";
    return "01";
  }, [activeView, selectedMovementId]);

  const localCommit = useCallback(
    (mutate: (next: PartyPlan) => void, receipt: Omit<Receipt, "receiptId" | "timestamp">) => {
      const current = planRef.current;
      const next = structuredClone(current);
      mutate(next);
      next.planVersion = current.planVersion + 1;
      next.updatedAt = new Date().toISOString();
      next.receipts = [
        {
          ...receipt,
          receiptId: `receipt-local-${Date.now()}`,
          timestamp: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()),
        },
        ...next.receipts,
      ].slice(0, 12);
      void persistPlan(next, current.planVersion)
        .then((saved) => announce(`${receipt.title} · v${saved.planVersion}`))
        .catch((error) => {
          console.error("[Supper Club AI] Plan update failed", error);
          announce("That change could not be saved. Please try again.");
        });
    },
    [announce, persistPlan],
  );

  const navigate = (item: (typeof navItems)[number]) => {
    setActiveView(item.view);
    if (item.movementId) setSelectedMovementId(item.movementId);
    setMobileNavOpen(false);
  };

  const confirmCourse = (courseId: string) => {
    localCommit(
      (next) => {
        next.courses = next.courses.map((course) =>
          course.courseId === courseId ? { ...course, confirmed: true } : course,
        );
        next.movements = next.movements.map((movement) =>
          movement.courseId === courseId ? { ...movement, status: "SET" } : movement,
        );
        next.completion = Math.min(96, next.completion + 4);
      },
      {
        tool: "host_confirmed_course",
        title: "Course confirmed",
        detail: "The Creative Host approved this movement; dependent shopping and prep remain linked.",
        kind: "RECIPE",
        status: "APPLIED",
      },
    );
  };

  const replaceCourse = (course: MenuCourse) => {
    const replacements: Record<MenuCourse["role"], string> = {
      STARTER:
        course.recipeId === "recipe-black-eyed-pea-fritters"
          ? "recipe-jollof-style-tomato-pepper-soup"
          : "recipe-black-eyed-pea-fritters",
      MAIN:
        course.recipeId === "recipe-trinidadian-channa-and-pumpkin"
          ? "recipe-yassa-style-mushrooms-and-onions"
          : "recipe-trinidadian-channa-and-pumpkin",
      DESSERT:
        course.recipeId === "recipe-hibiscus-poached-pears"
          ? "recipe-coconut-sweet-potato-pudding"
          : "recipe-hibiscus-poached-pears",
    };
    const replacement = courseFromRecipe(
      replacements[course.role],
      course.courseId,
      course.role,
      course.subtitle,
    );
    localCommit(
      (next) => {
        next.courses = next.courses.map((item) =>
          item.courseId === course.courseId ? replacement : item,
        );
        next.movements = next.movements.map((movement) =>
          movement.courseId === course.courseId
            ? { ...movement, recipeLabel: replacement.title, status: "EDITING" }
            : movement,
        );
        next.shopping = buildShoppingList(next.courses);
        next.prep = buildPrepTasks(next.courses);
        next.status = "BUILDING";
        next.completion = Math.max(60, next.completion - 3);
      },
      {
        tool: "replace_menu_course",
        title: "Course replaced",
        detail: `${course.title} was replaced with ${replacement.title}; shopping and prep were rebuilt.`,
        kind: "RECIPE",
        status: "APPLIED",
      },
    );
  };

  const toggleShopping = (itemId: string) => {
    const item = plan.shopping.find((entry) => entry.itemId === itemId);
    if (!item) return;
    localCommit(
      (next) => {
        next.shopping = next.shopping.map((entry) =>
          entry.itemId === itemId ? { ...entry, checked: !entry.checked } : entry,
        );
      },
      {
        tool: "host_checked_shopping_item",
        title: item.checked ? "Shopping item reopened" : "Shopping item checked",
        detail: `${item.label} is ${item.checked ? "back on the list" : "marked ready"}.`,
        kind: "SHOPPING",
        status: "APPLIED",
      },
    );
  };

  const togglePrep = (taskId: string) => {
    const task = plan.prep.find((entry) => entry.taskId === taskId);
    if (!task) return;
    localCommit(
      (next) => {
        next.prep = next.prep.map((entry) =>
          entry.taskId === taskId ? { ...entry, done: !entry.done } : entry,
        );
      },
      {
        tool: "host_checked_prep_task",
        title: task.done ? "Prep task reopened" : "Prep task completed",
        detail: task.title,
        kind: "SYSTEM",
        status: "APPLIED",
      },
    );
  };

  const finalizePlan = () => {
    localCommit(
      (next) => {
        next.status = "FINALIZED";
        next.completion = 100;
        next.movements = next.movements.map((movement) => ({ ...movement, status: "SET" }));
      },
      {
        tool: "finalize_party_plan",
        title: "Plan finalized",
        detail: "The host approved the complete plan for export. Dietary and cross-contact checks remain the host’s responsibility.",
        kind: "SYSTEM",
        status: "APPLIED",
      },
    );
    setConfirmingFinalize(false);
  };

  const exportPacket = async () => {
    if (planRef.current.status !== "FINALIZED") {
      setConfirmingFinalize(true);
      return;
    }
    const result = await downloadHostPacket(planRef.current);
    localCommit(
      (next) => {
        next.exports.unshift({
          exportId: `export-${Date.now()}`,
          filename: result.filename,
          createdAt: new Date().toISOString(),
        });
      },
      {
        tool: "export_host_packet",
        title: "Host packet exported",
        detail: result.filename,
        kind: "SYSTEM",
        status: "APPLIED",
      },
    );
  };

  const resetDemo = () => {
    const current = planRef.current;
    const seed: PartyPlan = {
      ...makeSeedPlan(),
      planId: current.planId,
      planVersion: current.planVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    void persistPlan(seed, current.planVersion)
      .then(() => announce("Seed & Stars restored to the reviewed demo state."))
      .catch((error) => {
        console.error("[Supper Club AI] Demo reset failed", error);
        announce("The demo could not be reset. Please try again.");
      });
    setActiveView("RUN_OF_SHOW");
    setSelectedMovementId("movement-main");
    setUtilityMenuOpen(false);
  };

  return (
    <main className="app-shell">
      <a className="skip-link" href="#workspace-main">Skip to the plan</a>
      <header className="topbar">
        <div className="brand-lockup">
          <button className="mobile-menu" type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle folio navigation" aria-expanded={mobileNavOpen}>
            {mobileNavOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
          <span className="brand-mark"><SalonMark /></span>
          <span className="brand-name">Supper Club AI</span>
          <span className="brand-slash">/</span>
          <span className="brand-context">Creative Host Workspace</span>
        </div>
        <div className="topbar-meta">
          <span className="issue-label">Issue 0052</span>
          <span className="plan-state">{plan.status === "FINALIZED" ? "Finalized" : "Plan editing"}</span>
          <span className="last-saved"><small>Last saved</small><strong>Today {formatLastSaved(plan.updatedAt)}</strong></span>
          <span className={`tool-status tool-status--${webmcpStatus.toLowerCase()}`} title="WebMCP connection status">
            <span className="tool-status-dot" />
            {webmcpStatus === "READY" ? "9 tools live" : webmcpStatus === "PREVIEW" ? "Preview mode" : webmcpStatus === "ERROR" ? "Tool error" : "Connecting"}
          </span>
          <button className="packet-action" type="button" onClick={() => setActiveView("HOST_PACKET")}>
            Review host packet <ChevronRight size={16} />
          </button>
          <button className="icon-button" type="button" onClick={() => setUtilityMenuOpen((open) => !open)} aria-label="Open workspace menu" aria-expanded={utilityMenuOpen}>
            <MenuIcon size={19} />
          </button>
        </div>
      </header>

      {utilityMenuOpen ? (
        <div className="utility-menu" role="menu">
          <span>Workspace menu</span>
          <button type="button" role="menuitem" onClick={resetDemo}><RotateCcw size={15} /> Restore reviewed demo plan</button>
        </div>
      ) : null}

      <div className="workspace-grid">
        <nav className={`folio-nav ${mobileNavOpen ? "folio-nav--open" : ""}`} aria-label="Plan folio">
          <div className="folio-title">Folio</div>
          <ol>
            {navItems.map((item) => (
              <li key={item.number}>
                <button
                  type="button"
                  className={selectedNavNumber === item.number ? "folio-link folio-link--active" : "folio-link"}
                  onClick={() => navigate(item)}
                  aria-current={selectedNavNumber === item.number ? "page" : undefined}
                >
                  <span className="folio-number">{item.number}</span>
                  <span className="folio-copy"><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</span>
                  {selectedNavNumber === item.number ? <span className="folio-active-dot" /> : null}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="paper-surface" id="workspace-main" aria-label={`${activeView.toLowerCase().replaceAll("_", " ")} workspace`}>
          <span className="registration-mark registration-mark--tl" aria-hidden="true">⌜</span>
          <span className="registration-mark registration-mark--tr" aria-hidden="true">⌝</span>
          <span className="registration-mark registration-mark--bl" aria-hidden="true">⌞</span>
          <span className="registration-mark registration-mark--br" aria-hidden="true">⌟</span>

          <button className="mobile-receipts-jump" type="button" onClick={() => setMobileReceiptsOpen(true)}>
            <ReceiptText size={16} /> Agent receipts <span>{plan.receipts.length}</span>
          </button>

          {activeView === "RUN_OF_SHOW" ? (
            <RunOfShow
              plan={plan}
              selectedMovementId={selectedMovementId}
              onSelectMovement={setSelectedMovementId}
              selectedCourse={selectedCourse}
              selectedPairings={selectedPairings}
              onConfirmCourse={confirmCourse}
              onReplaceCourse={replaceCourse}
            />
          ) : null}

          {activeView === "SHOPPING" ? (
            <ShoppingAndPrep
              plan={plan}
              onToggleShopping={toggleShopping}
              onTogglePrep={togglePrep}
            />
          ) : null}

          {activeView === "HOST_PACKET" ? (
            <HostPacketReview plan={plan} onFinalize={() => setConfirmingFinalize(true)} onExport={exportPacket} />
          ) : null}
        </section>

        <AgentMarginalia receipts={plan.receipts} warnings={plan.warnings} planVersion={plan.planVersion} />
      </div>

      <footer className="action-dock" aria-label="Plan progress and primary action">
        <button type="button" className="dock-stat" onClick={() => setActiveView("SHOPPING")}>
          <ShoppingBasket aria-hidden="true" />
          <span><small>Shopping list</small><strong>{plan.shopping.length}</strong><em>{shoppingDone} ready</em></span>
        </button>
        <button type="button" className="dock-stat" onClick={() => setActiveView("SHOPPING")}>
          <ListChecks aria-hidden="true" />
          <span><small>Prep tasks</small><strong>{plan.prep.length}</strong><em>{prepDone} done</em></span>
        </button>
        <div className="completion-meter" aria-label={`${plan.completion}% complete`}>
          <span className="completion-ring" style={{ "--completion": `${plan.completion * 3.6}deg` } as React.CSSProperties}>{plan.completion}%</span>
          <span><strong>{plan.status === "FINALIZED" ? "Ready to host" : "Plan in progress"}</strong><small>Version {plan.planVersion} · {plan.movements.filter((movement) => movement.status === "SET").length}/6 movements set</small></span>
          <ul className="completion-breakdown">
            <li><i className="state-dot state-dot--set" />{plan.movements.filter((movement) => movement.status === "SET").length} set</li>
            <li><i className="state-dot state-dot--editing" />{plan.movements.filter((movement) => movement.status === "EDITING").length} editing</li>
            <li><i className="state-dot" />{plan.movements.filter((movement) => movement.status === "DRAFT").length} draft</li>
          </ul>
        </div>
        <button className="dock-primary" type="button" onClick={() => setActiveView("HOST_PACKET")}>
          Review host packet <ChevronRight size={20} />
        </button>
        <dl className="dock-estimate"><div><dt>Est. prep</dt><dd>{Math.round(plan.prep.reduce((sum, task) => sum + task.minutes, 0) / 60 * 10) / 10} hrs</dd></div><div><dt>Serves</dt><dd>{plan.guestCount} guests</dd></div></dl>
      </footer>

      {mobileReceiptsOpen ? (
        <div className="mobile-receipts-backdrop" role="presentation" onMouseDown={() => setMobileReceiptsOpen(false)}>
          <section className="mobile-receipts-drawer" role="dialog" aria-modal="true" aria-label="Agent receipts" onMouseDown={(event) => event.stopPropagation()}>
            <button className="drawer-close" type="button" onClick={() => setMobileReceiptsOpen(false)}><X size={17} /> Close receipts</button>
            <AgentMarginalia receipts={plan.receipts} warnings={plan.warnings} planVersion={plan.planVersion} />
          </section>
        </div>
      ) : null}

      {confirmingFinalize ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setConfirmingFinalize(false)}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="finalize-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="dialog-kicker">Host approval required</span>
            <h2 id="finalize-title">Finalize Seed & Stars?</h2>
            <p>This locks the current plan for export. You can keep editing later, but a new version will be created.</p>
            <div className="dialog-warning"><CircleAlert size={18} /> Dietary labels are informational. Verify labels and cross-contact with every guest.</div>
            <div className="dialog-actions">
              <button type="button" className="button-secondary" onClick={() => setConfirmingFinalize(false)}>Keep editing</button>
              <button type="button" className="button-primary" onClick={finalizePlan}>Approve and finalize</button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="sr-status" aria-live="polite">{toast}</div>
      {toast ? <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div> : null}
    </main>
  );
}

function RunOfShow({
  plan,
  selectedMovementId,
  onSelectMovement,
  selectedCourse,
  selectedPairings,
  onConfirmCourse,
  onReplaceCourse,
}: {
  plan: PartyPlan;
  selectedMovementId: string;
  onSelectMovement: (id: string) => void;
  selectedCourse?: MenuCourse;
  selectedPairings: PartyPlan["pairings"];
  onConfirmCourse: (courseId: string) => void;
  onReplaceCourse: (course: MenuCourse) => void;
}) {
  return (
    <div className="run-layout">
      <aside className="plan-intro">
        <span className="eyebrow">{formatDate(plan.eventDate)}</span>
        <strong className="intro-title">{plan.title}</strong>
        <span className="intro-location">{plan.location}</span>
        <div className="earthseed-seal"><EarthseedSeal /></div>
        <p>{plan.theme.framing}</p>
        <dl className="host-facts">
          <div><dt>Guests</dt><dd>{plan.guestCount}</dd></div>
          <div><dt>Starts</dt><dd>{plan.eventTime}</dd></div>
          <div><dt>Tone</dt><dd>{plan.tone.toLowerCase()}</dd></div>
          <div><dt>Budget</dt><dd>${plan.budget.amount}</dd></div>
        </dl>
        <div className="legend-block">
          <span>Legend</span>
          <small><i className="legend-chip legend-chip--selected" /> Selected movement</small>
          <small><i className="legend-chip legend-chip--stamp" /> Editing</small>
          <small><i className="legend-chip legend-chip--agent" /> Updated by agent</small>
        </div>
        <div className="rights-note"><BookOpen size={15} /><span>Original theme interpretation; no book passages reproduced.</span></div>
      </aside>

      <div className="movement-spine">
        <div className="spine-head">
          <span>Time</span><span>Movement</span><span>Recipe</span><span>Pairing</span><span>Music</span><span>Host cue</span>
        </div>
        {plan.movements.map((movement) => {
          const selected = movement.movementId === selectedMovementId;
          return (
            <article className={selected ? "movement movement--selected" : "movement"} key={movement.movementId}>
              <button className="movement-row" type="button" onClick={() => onSelectMovement(movement.movementId)} aria-expanded={selected}>
                <span className="movement-node" aria-hidden="true" />
                <time>{movement.time}</time>
                <span className="movement-name"><b>{movement.number}</b><strong>{movement.title}</strong><small>{movement.subtitle}</small></span>
                <span className="movement-cell"><small>Recipe</small>{movement.recipeLabel}</span>
                <span className="movement-cell"><small>Pairing</small>{movement.pairingLabel}</span>
                <span className="movement-cell"><small>Music</small>{movement.musicLabel}</span>
                <span className="movement-cell"><small>Host cue</small>{movement.hostCue}</span>
                <span className={`movement-stamp movement-stamp--${movement.status.toLowerCase()}`}>{movement.status}</span>
                {selected ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
              </button>
              {selected ? (
                selectedCourse ? (
                  <CoursePlate course={selectedCourse} pairings={selectedPairings} onConfirm={() => onConfirmCourse(selectedCourse.courseId)} onReplace={() => onReplaceCourse(selectedCourse)} />
                ) : (
                  <CulturalPlate movementId={movement.movementId} plan={plan} />
                )
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CoursePlate({ course, pairings, onConfirm, onReplace }: { course: MenuCourse; pairings: PartyPlan["pairings"]; onConfirm: () => void; onReplace: () => void }) {
  const wine = pairings.find((pairing) => pairing.kind === "WINE");
  const zero = pairings.find((pairing) => pairing.kind === "ZERO_PROOF");
  return (
    <div className="course-plate">
      <div className="course-column course-column--lead">
        <span className="field-label">Dish</span>
        <h2>{course.title}</h2>
        <p className="course-subtitle">{course.subtitle}</p>
        <p>{course.description}</p>
        <div className="tag-row">{course.dietaryTags.map((tag) => <span key={tag}>{tag.replaceAll("_", " ")}</span>)}</div>
        <dl className="timing-grid"><div><dt>Prep</dt><dd>{course.prepMinutes} min</dd></div><div><dt>Cook</dt><dd>{course.cookMinutes} min</dd></div><div><dt>Yield</dt><dd>{course.servings} guests</dd></div></dl>
      </div>
      <div className="course-column">
        <span className="field-label">Pairings + cultural links</span>
        <div className="plate-field"><Grape size={15} /><span><small>Wine</small><strong>{wine?.name ?? "Not selected"}</strong><p>{wine?.pairingReason}</p></span></div>
        <div className="plate-field"><Leaf size={15} /><span><small>Zero-proof</small><strong>{zero?.name ?? "Not selected"}</strong><p>{zero?.pairingReason}</p></span></div>
        <div className="plate-field"><Music2 size={15} /><span><small>Music cue</small><strong>{course.role === "MAIN" ? "Jlin — The Precision of Infinity" : course.role === "STARTER" ? "Jeff Parker — Suite for Max Brown" : "Nala Sinephro — Space 1.8"}</strong></span></div>
        <div className="plate-field"><BookOpen size={15} /><span><small>Theme connection</small><p>{course.themeConnection}</p></span></div>
      </div>
      <div className="course-column course-column--source">
        <span className="field-label">Sourcing + provenance</span>
        <ul className="ingredient-list">{course.ingredients.slice(0, 7).map((ingredient) => <li key={ingredient.ingredientId}><span>{ingredient.name}</span><small>{ingredient.quantityText}</small></li>)}</ul>
        <a className="source-link" href={course.source.url} target="_blank" rel="noreferrer"><ReceiptText size={14} /> {course.source.provider} source <ChevronRight size={14} /></a>
        <p className="pencil-note">Use the source for instructions. Supper Club AI stores structured ingredients and original notes—not copied recipe prose.</p>
      </div>
      <div className="course-actions">
        <a className="button-secondary" href={course.instructionsUrl} target="_blank" rel="noreferrer"><FileText size={15} /> View recipe source</a>
        <button className="button-secondary button-secondary--signal" type="button" onClick={onReplace}><RotateCcw size={15} /> Replace dish</button>
        <button className="button-confirm" type="button" onClick={onConfirm}><Check size={16} /> {course.confirmed ? "Confirmed" : "Confirm changes"}</button>
      </div>
    </div>
  );
}

function CulturalPlate({ movementId, plan }: { movementId: string; plan: PartyPlan }) {
  if (movementId === "movement-reading") {
    return (
      <div className="cultural-plate">
        <div><span className="field-label">Reading connection</span><h2>{plan.inspiration.title}</h2><p>{plan.theme.framing}</p></div>
        <div className="theme-grid">{plan.theme.ideas.map((idea) => <article key={idea.themeId}><strong>{idea.name}</strong><p>{idea.interpretation}</p></article>)}</div>
        <div className="rights-banner"><CircleAlert size={17} /> No copyrighted passage is stored or displayed. The host supplies any reading they have the right to use.</div>
      </div>
    );
  }
  if (movementId === "movement-listening") {
    return (
      <div className="cultural-plate">
        <div><span className="field-label">Listening interval</span><h2>Music for the long view</h2><p>A draft sequence supports arrival, focus, conversation, and reflection without saving anything to the host’s library.</p></div>
        <div className="track-list">
          {plan.soundtrack.map((track) => (
            <article key={track.trackId}>
              <div className="track-art" style={{ backgroundColor: track.artwork?.backgroundColor }}>
                {track.artwork ? (
                  <img
                    src={track.artwork.url}
                    width={track.artwork.width}
                    height={track.artwork.height}
                    alt={`${track.title} by ${track.artist} artwork`}
                    loading="lazy"
                  />
                ) : <Music2 size={22} aria-hidden="true" />}
              </div>
              <div className="track-copy">
                <strong>{track.title}</strong>
                <small>{track.artist} · {track.moment}</small>
                {track.albumName ? <small className="track-album">{track.albumName}</small> : null}
                {track.previewUrl ? (
                  <audio controls preload="none" src={track.previewUrl} aria-label={`Preview ${track.title} by ${track.artist}`}>
                    Your browser does not support Apple Music audio previews.
                  </audio>
                ) : <span className="track-preview-unavailable">Preview unavailable</span>}
              </div>
              <div className="track-actions">
                <em>{track.status}</em>
                {track.sourceUrl ? (
                  <a href={track.sourceUrl} target="_blank" rel="noreferrer">
                    Apple Music <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="cultural-plate">
      <div><span className="field-label">Host opening</span><h2>{plan.theme.headline}</h2><p>{plan.theme.framing}</p></div>
      <div className="theme-grid">{plan.theme.ideas.slice(0, 3).map((idea) => <article key={idea.themeId}><strong>{idea.name}</strong><p>{idea.experienceIdeas[0]}</p></article>)}</div>
    </div>
  );
}

function ShoppingAndPrep({ plan, onToggleShopping, onTogglePrep }: { plan: PartyPlan; onToggleShopping: (id: string) => void; onTogglePrep: (id: string) => void }) {
  const categories = [...new Set(plan.shopping.map((item) => item.category))];
  return (
    <div className="support-view">
      <header className="view-heading"><div><span className="eyebrow">Folio 06 · kitchen operations</span><h1>Shopping & prep</h1><p>Every line stays linked to the course that created it.</p></div><div className="view-progress"><strong>{plan.shopping.filter((item) => item.checked).length}/{plan.shopping.length}</strong><span>items ready</span></div></header>
      <div className="support-columns">
        <section className="shopping-sheet">
          <div className="sheet-title"><ShoppingBasket size={20} /><h2>Shopping ledger</h2><span>{plan.shopping.length} lines</span></div>
          {categories.map((category) => (
            <div className="shopping-group" key={category}>
              <h3>{category}</h3>
              {plan.shopping.filter((item) => item.category === category).map((item) => (
                <button type="button" className={item.checked ? "check-row check-row--done" : "check-row"} key={item.itemId} onClick={() => onToggleShopping(item.itemId)}>
                  <span className="check-box">{item.checked ? <Check size={13} /> : null}</span><span><strong>{item.label}</strong><small>{item.quantity} · {item.sourceCourseIds.length} course link{item.sourceCourseIds.length === 1 ? "" : "s"}</small></span>
                </button>
              ))}
            </div>
          ))}
        </section>
        <section className="prep-sheet">
          <div className="sheet-title"><Clock3 size={20} /><h2>Prep timeline</h2><span>{plan.prep.length} tasks</span></div>
          {plan.prep.map((task) => (
            <button type="button" className={task.done ? "prep-row prep-row--done" : "prep-row"} key={task.taskId} onClick={() => onTogglePrep(task.taskId)}>
              <span className="prep-time">{task.when}</span><span className="prep-marker">{task.done ? <Check size={13} /> : task.minutes}</span><span><strong>{task.title}</strong><small>{task.minutes} minutes · {task.courseId ?? "whole plan"}</small></span>
            </button>
          ))}
          <div className="safety-note"><CircleAlert size={18} /><span><strong>Host verification</strong> Confirm labels, substitutions, and cross-contact before shopping is considered complete.</span></div>
        </section>
      </div>
    </div>
  );
}

function HostPacketReview({ plan, onFinalize, onExport }: { plan: PartyPlan; onFinalize: () => void; onExport: () => void }) {
  const checks = [
    { label: "Theme framing", ready: plan.theme.ideas.length > 0, detail: `${plan.theme.ideas.length} interpreted themes` },
    { label: "Menu", ready: plan.courses.length === 3, detail: `${plan.courses.length} food courses` },
    { label: "Drink pairings", ready: plan.pairings.length >= 6, detail: `${plan.pairings.length} wine + zero-proof options` },
    { label: "Soundtrack", ready: plan.soundtrack.length >= 4, detail: `${plan.soundtrack.length} listening anchors` },
    { label: "Shopping + prep", ready: plan.shopping.length > 0 && plan.prep.length > 0, detail: `${plan.shopping.length} items · ${plan.prep.length} tasks` },
  ];
  return (
    <div className="packet-view">
      <header className="view-heading"><div><span className="eyebrow">Folio 09 · final review</span><h1>Host packet</h1><p>One useful artifact for the kitchen, the table, and the evening’s cultural arc.</p></div><span className={`final-stamp final-stamp--${plan.status.toLowerCase()}`}>{plan.status}</span></header>
      <div className="packet-grid">
        <section className="packet-preview">
          <div className="packet-cover"><span>Supper Club AI · Issue 0052</span><SalonMark size={35} /><h2>{plan.title}</h2><p>A dinner in six movements inspired by <em>{plan.inspiration.title}</em>.</p><dl><div><dt>Date</dt><dd>{formatDate(plan.eventDate)}</dd></div><div><dt>Guests</dt><dd>{plan.guestCount}</dd></div><div><dt>Starts</dt><dd>{plan.eventTime}</dd></div></dl></div>
          <div className="packet-pages"><span>01</span><span>02</span><span>03</span><span>04</span><p>Overview · run of show · menu and pairings · shopping · prep · safety notes</p></div>
        </section>
        <section className="review-ledger">
          <div className="sheet-title"><ListChecks size={20} /><h2>Preflight</h2><span>v{plan.planVersion}</span></div>
          {checks.map((check) => <div className="review-row" key={check.label}><span className={check.ready ? "review-check review-check--ready" : "review-check"}>{check.ready ? <Check size={14} /> : null}</span><span><strong>{check.label}</strong><small>{check.detail}</small></span><em>{check.ready ? "READY" : "NEEDS WORK"}</em></div>)}
          <div className="review-warning"><CircleAlert size={18} /><span><strong>Before you serve</strong> The packet repeats dietary labels but cannot guarantee packaged ingredients or cross-contact.</span></div>
          <div className="packet-actions">
            {plan.status !== "FINALIZED" ? <button className="button-primary" type="button" onClick={onFinalize}><CheckCircle2 size={17} /> Approve and finalize</button> : null}
            <button className={plan.status === "FINALIZED" ? "button-primary" : "button-secondary"} type="button" onClick={onExport}><Download size={17} /> Download PDF</button>
          </div>
          {plan.exports.length ? <div className="export-history"><span className="field-label">Recent exports</span>{plan.exports.slice(0, 3).map((item) => <div key={item.exportId}><FileText size={15} /><span>{item.filename}</span><small>{new Date(item.createdAt).toLocaleString()}</small></div>)}</div> : null}
        </section>
      </div>
    </div>
  );
}

function AgentMarginalia({ receipts, warnings, planVersion }: { receipts: Receipt[]; warnings: PartyPlan["warnings"]; planVersion: number }) {
  return (
    <aside className="agent-rail" aria-label="Agent marginalia and WebMCP receipts">
      <div className="rail-head"><div><span>Agent marginalia</span><small>Visible changes, not another chat</small></div><span className="live-signal"><i /> LIVE</span></div>
      <div className="receipt-list">
        {receipts.slice(0, 6).map((receipt) => {
          const Icon = receiptIcon[receipt.kind];
          return (
            <article className={`receipt receipt--${receipt.kind.toLowerCase()}`} key={receipt.receiptId}>
              <span className="receipt-icon"><Icon size={16} /></span>
              <div><div className="receipt-meta"><time>{receipt.timestamp}</time><span>WebMCP</span></div><h3>{receipt.title}</h3><p>{receipt.detail}</p></div>
              <CheckCircle2 className="receipt-check" size={16} />
            </article>
          );
        })}
      </div>
      {warnings.map((warning) => <article className="conflict-note" key={warning.code}><CircleAlert size={18} /><div><span>{warning.code.replaceAll("_", " ")}</span><p>{warning.message}</p></div></article>)}
      <div className="rail-foot"><span><PenLine size={14} /> Marginalia is saved with plan v{planVersion}</span></div>
    </aside>
  );
}
