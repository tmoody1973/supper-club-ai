import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChefHat,
  CircleAlert,
  ExternalLink,
  Grape,
  MessageSquare,
  Music2,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Terminal,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About & How to Use · Supper Club AI",
  description:
    "Meet Supper Club AI, an agent-readable cultural hosting workspace where Creative Hosts and agents build one sourced, coherent plan together.",
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
    copy: "Explicitly finalize the plan, then use the shopping checklist, prep timeline, private host packet, and guest-safe share kit.",
    icon: CheckCircle2,
  },
];

const appSteps = [
  "In ChatGPT, enable Developer mode under Settings → Security and login.",
  "Open ChatGPT Plugins, select the plus button, and add the public Supper Club AI endpoint ending in /mcp.",
  "Review the 16 discovered tools, then enable the Supper Club AI connection in a new conversation.",
  "Ask ChatGPT to create a plan from your book, artist, place, era, question, or feeling.",
  "Use the interactive form to revise guests, budget, dietary needs, date, and tone without editing JSON.",
  "Open the full workspace from the app whenever you want the complete run of show, shopping ledger, or host packet.",
];

const beginnerPaths = [
  {
    label: "Path A · recommended",
    title: "Use Supper Club AI directly in ChatGPT",
    intro: "Choose this when the Supper Club AI connection has already been added to ChatGPT.",
    steps: [
      "Start a new ChatGPT conversation.",
      "Open the tools menu and enable the Supper Club AI connection for that conversation.",
      "Describe the gathering in normal language. You do not need to know any tool names.",
      "ChatGPT calls the planning tools and opens an interactive Supper Club card inside the conversation.",
      "Review the host brief, save it, and use Open full workspace when you want the complete visual plan.",
    ],
  },
  {
    label: "Path B · visual workspace",
    title: "Use the website in the in-app browser",
    intro: "Choose this in a ChatGPT or Codex surface that supports the in-app browser and webpage tools.",
    steps: [
      "Ask ChatGPT to open thesupperclub.app in the in-app browser.",
      "Open the plan you want to revise, or begin with the reviewed example already on the page.",
      "Check the black header for 25 tools live. Preview mode means that browser does not expose WebMCP tools.",
      "Ask ChatGPT to use the tools on the Supper Club AI page and describe one specific change.",
      "Watch the workspace update and read the receipt in Agent Marginalia before making the next change.",
    ],
  },
];

const examplePrompts = [
  {
    label: "Start a new plan",
    prompt: "Use Supper Club AI to create a hopeful dinner inspired by N. K. Jemisin’s The Fifth Season for six guests. Keep the total budget near $180, include one vegan guest, and include wine and zero-proof choices.",
    outcome: "Creates a fresh plan and returns an interactive host brief plus a link to the full workspace.",
  },
  {
    label: "Change one dish",
    prompt: "Keep the rest of this evening exactly as it is. Replace only the main course with a gluten-free option. Show me the candidate before changing the plan.",
    outcome: "Searches first, preserves the other courses, and changes the shared plan only after a specific choice.",
  },
  {
    label: "Price the groceries",
    prompt: "Find Kroger-family stores near ZIP 53202. Let me choose a location, then estimate the shopping-list total and tell me which matches need review.",
    outcome: "Returns nearby locations, then a store-specific estimate with coverage, stock, promotions, and confidence.",
  },
  {
    label: "Build the atmosphere",
    prompt: "Find music that moves from arrival to reflection, and find a wine plus a substantial zero-proof pairing for every food course. Do not save any choice until I review it.",
    outcome: "Uses live or reviewed catalogs and keeps discovery separate from plan-changing selections.",
  },
  {
    label: "Prepare to host",
    prompt: "Rebuild the prep timeline, organize the shopping list by dish, and review every dietary and sourcing warning. Do not finalize or export anything until I explicitly approve it.",
    outcome: "Coordinates practical tasks while leaving consequential approval with the Creative Host.",
  },
];

const beginnerCheckpoints = [
  ["A tool receipt", "ChatGPT should say it used Supper Club AI, and the page records applied changes in Agent Marginalia."],
  ["One shared plan", "The interactive card and full website should show the same title, plan ID, and latest version."],
  ["Visible uncertainty", "Sources, unpriced ingredients, low-confidence matches, and dietary warnings should remain visible."],
  ["Your approval", "Finalization, host-packet export, and guest-share export should wait for an explicit yes from you."],
];

const liveTools = [
  ["Theme", "Research a sourced cultural frame without reproducing copyrighted text."],
  ["Menu", "Resolve each course independently through Spoonacular, Perplexity, then a reviewed fallback—without discarding successful courses."],
  ["Pairings", "Attach wine and substantial zero-proof choices to each course."],
  ["Soundtrack", "Discover sourced candidates with Perplexity, verify them with Apple Music, and show each track’s origin and evidence."],
  ["Shopping", "Reconcile ingredients, find nearby Kroger-family stores, and estimate a course-linked basket with visible price confidence."],
  ["Host + guest artifacts", "Export the private host packet or preview and download a redacted guest program with social cards after approval."],
];

const websiteTools = [
  "get_party_plan",
  "configure_party",
  "research_theme",
  "curate_menu",
  "curate_pairings",
  "curate_soundtrack",
  "enrich_soundtrack_context",
  "find_grocery_stores",
  "price_shopping_list",
  "search_recipes",
  "set_menu_course",
  "replace_menu_course",
  "suggest_ingredient_substitutions",
  "create_prep_timeline",
  "search_wines",
  "set_wine_pairing",
  "create_zero_proof_pairings",
  "search_music",
  "refresh_music_metadata",
  "create_shopping_list",
  "finalize_party_plan",
  "preview_guest_share_kit",
  "export_guest_share_kit",
  "export_host_packet",
  "create_party_plan",
];

const chatgptTools = [
  "create_party_plan",
  "get_party_plan",
  "configure_party",
  "find_grocery_stores",
  "price_shopping_list",
  "search_recipes",
  "set_menu_course",
  "replace_menu_course",
  "suggest_ingredient_substitutions",
  "create_prep_timeline",
  "search_wines",
  "set_wine_pairing",
  "create_zero_proof_pairings",
  "search_music",
  "refresh_music_metadata",
  "finalize_party_plan",
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
        <div className={styles.headerActions}>
          <ThemeToggle />
          <span className={styles.issue}>Field guide · 001</span>
        </div>
      </header>

      <div id="about-main" className={styles.folio}>
        <section className={styles.hero} aria-labelledby="about-title">
          <div className={styles.heroIndex} aria-hidden="true">
            <span>ABOUT</span>
            <strong>SC / AI</strong>
            <span>HOST WITH INTENTION</span>
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>An agent-readable cultural hosting workspace</p>
            <h1 id="about-title">A dinner party is more than a menu.</h1>
            <p className={styles.dek}>
              Supper Club AI gives a Creative Host and an agent one shared place to turn a
              cultural idea into an evening you can actually host—food, drinks, music,
              conversation, shopping, timing, and the story connecting them.
            </p>
            <div className={styles.heroActions}>
              <Link href="/" className={styles.primaryAction}>
                Enter the workspace <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/?tour=1" className={styles.textAction}>Take the 90-second table tour</Link>
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
          <h2>Not an AI dinner planner. A shared workspace for cultural hosting.</h2>
          <figure className={styles.definitionArtwork}>
            <Image
              src="/assets/attentive-cohost-notebook.png"
              alt="An illustrated host notebook arranging menu, wine, music, and cultural cues into one shared dinner plan"
              width={1024}
              height={1536}
              sizes="(max-width: 720px) calc(100vw - 56px), (max-width: 1050px) 34vw, 28vw"
            />
            <figcaption>Host judgment + agent coordination</figcaption>
          </figure>
          <div className={styles.definitionGrid}>
            <p>
              A normal chat can suggest ideas. Supper Club AI gives those ideas a shared,
              agent-readable home. You and the agent can see the same versioned plan, change
              one course, and keep linked shopping and preparation work coherent.
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
              Open the full visual workspace. The page exposes 25 typed WebMCP tools so an
              agent can create a fresh plan or update the board while you watch, review, and edit.
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
            <span className={styles.statusLive}>Available now</span>
            <h3>The ChatGPT MCP App</h3>
            <p>
              Open a compact interactive host-brief form inside a conversation. It creates or
              opens the same versioned plan, then hands you back to the full workspace when needed.
            </p>
            <ul>
              <li>Best for starting and revising a plan in chat</li>
              <li>16 focused tools share the same versioned plan</li>
              <li>Public Cloudflare MCP endpoint is live</li>
            </ul>
            <a href="#mcp-app-guide" className={styles.inlineLinkDark}>Connection instructions <ArrowRight size={15} /></a>
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
            <p className={styles.sectionLabel}>04 / Beginner’s walkthrough</p>
            <h2 id="webmcp-guide-title">Start with a sentence, not a technical manual.</h2>
            <p>
              You can work entirely in conversation or keep the full editorial workspace open
              beside it. Both paths lead to the same shared plan.
            </p>
          </div>
          <div className={styles.beginnerPaths}>
            {beginnerPaths.map((path) => (
              <article className={styles.beginnerPath} key={path.label}>
                <span>{path.label}</span>
                <h3>{path.title}</h3>
                <p>{path.intro}</p>
                <ol>
                  {path.steps.map((step, index) => <li key={step}><strong>{index + 1}</strong><p>{step}</p></li>)}
                </ol>
              </article>
            ))}
          </div>
          <div className={styles.promptLibrary}>
            <div className={styles.promptLibraryHeading}>
              <span>Copy, paste, then make it yours</span>
              <h3>Five prompts for your first supper club.</h3>
              <p>Plain language is enough. ChatGPT chooses the appropriate Supper Club AI tools.</p>
            </div>
            <div className={styles.promptExamples}>
              {examplePrompts.map((example, index) => (
                <article key={example.label}>
                  <header><span>{String(index + 1).padStart(2, "0")}</span><strong>{example.label}</strong></header>
                  <blockquote>{example.prompt}</blockquote>
                  <p><strong>What happens:</strong> {example.outcome}</p>
                </article>
              ))}
            </div>
          </div>
          <div className={styles.beginnerCheckpoints}>
            <div><span className={styles.sectionLabel}>What success looks like</span><h3>Four things to check as you go.</h3></div>
            <dl>
              {beginnerCheckpoints.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}
            </dl>
          </div>
          <div className={styles.beginnerTrouble}>
            <CircleAlert size={23} aria-hidden="true" />
            <div><h3>If nothing happens</h3><p>Confirm the Supper Club AI connection is enabled for this conversation. On the website, “Preview mode” means the current browser cannot use page tools; use the connected ChatGPT App instead. If a plan looks old, ask ChatGPT to open its latest version.</p></div>
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

        <section className={styles.toolLedger} aria-labelledby="tool-ledger-title">
          <div className={styles.toolLedgerHeading}>
            <div>
              <p className={styles.sectionLabel}>06 / Active tool ledger</p>
              <h2 id="tool-ledger-title">Every capability, named in plain sight.</h2>
            </div>
            <p>
              The website has 25 tools for creating, composing, and exporting a plan. The
              ChatGPT App keeps 16 focused tools for creating, revising, pricing, and approving
              the same versioned plan.
            </p>
          </div>
          <div className={styles.toolColumns}>
            <article className={styles.toolColumn}>
              <header><span>Website / WebMCP</span><strong>25 tools</strong></header>
              <ol className={styles.toolList}>
                {websiteTools.map((name, index) => <li key={name}><span>{String(index + 1).padStart(2, "0")}</span><code>{name}</code></li>)}
              </ol>
            </article>
            <article className={`${styles.toolColumn} ${styles.toolColumnDark}`}>
              <header><span>ChatGPT / MCP App</span><strong>16 tools</strong></header>
              <ol className={styles.toolList}>
                {chatgptTools.map((name, index) => <li key={name}><span>{String(index + 1).padStart(2, "0")}</span><code>{name}</code></li>)}
              </ol>
            </article>
          </div>
          <p className={styles.toolLedgerNote}>
            Website tool 25, <code>create_party_plan</code>, starts a fresh plan, activates its new
            plan ID, and reports which source supplied each section. Starter, main, and dessert each
            follow Spoonacular → Perplexity → reviewed fallback independently, so a missing course
            does not erase successful live choices. For music, Perplexity proposes 6–8 candidates
            tied to real search-result IDs; Apple Music verifies artist and title, four tracks are
            selected for the dinner arc, and reviewed anchors fill only open slots. Optional Discogs
            context and per-track origin and verification receipts remain visible. Search, lookup,
            and guest-share preview tools are read-only. Plan changes use version checks;
            finalization and artifact downloads wait for explicit host approval.
          </p>
        </section>

        <section id="mcp-app-guide" className={styles.mcpGuide} aria-labelledby="mcp-title">
          <div className={styles.mcpLead}>
            <p className={styles.sectionLabel}>07 / Connect the ChatGPT App</p>
            <h2 id="mcp-title">The interactive app is live inside ChatGPT.</h2>
            <p>
              The Cloudflare endpoint delivers the interactive widget and 16 tools through MCP
              Apps. Add the endpoint in ChatGPT Developer mode; opening `widget.html` directly
              with a `file://` URL still leaves it without a host or tool results.
            </p>
          </div>

          <div className={styles.terminalGrid}>
            <div className={styles.terminalCard}>
              <div><Terminal size={16} /><span>Public MCP endpoint</span></div>
              <pre><code>{`https://supper-club-ai-mcp.tarikjmoody.workers.dev/mcp`}</code></pre>
            </div>
            <div className={styles.terminalCard}>
              <div><Terminal size={16} /><span>Full visual workspace</span></div>
              <pre><code>{`https://www.thesupperclub.app`}</code></pre>
            </div>
            <div className={styles.terminalCardWide}>
              <div><Terminal size={16} /><span>Optional · inspect the public server</span></div>
              <pre><code>{`npx @modelcontextprotocol/inspector@latest

Connect to: https://supper-club-ai-mcp.tarikjmoody.workers.dev/mcp`}</code></pre>
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
            <p className={styles.sectionLabel}>08 / The host remains responsible</p>
            <h2>Useful assistance, visible boundaries.</h2>
          </div>
          <ul>
            <li>Verify ingredient labels, allergens, and kitchen cross-contact.</li>
            <li>Review cultural framing and source attribution before sharing it.</li>
            <li>Confirm finalization, playlist saving, shopping, or other external actions.</li>
            <li>Treat anonymous plan links like access links; do not place private information in them.</li>
          </ul>
        </section>

        <section className={styles.impact} aria-labelledby="impact-title">
          <div className={styles.impactLead}>
            <p className={styles.sectionLabel}>09 / Why this matters</p>
            <h2 id="impact-title">Make ambitious gatherings possible without turning the host into a project manager.</h2>
            <p>
              Supper Club AI turns cultural inspiration into a coordinated, hostable experience
              by giving people and agents one shared, agent-readable workspace—reducing the
              fragmented research and manual reconciliation that make ambitious gatherings
              difficult to produce.
            </p>
          </div>

          <div className={styles.impactGrid}>
            <article>
              <span>For Creative Hosts</span>
              <h3>From inspiration to a hostable evening.</h3>
              <p>Preserve your taste and judgment while the workspace coordinates the moving pieces around them.</p>
            </article>
            <article>
              <span>For Guests</span>
              <h3>Hospitality decisions stay visible.</h3>
              <p>Dietary needs, zero-proof choices, provenance, warnings, and uncertainty remain available for review.</p>
            </article>
            <article>
              <span>For Local Retailers</span>
              <h3>Discovery can become a useful store visit.</h3>
              <p>Bookstores, wine shops, and grocers can connect a cultural plan to relevant inventory, pricing, and reviewable offers.</p>
            </article>
          </div>

          <div className={styles.impactChain} aria-label="What agent-readable changes">
            <strong>What agent-readable changes</strong>
            <span>Host asks for one precise change</span>
            <span>WebMCP updates the typed plan</span>
            <span>Linked work stays coordinated</span>
            <span>The receipt remains visible</span>
          </div>
        </section>

        <section className={styles.future}>
          <p className={styles.sectionLabel}>10 / Where this can go</p>
          <h2>A new kind of storefront experience.</h2>
          <p>
            Wine shops and independent grocers could embed Supper Club AI so a shopping list
            becomes a guided store experience. Location search, retailer package matching, stock,
            promotions, confidence, and basket estimates are live today through Kroger. Store-specific
            discounts, coupons, bottle inventory, and a reviewable cart remain roadmap tools; any
            purchase would still require the host’s explicit confirmation.
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
