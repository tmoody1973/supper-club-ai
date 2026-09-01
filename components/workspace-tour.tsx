"use client";

import {
  ACTIONS,
  EVENTS,
  Joyride,
  ORIGIN,
  STATUS,
  type EventData,
  type Step,
} from "react-joyride";
import { ArrowRight, Compass, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const TOUR_STORAGE_KEY = "supper-club-ai-table-tour-v1";

type TourPreparation = (stepIndex: number) => Promise<void> | void;

type WorkspaceTourProps = {
  startRequest: number;
  prepareStep: TourPreparation;
};

const waitForWorkspace = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });

export function WorkspaceTour({ startRequest, prepareStep }: WorkspaceTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showInvitation, setShowInvitation] = useState(false);

  const prepare = useCallback(async (index: number) => {
    await prepareStep(index);
    await waitForWorkspace();
  }, [prepareStep]);

  const steps = useMemo<Array<Step>>(() => [
    {
      id: "run-of-show",
      target: '[data-tour="run-of-show"]',
      title: "The evening at a glance",
      content: "The Run of Show keeps food, drinks, music, and host cues on one timeline. Think of it as the score for your dinner.",
      placement: "center",
      before: () => prepare(0),
    },
    {
      id: "movement",
      target: '[data-tour="selected-movement"]',
      title: "Open one movement",
      content: "Select any row to see its dish, pairings, cultural connection, source, and host controls. You can edit one movement without rebuilding the whole evening.",
      placement: "bottom",
      before: () => prepare(1),
    },
    {
      id: "marginalia",
      target: () => {
        if (window.matchMedia("(max-width: 680px)").matches) {
          return document.querySelector<HTMLElement>('.mobile-receipts-drawer [data-tour="agent-marginalia"]');
        }
        return document.querySelector<HTMLElement>('.workspace-grid > [data-tour="agent-marginalia"]');
      },
      title: "See what the agent changed",
      content: "Agent Marginalia records tool receipts, warnings, and the plan version. The tour only explains these records—it never calls a WebMCP tool or changes your dinner.",
      placement: "left",
      before: () => prepare(2),
      targetWaitTimeout: 2500,
    },
    {
      id: "shopping-prep",
      target: '[data-tour="shopping-prep"]',
      title: "Turn the menu into kitchen work",
      content: "The shopping ledger collects ingredients from every dish. The prep timeline turns the same menu into an ordered cooking schedule you can check off.",
      placement: "center",
      isFixed: true,
      before: () => prepare(3),
    },
    {
      id: "host-packet",
      target: '[data-tour="host-packet"]',
      title: "Review before you commit",
      content: "The Host Packet is the final preflight. Check the theme, menu, pairings, soundtrack, shopping, prep, and safety notes before you approve or export anything.",
      placement: "center",
      before: () => prepare(4),
    },
    {
      id: "shared-plan",
      target: () => {
        if (window.matchMedia("(max-width: 980px)").matches) {
          return document.querySelector<HTMLElement>(".topbar");
        }
        return document.querySelector<HTMLElement>('[data-tour="shared-plan"]');
      },
      title: "One plan, two places",
      content: "ChatGPT and this website use the same plan ID. When an agent uses a Supper Club tool, the saved plan version and visible receipts update here for you to review.",
      placement: "bottom-end",
      before: () => prepare(5),
    },
  ], [prepare]);

  const remember = useCallback((value: "completed" | "skipped") => {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, value);
    } catch {
      // The tour remains usable when browser storage is unavailable.
    }
  }, []);

  const startTour = useCallback(() => {
    setShowInvitation(false);
    setStepIndex(0);
    setRun(true);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tour") === "1") {
      url.searchParams.delete("tour");
      window.history.replaceState({}, "", url);
      startTour();
      return;
    }

    try {
      if (!window.localStorage.getItem(TOUR_STORAGE_KEY)) {
        const timer = window.setTimeout(() => setShowInvitation(true), 700);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Do not force an invitation when storage is restricted.
    }
  }, [startTour]);

  useEffect(() => {
    if (startRequest > 0) startTour();
  }, [startRequest, startTour]);

  const handleEvent = useCallback((data: EventData) => {
    const { action, index, origin, status, type } = data;

    if (action === ACTIONS.CLOSE && origin === ORIGIN.KEYBOARD) {
      remember("skipped");
      setRun(false);
      return;
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as never)) {
      remember(status === STATUS.FINISHED ? "completed" : "skipped");
      setRun(false);
      return;
    }

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type as never)) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  }, [remember]);

  const dismissInvitation = () => {
    remember("skipped");
    setShowInvitation(false);
  };

  return (
    <>
      <Joyride
        continuous
        run={run}
        stepIndex={stepIndex}
        steps={steps}
        onEvent={handleEvent}
        scrollToFirstStep
        locale={{ back: "Back", last: "Finish tour", next: "Next", nextWithProgress: "Next · {current}/{total}", skip: "Skip tour" }}
        options={{
          buttons: ["back", "skip", "primary"],
          closeButtonAction: "skip",
          dismissKeyAction: "close",
          overlayClickAction: false,
          blockTargetInteraction: true,
          showProgress: true,
          skipBeacon: true,
          scrollDuration: 240,
          scrollOffset: 92,
          spotlightPadding: 7,
          spotlightRadius: 0,
          backgroundColor: "#eee6dd",
          textColor: "#0f0f0e",
          primaryColor: "#983423",
          arrowColor: "#eee6dd",
          overlayColor: "rgba(10, 10, 8, 0.76)",
          width: 390,
          zIndex: 90,
        }}
        styles={{
          tooltip: { border: "1px solid rgba(38, 36, 31, 0.62)", borderRadius: 0, boxShadow: "12px 14px 0 rgba(15, 15, 14, 0.24)" },
          tooltipTitle: { fontFamily: '"Cormorant Garamond", serif', fontSize: 27, fontWeight: 600, lineHeight: 1.05, textAlign: "left" },
          tooltipContent: { fontFamily: '"Barlow Condensed", sans-serif', fontSize: 18, lineHeight: 1.45, padding: "10px 2px 22px", textAlign: "left" },
          tooltipFooter: { borderTop: "1px solid rgba(38, 36, 31, 0.3)", gap: 8, paddingTop: 14 },
          buttonPrimary: { borderRadius: 0, fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", padding: "10px 13px", textTransform: "uppercase" },
          buttonBack: { color: "#2d2b25", fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, marginRight: 0, textTransform: "uppercase" },
          buttonSkip: { color: "#75271a", fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: "uppercase" },
          spotlight: { stroke: "#bac467", strokeWidth: 4 },
        }}
      />

      {showInvitation && !run ? (
        <aside className="tour-invitation" aria-labelledby="tour-invitation-title">
          <button className="tour-invitation__close" type="button" onClick={dismissInvitation} aria-label="Skip the table tour"><X size={16} /></button>
          <span className="tour-invitation__kicker"><Compass size={15} /> New here?</span>
          <h2 id="tour-invitation-title">Take the 90-second table tour.</h2>
          <p>See how the timeline, agent receipts, shopping list, prep schedule, and ChatGPT connection fit together.</p>
          <div>
            <button className="tour-invitation__start" type="button" onClick={startTour}>Take the tour <ArrowRight size={15} /></button>
            <button className="tour-invitation__later" type="button" onClick={dismissInvitation}>Skip</button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
