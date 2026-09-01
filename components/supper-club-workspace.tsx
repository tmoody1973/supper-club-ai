"use client";

import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Compass,
  Clock3,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Grape,
  Leaf,
  ListChecks,
  MapPin,
  Menu as MenuIcon,
  Music2,
  Pause,
  PenLine,
  Play,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  ShoppingBasket,
  Store,
  Users,
  UtensilsCrossed,
  Wine,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceTour } from "@/components/workspace-tour";
import { downloadHostPacket } from "@/lib/export-pdf";
import {
  buildGuestShareKitPreview,
  downloadGuestShareKit,
  type GuestShareKitPreview,
} from "@/lib/guest-share-kit";
import {
  createDynamicSharedPlan,
  createSharedPlan,
  PlanClientError,
  readSharedPlan,
  replaceSharedPlan,
} from "@/lib/plan-store-client";
import type { PlanCreationConfiguration } from "@/lib/plan-store-contracts";
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

type GroceryStore = {
  locationId: string;
  name: string;
  chain?: string;
  address: string;
};

type GroceryStoresData = {
  stores: GroceryStore[];
  provider: string;
  zipCode: string;
  retrievedAt: string;
};

type GroceryPriceLine = {
  itemId: string;
  ingredient: string;
  quantity: string;
  status: "PRICED" | "UNPRICED";
  sourceCourses: Array<{ courseId: string; title: string }>;
  product?: string;
  brand?: string;
  packageSize?: string;
  packages?: number;
  unitPrice?: number;
  regularPrice?: number;
  promoPrice?: number;
  stockLevel?: string;
  lineTotal?: number;
  confidence?: "LOW" | "MEDIUM";
  rationale?: string;
  reason?: string;
  productUrl?: string;
};

type GroceryPricingData = {
  provider: string;
  store: GroceryStore;
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
  lines: GroceryPriceLine[];
  page: { number: number; pageSize: number; totalPages: number; totalItems: number };
  retrievedAt: string;
};

function formatPreviewTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const wholeSeconds = Math.floor(value);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function TrackPreviewPlayer({
  src,
  title,
  artist,
}: {
  src: string;
  title: string;
  artist: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    document.querySelectorAll<HTMLAudioElement>(".track-preview-player audio").forEach((otherAudio) => {
      if (otherAudio !== audio) otherAudio.pause();
    });

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
      setHasError(true);
    }
  };

  return (
    <div className={`track-preview-player${hasError ? " track-preview-player--error" : ""}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        aria-hidden="true"
        onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={(event) => {
          event.currentTarget.currentTime = 0;
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setHasError(true);
        }}
      />
      <button
        type="button"
        className="track-preview-toggle"
        onClick={togglePlayback}
        disabled={hasError}
        aria-label={`${isPlaying ? "Pause" : "Play"} preview of ${title} by ${artist}`}
      >
        {isPlaying ? <Pause size={15} fill="currentColor" aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />}
      </button>
      <div className="track-preview-progress">
        <span role="status" aria-live="polite">
          {hasError ? "Preview could not be played" : isPlaying ? "Playing preview" : "Apple Music preview"}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          disabled={!duration || hasError}
          aria-label={`Seek preview of ${title} by ${artist}`}
          aria-valuetext={`${formatPreviewTime(currentTime)} of ${formatPreviewTime(duration)}`}
          onChange={(event) => {
            const nextTime = Number(event.currentTarget.value);
            if (audioRef.current) audioRef.current.currentTime = nextTime;
            setCurrentTime(nextTime);
          }}
        />
      </div>
      <output className="track-preview-time" aria-label="Preview time">
        {formatPreviewTime(currentTime)} / {duration ? formatPreviewTime(duration) : "–:––"}
      </output>
    </div>
  );
}

const navItems = [
  { number: "01", label: "Overview", view: "RUN_OF_SHOW" as const, movementId: "movement-arrival" },
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

function ThemeSeal({ title, author }: { title: string; author: string }) {
  const ringLabel = `${title} · ${author} · `.toUpperCase();
  return (
    <svg viewBox="0 0 140 140" role="img" aria-label={`${title} by ${author}`}>
      <defs>
        <path id="theme-ring" d="M 70,70 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0" />
      </defs>
      <circle cx="70" cy="70" r="61" />
      <circle cx="70" cy="70" r="44" />
      <text><textPath href="#theme-ring" startOffset="2%">{ringLabel}</textPath></text>
      <path className="seal-stem" d="M70 43L90 70L70 97L50 70Z" />
      <circle className="seal-roots" cx="70" cy="70" r="9" />
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
  const [webmcpToolCount, setWebmcpToolCount] = useState(0);
  const [planStoreMode, setPlanStoreMode] = useState<PlanStoreMode>("BOOTING");
  const [toast, setToast] = useState<string | null>(null);
  const [groceryStores, setGroceryStores] = useState<GroceryStoresData | null>(null);
  const [groceryPricing, setGroceryPricing] = useState<GroceryPricingData | null>(null);
  const [tourStartRequest, setTourStartRequest] = useState(0);
  const [refreshingMusic, setRefreshingMusic] = useState(false);
  const [guestSharePreview, setGuestSharePreview] = useState<GuestShareKitPreview | null>(null);
  const [guestShareIncludeLocation, setGuestShareIncludeLocation] = useState(false);
  const [guestShareBusy, setGuestShareBusy] = useState(false);
  const createPlanInFlightRef = useRef(false);

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

  const showGroceryToolData = useCallback((operation: string, data: unknown) => {
    if (operation === "FIND_GROCERY_STORES") {
      setGroceryStores(data as GroceryStoresData);
      setActiveView("SHOPPING");
      announce("Nearby stores are ready for review");
    }
    if (operation === "PRICE_SHOPPING_LIST") {
      setGroceryPricing(data as GroceryPricingData);
      setActiveView("SHOPPING");
      announce("The grocery estimate is visible in Shopping & prep");
    }
    if (operation === "PREVIEW_GUEST_SHARE_KIT") {
      const preview = data as GuestShareKitPreview;
      setGuestSharePreview(preview);
      setGuestShareIncludeLocation(Boolean(preview.location));
      setActiveView("HOST_PACKET");
      announce("The guest share kit is ready for review");
    }
  }, [announce]);

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
        if (planRef.current.planId === next.planId) updatePlan(result.plan);
        return result.plan;
      } catch (error) {
        if (error instanceof PlanClientError && error.code === "VERSION_CONFLICT") {
          const current = await readSharedPlan(next.planId);
          if (planRef.current.planId === next.planId) {
            updatePlan(current.plan);
            announce(`A newer plan was loaded · v${current.plan.planVersion}`);
          }
        }
        throw error;
      }
    },
    [announce, planStoreMode, updatePlan],
  );

  const createAndOpenPartyPlan = useCallback(async (
    configuration: PlanCreationConfiguration,
    signal: AbortSignal,
  ) => {
    if (createPlanInFlightRef.current) {
      throw new Error("A new supper club plan is already being created.");
    }
    createPlanInFlightRef.current = true;
    try {
      const result = await createDynamicSharedPlan(configuration, signal);
      if (signal.aborted) throw new DOMException("Plan creation was cancelled.", "AbortError");
      updatePlan(result.plan);
      setPlanStoreMode("SHARED");
      setActiveView("RUN_OF_SHOW");
      setSelectedMovementId("movement-main");
      setGroceryStores(null);
      setGroceryPricing(null);
      setGuestSharePreview(null);
      setGuestShareIncludeLocation(false);
      setConfirmingFinalize(false);
      setMobileNavOpen(false);
      setMobileReceiptsOpen(false);
      setUtilityMenuOpen(false);
      const url = new URL(window.location.href);
      url.searchParams.set("plan", result.plan.planId);
      window.history.pushState({}, "", url);
      announce(`Fresh plan opened · ${result.plan.title}`);
      return result;
    } finally {
      createPlanInFlightRef.current = false;
    }
  }, [announce, updatePlan]);

  useEffect(() => {
    if (planStoreMode === "BOOTING") return;
    const controller = new AbortController();
    let active = true;
    registerSupperClubTools({
      getPlan: () => planRef.current,
      createPartyPlan: createAndOpenPartyPlan,
      syncPlan: (next) => {
        updatePlan(next);
        announce(`${next.receipts[0]?.title ?? "Plan updated"} · v${next.planVersion}`);
      },
      setPlan: async (next) => {
        const saved = await persistPlan(next, next.planVersion - 1);
        announce(`${saved.receipts[0]?.title ?? "Plan updated"} · v${saved.planVersion}`);
      },
      exportHostPacket: downloadHostPacket,
      exportGuestShareKit: downloadGuestShareKit,
      showToolData: showGroceryToolData,
    }, controller)
      .then((registration) => {
        if (!active) {
          registration?.controller.abort();
          return;
        }
        if (registration) {
          setWebmcpToolCount(registration.count);
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
  }, [announce, createAndOpenPartyPlan, persistPlan, planStoreMode, showGroceryToolData]);

  useEffect(() => {
    setGroceryPricing(null);
  }, [plan.planId, plan.planVersion]);

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

  const refreshMusicMetadata = useCallback(async () => {
    const current = planRef.current;
    if (planStoreMode !== "SHARED") {
      announce("Music refresh needs the shared plan service. Try again when the connection is restored.");
      return;
    }
    setRefreshingMusic(true);
    try {
      const response = await fetch(`/api/plans/${encodeURIComponent(current.planId)}/tools`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "REFRESH_MUSIC_METADATA",
          expectedPlanVersion: current.planVersion,
          storefront: "us",
        }),
      });
      const payload = await response.json() as {
        ok?: boolean;
        plan?: PartyPlan;
        data?: { matchedCount?: number; preservedCount?: number; reviewedSeedCount?: number };
        error?: { message?: string };
      };
      if (!response.ok || !payload.plan) throw new Error(payload.error?.message ?? "Music metadata could not be refreshed.");
      updatePlan(payload.plan);
      const counts = payload.data;
      announce(`${counts?.matchedCount ?? 0} live Apple Music matches · ${counts?.reviewedSeedCount ?? 0} reviewed seeds`);
    } catch (error) {
      console.error("[Supper Club AI] Music metadata refresh failed", error);
      announce(error instanceof Error ? error.message : "Music metadata could not be refreshed.");
    } finally {
      setRefreshingMusic(false);
    }
  }, [announce, planStoreMode, updatePlan]);

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

  const previewGuestShare = useCallback((includeLocation = guestShareIncludeLocation) => {
    const preview = buildGuestShareKitPreview(planRef.current, {
      includeLocation,
      tone: "EDITORIAL",
    });
    setGuestSharePreview(preview);
    setGuestShareIncludeLocation(includeLocation);
    setActiveView("HOST_PACKET");
    announce("The guest share kit is ready for review");
  }, [announce, guestShareIncludeLocation]);

  const changeGuestShareLocation = useCallback((includeLocation: boolean) => {
    setGuestShareIncludeLocation(includeLocation);
    if (guestSharePreview) previewGuestShare(includeLocation);
  }, [guestSharePreview, previewGuestShare]);

  const exportGuestShare = async () => {
    if (planRef.current.status !== "FINALIZED") {
      setConfirmingFinalize(true);
      announce("Finalize the plan before exporting guest-facing materials");
      return;
    }
    setGuestShareBusy(true);
    try {
      const result = await downloadGuestShareKit(planRef.current, {
        includeLocation: guestShareIncludeLocation,
        tone: "EDITORIAL",
      });
      localCommit(
        (next) => {
          next.exports.unshift({
            exportId: `export-${Date.now()}`,
            filename: result.filename,
            createdAt: new Date().toISOString(),
          });
        },
        {
          tool: "export_guest_share_kit",
          title: "Guest share kit exported",
          detail: `${result.filename} · ${result.files.length} guest-safe files`,
          kind: "SYSTEM",
          status: "APPLIED",
        },
      );
      announce("Guest share kit downloaded");
    } catch (error) {
      console.error("[Supper Club AI] Guest share export failed", error);
      announce("The guest share kit could not be created. Please try again.");
    } finally {
      setGuestShareBusy(false);
    }
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

  const startTableTour = () => {
    setUtilityMenuOpen(false);
    setTourStartRequest((request) => request + 1);
  };

  const prepareTourStep = useCallback(async (stepIndex: number) => {
    setMobileNavOpen(false);
    if (stepIndex !== 2) setMobileReceiptsOpen(false);

    if (stepIndex <= 2) {
      setActiveView("RUN_OF_SHOW");
      setSelectedMovementId("movement-main");
    } else if (stepIndex === 3) {
      setActiveView("SHOPPING");
    } else if (stepIndex === 4) {
      setActiveView("HOST_PACKET");
    } else {
      setActiveView("RUN_OF_SHOW");
    }

    if (stepIndex === 2 && window.matchMedia("(max-width: 680px)").matches) {
      setMobileReceiptsOpen(true);
    }
  }, []);

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
          <Link className="about-link" href="/about" prefetch={false}>About / how to use</Link>
          <ThemeToggle />
          <span className="issue-label">Issue 0052</span>
          <span className="plan-state">{plan.status === "FINALIZED" ? "Finalized" : "Plan editing"}</span>
          <span className="last-saved"><small>Last saved</small><strong>Today {formatLastSaved(plan.updatedAt)}</strong></span>
          <span data-tour="shared-plan" className={`tool-status tool-status--${webmcpStatus.toLowerCase()}`} title="WebMCP connection status">
            <span className="tool-status-dot" />
            {webmcpStatus === "READY" ? `${webmcpToolCount} tools live` : webmcpStatus === "PREVIEW" ? "Preview mode" : webmcpStatus === "ERROR" ? "Tool error" : "Connecting"}
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
          <button type="button" role="menuitem" onClick={startTableTour}><Compass size={15} /> Take the 90-second table tour</button>
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
                  <span className="folio-copy"><strong>{item.label}</strong>{item.number === "01" ? <small>{plan.title}</small> : null}</span>
                  {selectedNavNumber === item.number ? <span className="folio-active-dot" /> : null}
                </button>
              </li>
            ))}
          </ol>
          <Link className="folio-guide-link" href="/about" prefetch={false}>
            <BookOpen size={15} aria-hidden="true" />
            <span>About / guide</span>
          </Link>
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
              onRefreshMusic={refreshMusicMetadata}
              refreshingMusic={refreshingMusic}
            />
          ) : null}

          {activeView === "SHOPPING" ? (
            <ShoppingAndPrep
              plan={plan}
              onToggleShopping={toggleShopping}
              onTogglePrep={togglePrep}
              groceryStores={groceryStores}
              groceryPricing={groceryPricing}
              onGroceryStores={setGroceryStores}
              onGroceryPricing={setGroceryPricing}
            />
          ) : null}

          {activeView === "HOST_PACKET" ? (
            <HostPacketReview
              plan={plan}
              onFinalize={() => setConfirmingFinalize(true)}
              onExport={exportPacket}
              guestSharePreview={guestSharePreview}
              guestShareIncludeLocation={guestShareIncludeLocation}
              guestShareBusy={guestShareBusy}
              onPreviewGuestShare={() => previewGuestShare()}
              onExportGuestShare={exportGuestShare}
              onGuestShareLocationChange={changeGuestShareLocation}
            />
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
            <h2 id="finalize-title">Finalize {plan.title}?</h2>
            <p>This locks the current plan for export. You can keep editing later, but a new version will be created.</p>
            <div className="dialog-warning"><CircleAlert size={18} /> Dietary labels are informational. Verify labels and cross-contact with every guest.</div>
            <div className="dialog-actions">
              <button type="button" className="button-secondary" onClick={() => setConfirmingFinalize(false)}>Keep editing</button>
              <button type="button" className="button-primary" onClick={finalizePlan}>Approve and finalize</button>
            </div>
          </section>
        </div>
      ) : null}

      <WorkspaceTour startRequest={tourStartRequest} prepareStep={prepareTourStep} />

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
  onRefreshMusic,
  refreshingMusic,
}: {
  plan: PartyPlan;
  selectedMovementId: string;
  onSelectMovement: (id: string) => void;
  selectedCourse?: MenuCourse;
  selectedPairings: PartyPlan["pairings"];
  onConfirmCourse: (courseId: string) => void;
  onReplaceCourse: (course: MenuCourse) => void;
  onRefreshMusic: () => void;
  refreshingMusic: boolean;
}) {
  return (
    <div className="run-layout" data-tour="run-of-show">
      <aside className="plan-intro">
        <span className="eyebrow">{formatDate(plan.eventDate)}</span>
        <strong className="intro-title">{plan.title}</strong>
        <span className="intro-location">{plan.location}</span>
        <div className={plan.inspiration.cover ? "inspiration-visuals inspiration-visuals--with-cover" : "inspiration-visuals"}>
          {plan.inspiration.cover ? (
            <figure className="book-cover-card">
              <a href={plan.inspiration.cover.sourceUrl} target="_blank" rel="noreferrer" title="View the Open Library record">
                <img
                  src={plan.inspiration.cover.imageUrl}
                  alt={plan.inspiration.cover.alt}
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </a>
              <figcaption>Cover via Open Library</figcaption>
            </figure>
          ) : null}
          <div className="earthseed-seal"><ThemeSeal title={plan.inspiration.title} author={plan.inspiration.author} /></div>
        </div>
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
          const movementTrack = plan.soundtrack.find((track) =>
            track.artist.toLowerCase() === movement.musicLabel.toLowerCase())
            ?? (movement.movementId === "movement-dessert" ? plan.soundtrack.at(-1) : undefined);
          return (
            <article data-tour={selected ? "selected-movement" : undefined} className={selected ? "movement movement--selected" : "movement"} key={movement.movementId}>
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
                  <CoursePlate
                    course={selectedCourse}
                    pairings={selectedPairings}
                    musicCue={movementTrack ? `${movementTrack.artist} — ${movementTrack.title}` : movement.musicLabel}
                    onConfirm={() => onConfirmCourse(selectedCourse.courseId)}
                    onReplace={() => onReplaceCourse(selectedCourse)}
                  />
                ) : (
                  <CulturalPlate movementId={movement.movementId} plan={plan} onRefreshMusic={onRefreshMusic} refreshingMusic={refreshingMusic} />
                )
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CoursePlate({ course, pairings, musicCue, onConfirm, onReplace }: { course: MenuCourse; pairings: PartyPlan["pairings"]; musicCue: string; onConfirm: () => void; onReplace: () => void }) {
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
        <div className="plate-field"><Leaf size={15} /><span><small>Zero-proof</small><strong>{zero?.name ?? "Not selected"}</strong><p>{zero?.pairingReason}</p>{zero?.recipeDetails ? <><p>{zero.recipeDetails.prepMinutes} min · {zero.recipeDetails.ingredients.slice(0, 4).map((ingredient) => ingredient.name).join(", ")}</p><a className="source-link" href={zero.recipeDetails.instructionsUrl} target="_blank" rel="noreferrer"><FileText size={14} /> View zero-proof recipe <ChevronRight size={14} /></a></> : null}</span></div>
        <div className="plate-field"><Music2 size={15} /><span><small>Music cue</small><strong>{musicCue}</strong></span></div>
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

function CulturalPlate({
  movementId,
  plan,
  onRefreshMusic,
  refreshingMusic,
}: {
  movementId: string;
  plan: PartyPlan;
  onRefreshMusic: () => void;
  refreshingMusic: boolean;
}) {
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
        <div className="listening-intro">
          <div><span className="field-label">Listening interval</span><h2>Music for the long view</h2><p>A draft sequence supports arrival, focus, conversation, and reflection without saving anything to the host’s library.</p></div>
          <button className="music-refresh-button" type="button" onClick={onRefreshMusic} disabled={refreshingMusic}>
            <RefreshCw size={15} className={refreshingMusic ? "is-spinning" : undefined} aria-hidden="true" />
            {refreshingMusic ? "Matching each track…" : "Refresh music metadata"}
          </button>
        </div>
        <div className="track-list">
          {plan.soundtrack.map((track) => {
            const isLiveMatch = track.metadataStatus === "LIVE_APPLE_MUSIC_MATCH" || Boolean(track.providerId);
            const discoveryOrigin = track.provenance?.discovery.origin;
            const verificationStatus = track.provenance?.verification.status;
            const discoverySource = track.provenance?.discovery.sources[0];
            return (
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
                {track.provenance?.discovery.rationale ? (
                  <details className="track-context">
                    <summary>Why this track</summary>
                    <div>
                      <p><b>Selection note</b>{track.provenance.discovery.rationale}</p>
                      {track.provenance.discovery.sources.length ? (
                        <nav aria-label={`Discovery sources for ${track.title}`}>
                          {track.provenance.discovery.sources.slice(0, 3).map((source) => (
                            <a key={source.sourceId} href={source.url} target="_blank" rel="noreferrer">
                              {source.title} <ExternalLink size={11} aria-hidden="true" />
                            </a>
                          ))}
                        </nav>
                      ) : null}
                    </div>
                  </details>
                ) : null}
                {track.editorialContext ? (
                  <details className="track-context">
                    <summary>Artist + album context</summary>
                    <div>
                      <p><b>Artist</b>{track.editorialContext.artistOverview}</p>
                      <p><b>Recording</b>{track.editorialContext.albumOverview}</p>
                      <p><b>Why it matters</b>{track.editorialContext.culturalContext}</p>
                      <p><b>Host cue</b>{track.editorialContext.hostingNote}</p>
                      {track.editorialContext.sources.length ? (
                        <nav aria-label={`Sources for ${track.title}`}>
                          {track.editorialContext.sources.slice(0, 4).map((source) => (
                            <a key={source.sourceId} href={source.url} target="_blank" rel="noreferrer">
                              {source.title} <ExternalLink size={11} aria-hidden="true" />
                            </a>
                          ))}
                        </nav>
                      ) : null}
                    </div>
                  </details>
                ) : null}
                {track.previewUrl ? (
                  <TrackPreviewPlayer
                    key={track.previewUrl}
                    src={track.previewUrl}
                    title={track.title}
                    artist={track.artist}
                  />
                ) : (
                  <span className="track-preview-unavailable">
                    Preview unavailable for this storefront.
                    {track.sourceUrl ? <a href={track.sourceUrl} target="_blank" rel="noreferrer">Open in Apple Music <ExternalLink size={11} aria-hidden="true" /></a> : null}
                  </span>
                )}
              </div>
              <div className="track-actions">
                <em>{track.status}</em>
                <span className={discoveryOrigin === "PERPLEXITY" ? "track-match track-match--discovery" : "track-match track-match--seed"}>
                  {discoveryOrigin === "PERPLEXITY" ? "Perplexity discovery" : "Reviewed seed"}
                </span>
                <span className={verificationStatus === "MATCHED" || isLiveMatch ? "track-match track-match--live" : "track-match track-match--seed"}>
                  {verificationStatus === "MATCHED" || isLiveMatch ? "Verified by Apple Music" : "Apple match unavailable"}
                </span>
                {discoverySource ? (
                  <a href={discoverySource.url} target="_blank" rel="noreferrer">
                    Discovery source <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : null}
                {track.previewUrl && track.sourceUrl ? (
                  <a href={track.sourceUrl} target="_blank" rel="noreferrer">
                    Open in Apple Music <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </article>
          )})}
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

function ShoppingAndPrep({
  plan,
  onToggleShopping,
  onTogglePrep,
  groceryStores,
  groceryPricing,
  onGroceryStores,
  onGroceryPricing,
}: {
  plan: PartyPlan;
  onToggleShopping: (id: string) => void;
  onTogglePrep: (id: string) => void;
  groceryStores: GroceryStoresData | null;
  groceryPricing: GroceryPricingData | null;
  onGroceryStores: (data: GroceryStoresData | null) => void;
  onGroceryPricing: (data: GroceryPricingData | null) => void;
}) {
  const categories = [...new Set(plan.shopping.map((item) => item.category))];
  const [zipCode, setZipCode] = useState(() => plan.location.toLowerCase().includes("milwaukee") ? "53202" : "");
  const [groceryState, setGroceryState] = useState<"IDLE" | "LOCATING" | "PRICING">("IDLE");
  const [groceryError, setGroceryError] = useState<string | null>(null);

  const runGroceryOperation = async <T,>(operation: string, input: Record<string, unknown>) => {
    const response = await fetch(`/api/plans/${encodeURIComponent(plan.planId)}/tools`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation, ...input }),
    });
    const payload = await response.json() as { ok?: boolean; data?: T; error?: { message?: string } };
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.error?.message ?? "The grocery service could not complete that request.");
    }
    return payload.data;
  };

  const findStores = async () => {
    if (!/^\d{5}$/.test(zipCode)) {
      setGroceryError("Enter a five-digit ZIP code.");
      return;
    }
    setGroceryState("LOCATING");
    setGroceryError(null);
    onGroceryPricing(null);
    try {
      const data = await runGroceryOperation<GroceryStoresData>("FIND_GROCERY_STORES", { zipCode, radiusInMiles: 10, limit: 3 });
      onGroceryStores(data);
      if (!data.stores.length) setGroceryError("No Kroger-family stores were found within 10 miles.");
    } catch (error) {
      setGroceryError(error instanceof Error ? error.message : "Nearby stores could not be loaded.");
    } finally {
      setGroceryState("IDLE");
    }
  };

  const priceAtStore = async (locationId: string, page = 1) => {
    setGroceryState("PRICING");
    setGroceryError(null);
    try {
      const data = await runGroceryOperation<GroceryPricingData>("PRICE_SHOPPING_LIST", { locationId, page, pageSize: 5 });
      onGroceryPricing(data);
    } catch (error) {
      setGroceryError(error instanceof Error ? error.message : "This shopping list could not be priced.");
    } finally {
      setGroceryState("IDLE");
    }
  };

  const priceGroups = groceryPricing?.lines.reduce<Record<string, GroceryPriceLine[]>>((groups, line) => {
    const key = line.sourceCourses.length === 1 ? line.sourceCourses[0].title : "Shared pantry";
    (groups[key] ??= []).push(line);
    return groups;
  }, {}) ?? {};

  return (
    <div className="support-view" data-tour="shopping-prep">
      <header className="view-heading"><div><span className="eyebrow">Folio 06 · kitchen operations</span><h1>Shopping & prep</h1><p>Every line stays linked to the course that created it.</p></div><div className="view-progress"><strong>{plan.shopping.filter((item) => item.checked).length}/{plan.shopping.length}</strong><span>items ready</span></div></header>
      <section className="grocery-quote" aria-labelledby="grocery-quote-title">
        <div className="grocery-quote__masthead">
          <div><span className="eyebrow">Live retailer estimate · optional</span><h2 id="grocery-quote-title">Price the provisions</h2><p>Choose the store you would actually visit. We will match the plan to current package prices without placing an order.</p></div>
          <Store size={34} aria-hidden="true" />
        </div>
        <div className="store-locator">
          <label htmlFor="grocery-zip"><span>Shopping ZIP</span><input id="grocery-zip" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={zipCode} onChange={(event) => setZipCode(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="53202" /></label>
          <button type="button" onClick={findStores} disabled={groceryState !== "IDLE"}><Search size={16} />{groceryState === "LOCATING" ? "Finding stores…" : "Find nearby stores"}</button>
          <small>Location affects price and stock. No cart or purchase is created.</small>
        </div>
        {groceryError ? <div className="grocery-error" role="alert"><CircleAlert size={16} />{groceryError}</div> : null}
        {groceryStores?.stores.length ? (
          <div className="store-choices" aria-label="Nearby stores">
            {groceryStores.stores.map((store) => {
              const active = groceryPricing?.store.locationId === store.locationId;
              return <button type="button" className={active ? "store-choice store-choice--active" : "store-choice"} key={store.locationId} onClick={() => priceAtStore(store.locationId)} disabled={groceryState !== "IDLE"}><MapPin size={16} /><span><strong>{store.name}</strong><small>{store.address}</small></span><em>{active ? "PRICED" : "USE STORE"}</em></button>;
            })}
          </div>
        ) : null}
        {groceryState === "PRICING" ? <div className="pricing-working"><span />Matching {plan.shopping.length} ingredients to store packages…</div> : null}
        {groceryPricing ? (
          <div className="price-ledger">
            <div className="price-ledger__store"><div><span className="field-label">Selected market</span><strong>{groceryPricing.store.name}</strong><small>{groceryPricing.store.address}</small></div><div><span className="field-label">Quoted</span><strong>{new Date(groceryPricing.retrievedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><small>prices can change</small></div></div>
            <dl className="price-summary">
              <div><dt>Estimated subtotal</dt><dd>${groceryPricing.estimate.subtotal.toFixed(2)}</dd></div>
              <div><dt>Plan budget left</dt><dd className={groceryPricing.estimate.isWithinPlanBudget ? "" : "price-over"}>${groceryPricing.estimate.remainingPlanBudget.toFixed(2)}</dd></div>
              <div><dt>Matched</dt><dd>{groceryPricing.estimate.pricedItems}/{groceryPricing.estimate.totalItems}</dd><small>{groceryPricing.estimate.coveragePercent}% coverage</small></div>
              <div><dt>Estimate confidence</dt><dd>{groceryPricing.estimate.confidence}</dd><small>{groceryPricing.estimate.lowConfidenceItems} lines need review</small></div>
            </dl>
            <div className="dish-price-groups">
              {Object.entries(priceGroups).map(([dish, lines]) => (
                <section className="dish-price-group" key={dish}>
                  <h3>{dish}</h3>
                  {lines.map((line) => <div className={`price-line price-line--${line.status.toLowerCase()}`} key={line.itemId}><div><strong>{line.ingredient}</strong><small>{line.status === "PRICED" ? `${line.product}${line.packageSize ? ` · ${line.packageSize}` : ""}` : line.reason}</small><em>{line.sourceCourses.map((course) => course.title).join(" · ")}</em></div><div>{line.status === "PRICED" ? <><strong>${line.lineTotal?.toFixed(2)}</strong><small>{line.packages} × ${line.unitPrice?.toFixed(2)}{line.promoPrice ? " promo" : ""}</small><em>{line.stockLevel?.replaceAll("_", " ") ?? "stock unknown"} · {line.confidence} confidence</em></> : <span>UNPRICED</span>}</div></div>)}
                </section>
              ))}
            </div>
            <div className="price-pagination"><button type="button" disabled={groceryPricing.page.number <= 1 || groceryState !== "IDLE"} onClick={() => priceAtStore(groceryPricing.store.locationId, groceryPricing.page.number - 1)}>Previous</button><span>Lines {(groceryPricing.page.number - 1) * groceryPricing.page.pageSize + 1}–{Math.min(groceryPricing.page.number * groceryPricing.page.pageSize, groceryPricing.page.totalItems)} of {groceryPricing.page.totalItems}</span><button type="button" disabled={groceryPricing.page.number >= groceryPricing.page.totalPages || groceryState !== "IDLE"} onClick={() => priceAtStore(groceryPricing.store.locationId, groceryPricing.page.number + 1)}>Next</button></div>
            <div className="pricing-caveat"><CircleAlert size={17} /><p><strong>Estimate, not checkout.</strong> {groceryPricing.estimate.note} Review low-confidence matches and quantities before shopping.</p></div>
          </div>
        ) : null}
      </section>
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

function HostPacketReview({
  plan,
  onFinalize,
  onExport,
  guestSharePreview,
  guestShareIncludeLocation,
  guestShareBusy,
  onPreviewGuestShare,
  onExportGuestShare,
  onGuestShareLocationChange,
}: {
  plan: PartyPlan;
  onFinalize: () => void;
  onExport: () => void;
  guestSharePreview: GuestShareKitPreview | null;
  guestShareIncludeLocation: boolean;
  guestShareBusy: boolean;
  onPreviewGuestShare: () => void;
  onExportGuestShare: () => void;
  onGuestShareLocationChange: (includeLocation: boolean) => void;
}) {
  const checks = [
    { label: "Theme framing", ready: plan.theme.ideas.length > 0, detail: `${plan.theme.ideas.length} interpreted themes` },
    { label: "Menu", ready: plan.courses.length === 3, detail: `${plan.courses.length} food courses` },
    { label: "Drink pairings", ready: plan.pairings.length >= 6, detail: `${plan.pairings.length} wine + zero-proof options` },
    { label: "Soundtrack", ready: plan.soundtrack.length >= 4, detail: `${plan.soundtrack.length} listening anchors` },
    { label: "Shopping + prep", ready: plan.shopping.length > 0 && plan.prep.length > 0, detail: `${plan.shopping.length} items · ${plan.prep.length} tasks` },
  ];
  return (
    <div className="packet-view" data-tour="host-packet">
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
      <section className="guest-share-studio" data-guest-share-preview aria-labelledby="guest-share-title">
        <header className="guest-share-heading">
          <div>
            <span className="eyebrow">Guest-facing edition</span>
            <h2 id="guest-share-title">Guest Share Kit</h2>
            <p>A visual program and social package that matches the evening—without exposing budgets, shopping, prep, receipts, plan IDs, or source internals.</p>
          </div>
          <span className="guest-share-count">7 files</span>
        </header>

        <div className="guest-share-layout">
          <div className="guest-card-preview" aria-label="Guest social card preview">
            <div className="guest-card-rule" />
            <span>Supper Club AI · Guest Edition</span>
            <h3>{guestSharePreview?.title ?? plan.title}</h3>
            <p>{guestSharePreview?.framing ?? "Preview the guest-safe edition before creating any files."}</p>
            <dl>
              <div><dt>Date</dt><dd>{guestSharePreview?.date ?? formatDate(plan.eventDate)}</dd></div>
              <div><dt>Starts</dt><dd>{guestSharePreview?.time ?? plan.eventTime}</dd></div>
              <div><dt>Guests</dt><dd>{guestSharePreview?.guestCount ?? plan.guestCount}</dd></div>
            </dl>
            {guestSharePreview?.location ? <small>{guestSharePreview.location}</small> : <small>Location kept private</small>}
          </div>

          <div className="guest-share-copy">
            <span className="field-label">Package contents</span>
            <ul>
              <li>Guest program PDF</li>
              <li>Square, portrait, and story PNG cards</li>
              <li>Announcement and reminder captions</li>
              <li>Alt text and a machine-readable manifest</li>
            </ul>
            {guestSharePreview ? (
              <blockquote>{guestSharePreview.announcementCaption}</blockquote>
            ) : (
              <p>Preview first to inspect the guest language and privacy choices. Previewing does not download or publish anything.</p>
            )}
            <label className="guest-location-choice">
              <input
                type="checkbox"
                checked={guestShareIncludeLocation}
                onChange={(event) => onGuestShareLocationChange(event.target.checked)}
              />
              <span><strong>Include location in guest files</strong><small>Off by default. Only enable this for a private guest distribution.</small></span>
            </label>
            <div className="guest-share-actions">
              <button className="button-secondary" type="button" onClick={onPreviewGuestShare}>
                <Eye size={17} /> Preview guest kit
              </button>
              <button className="button-primary" type="button" onClick={onExportGuestShare} disabled={guestShareBusy}>
                <Share2 size={17} /> {guestShareBusy ? "Building package…" : "Download guest kit"}
              </button>
            </div>
            <p className="guest-share-status" aria-live="polite">
              {guestSharePreview ? "Preview ready. Export still requires a finalized plan and explicit host action." : "No files have been created."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AgentMarginalia({ receipts, warnings, planVersion }: { receipts: Receipt[]; warnings: PartyPlan["warnings"]; planVersion: number }) {
  return (
    <aside className="agent-rail" data-tour="agent-marginalia" aria-label="Agent marginalia and WebMCP receipts">
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
