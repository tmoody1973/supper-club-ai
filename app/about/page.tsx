import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChefHat,
  ExternalLink,
  Grape,
  MessageSquare,
  Music2,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Terminal,
} from "lucide-react";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About & How to Use · Supper Club AI",
  description:
    "Learn how Supper Club AI helps a Creative Host and an AI agent build one coherent dinner-party plan together.",
};

const planningSteps = [
  {
    number: "01",
    title: "Bring an inspiration",
    copy: "Start with a book, artist, place, era, question, or feeling—not a spreadsheet of dishes.",
    icon: BookOpen,
  },
  {
    number: "02",
    title: "Name the real constraints",
    copy: "Tell the agent your guest count, budget, dietary needs, date, and the tone you want the room to hold.",
    icon: MessageSquare,
  },
  {
    number: "03",
    title: "Let the agent compose",
    copy: "Supper Club AI researches the theme and coordinates menu, pairings, music, shopping, and preparation.",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "Edit with taste",
    copy: "Keep what feels right. Replace one course, revise a pairing, or change the soundtrack without losing the evening.",
    icon: ChefHat,
  },
  {
    number: "05",
    title: "Review the evidence",
    copy: "Sources, warnings, dietary labels, and every agent change stay visible on the shared planning surface.",
    icon: ShieldCheck,
  },
  {
    number: "06",
    title: "Approve the useful version",
    copy: "Explicitly finalize the plan, then use the shopping checklist, prep timeline, and downloadable host packet.",
    icon: CheckCircle2,
  },
];

const webmcpSteps = [
  "Open Supper Club AI in ChatGPT’s in-app browser. Keep the site and your conversation together.",
  "Look for “9 tools live” in the black header. That means the page has made its WebMCP capabilities available.",
  "In chat, describe the gathering and ask ChatGPT to use the Supper Club AI tools—not merely suggest ideas in prose.",
  "Watch the plan change on the page. Each agent action also appears as a timestamped receipt in the right margin.",
  "Review and revise. You can preserve good choices while asking the agent to replace only what needs work.",
  "Confirm finalization yourself. Then open the Host Packet section and export the PDF when the plan is ready.",
];

const appSteps = [
  "Start the main website on port 3000.",
  "Build and start the MCP App server on port 8787.",
  "Use MCP Inspector to verify the four tools and the interactive resource.",
  "For ChatGPT, expose the MCP server through a secure HTTPS endpoint or development tunnel.",
  "Enable Developer mode, add the MCP endpoint ending in /mcp, and review the discovered tools.",
  "Start a new conversation, add the connection, and ask it to create a Supper Club plan.",
];

const liveTools = [
  ["Theme", "Research a sourced cultural frame without reproducing copyrighted text."],
  ["Menu", "Curate three connected courses and keep dietary information visible."],
  ["Pairings", "Attach wine and substantial zero-proof choices to each course."],
  ["Soundtrack", "Sequence a musical arc with artwork, previews, and release context when available."],
  ["Shopping", "Reconcile recipe ingredients into one editable, course-linked list."],
  ["Host packet", "Validate the complete plan and export a practical PDF after approval."],
];

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#about-main">Skip to the guide</a>

      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Creative Host workspace
        </Link>
        <div className={styles.wordmark}>Supper Club AI</div>
        <div className={styles.issue}>Field guide · 001</div>
      </header>

      <div id="about-main" className={styles.folio}>
        <section className={styles.hero} aria-labelledby="about-title">
          <div className={styles.heroIndex} aria-hidden="true">
            <span>ABOUT</span>
            <strong>SC / AI</strong>
            <span>HOST WITH INTENTION</span>
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>A field guide for the Creative Host</p>
            <h1 id="about-title">A dinner party is more than a menu.</h1>
            <p className={styles.dek}>
              Supper Club AI turns one cultural idea into an evening you can actually host:
              food, drinks, music, conversation, shopping, timing, and the story connecting them.
            </p>
            <div className={styles.heroActions}>
              <Link href="/" className={styles.primaryAction}>
                Enter the workspace <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a href="#how-to-use" className={styles.textAction}>Read the five-minute guide</a>
            </div>
          </div>
          <blockquote className={styles.pullQuote}>
            <span>THE PROMISE</span>
            <p>“You bring the taste and judgment. The agent coordinates the moving pieces.”</p>
          </blockquote>
        </section>

        <section className={styles.definition}>
          <p className={styles.sectionLabel}>01 / Plain English</p>
          <h2>Think of it as an attentive co-host with a very organized notebook.</h2>
          <div className={styles.definitionGrid}>
            <p>
              A normal chat can give you a list of ideas. Supper Club AI gives those ideas a
              shared home. You and the agent can see the same plan, change the same courses,
              and keep the shopping list synchronized with the menu.
            </p>
            <p>
              The agent does not secretly take over. Sources and warnings remain visible, and
              consequential actions wait for you. You decide what belongs at your table and
              explicitly approve the final plan.
            </p>
          </div>
        </section>

        <section className={styles.twoDoors} aria-labelledby="two-doors-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>02 / One plan, two ways in</p>
            <h2 id="two-doors-title">The website and the ChatGPT App are collaborators, not competitors.</h2>
          </div>
          <article className={styles.doorLight}>
            <div className={styles.doorNumber}>A</div>
            <span className={styles.statusLive}>Available now</span>
            <h3>The WebMCP website</h3>
            <p>
              Open the full visual workspace. The page exposes nine typed WebMCP tools so an
              agent can update the board while you watch, review, and edit.
            </p>
            <ul>
              <li>Best for seeing the complete run of show</li>
              <li>Works with the public demo</li>
              <li>Shows sources, warnings, receipts, and host controls</li>
            </ul>
            <Link href="/" className={styles.inlineLink}>Use the website <ArrowRight size={15} /></Link>
          </article>
          <article className={styles.doorDark}>
            <div className={styles.doorNumber}>B</div>
            <span className={styles.statusPreview}>Developer preview</span>
            <h3>The ChatGPT MCP App</h3>
            <p>
              Open a compact interactive host-brief form inside a conversation. It creates or
              opens the same versioned plan, then hands you back to the full workspace when needed.
            </p>
            <ul>
              <li>Best for starting and revising a plan in chat</li>
              <li>Four shared-plan tools are implemented</li>
              <li>Requires a running MCP endpoint; public deployment is still pending</li>
            </ul>
            <a href="#mcp-app-guide" className={styles.inlineLinkDark}>Preview instructions <ArrowRight size={15} /></a>
          </article>
        </section>

        <section className={styles.sequence} aria-labelledby="sequence-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>03 / The hosting sequence</p>
            <h2 id="sequence-title">From a spark to a table, in six movements.</h2>
          </div>
          <ol className={styles.sequenceList}>
            {planningSteps.map(({ number, title, copy, icon: Icon }) => (
              <li key={number}>
                <div className={styles.stepNumber}>{number}</div>
                <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
                <div><h3>{title}</h3><p>{copy}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section id="how-to-use" className={styles.guide} aria-labelledby="webmcp-guide-title">
          <div className={styles.guideHeading}>
            <p className={styles.sectionLabel}>04 / Use the public site</p>
            <h2 id="webmcp-guide-title">The easiest way to experience Supper Club AI today.</h2>
            <p>
              This is the hackathon path: the agent uses tools supplied by the open webpage,
              and every result remains visible in the editorial workspace.
            </p>
          </div>
          <ol className={styles.instructions}>
            {webmcpSteps.map((step, index) => (
              <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>
            ))}
          </ol>
          <div className={styles.promptCard}>
            <span>TRY THIS PROMPT</span>
            <p>
              Use the tools on this Supper Club AI page to plan a hopeful dinner inspired by
              <em> Parable of the Sower</em> for eight guests. Keep it under $280, include one
              gluten-free guest, provide wine and zero-proof pairings, and show me each major
              decision before finalizing.
            </p>
          </div>
        </section>

        <section className={styles.capabilities} aria-labelledby="capabilities-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>05 / What the collaboration can do</p>
            <h2 id="capabilities-title">Six parts of the evening, held in one plan.</h2>
          </div>
          <div className={styles.capabilityGrid}>
            {liveTools.map(([title, copy], index) => {
              const icons = [BookOpen, ChefHat, Grape, Music2, ShoppingBasket, CheckCircle2];
              const Icon = icons[index];
              return <article key={title}><Icon size={22} aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></article>;
            })}
          </div>
        </section>

        <section id="mcp-app-guide" className={styles.mcpGuide} aria-labelledby="mcp-title">
          <div className={styles.mcpLead}>
            <p className={styles.sectionLabel}>06 / Preview the ChatGPT App</p>
            <h2 id="mcp-title">The widget needs a host. A file tab is not the app.</h2>
            <p>
              The `widget.html` file is delivered by the MCP server and communicates with its
              host through MCP Apps. Opening it directly with a `file://` URL leaves it without
              ChatGPT, tool results, or a plan to display.
            </p>
          </div>

          <div className={styles.terminalGrid}>
            <div className={styles.terminalCard}>
              <div><Terminal size={16} /><span>Terminal 1 · website</span></div>
              <pre><code>{`cd /Users/tarikmoody/Projects/WebMCP
npm install
npm run dev`}</code></pre>
            </div>
            <div className={styles.terminalCard}>
              <div><Terminal size={16} /><span>Terminal 2 · MCP server</span></div>
              <pre><code>{`cd /Users/tarikmoody/Projects/WebMCP/chatgpt-app
npm install
npm run build
npm start`}</code></pre>
            </div>
            <div className={styles.terminalCardWide}>
              <div><Terminal size={16} /><span>Terminal 3 · inspect tools and UI</span></div>
              <pre><code>{`npx @modelcontextprotocol/inspector@latest

Connect to: http://127.0.0.1:8787/mcp`}</code></pre>
            </div>
          </div>

          <ol className={styles.appInstructions}>
            {appSteps.map((step, index) => (
              <li key={step}><strong>{index + 1}</strong><p>{step}</p></li>
            ))}
          </ol>

          <div className={styles.chatgptNote}>
            <ShieldCheck size={28} aria-hidden="true" />
            <div>
              <h3>Connecting it to ChatGPT</h3>
              <p>
                ChatGPT requires a public HTTPS MCP endpoint or a supported secure development
                tunnel. In ChatGPT, enable Developer mode under Settings → Security and login,
                then add the endpoint—including `/mcp`—from the Plugins page. Availability can
                depend on your account or workspace policy.
              </p>
              <a href="https://developers.openai.com/plugins/deploy/connect-chatgpt" target="_blank" rel="noreferrer">
                Official connection and testing guide <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>

        <section className={styles.trust}>
          <div>
            <p className={styles.sectionLabel}>07 / The host remains responsible</p>
            <h2>Useful assistance, visible boundaries.</h2>
          </div>
          <ul>
            <li>Verify ingredient labels, allergens, and kitchen cross-contact.</li>
            <li>Review cultural framing and source attribution before sharing it.</li>
            <li>Confirm finalization, playlist saving, shopping, or other external actions.</li>
            <li>Treat anonymous plan links like access links; do not place private information in them.</li>
          </ul>
        </section>

        <section className={styles.future}>
          <p className={styles.sectionLabel}>08 / Where this can go</p>
          <h2>A new kind of storefront experience.</h2>
          <p>
            Wine shops and independent grocers could embed Supper Club AI so a shopping list
            becomes a guided store experience: match items to local inventory, recommend bottles,
            surface eligible offers, and build a reviewable cart. Those commerce tools are the
            roadmap—not claims about the current prototype—and purchases would still require the
            host’s explicit confirmation.
          </p>
        </section>

        <footer className={styles.footer}>
          <div><span>READY?</span><h2>Bring an idea. Leave with an evening.</h2></div>
          <Link href="/" className={styles.primaryAction}>Open Supper Club AI <ArrowRight size={17} /></Link>
        </footer>
      </div>
    </main>
  );
}
