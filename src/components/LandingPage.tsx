import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { FAQ } from '../content/faq';
import { countPageView } from '../marketing/send';
import { pickQuote } from '../content/quotes';
import { syncActions, type SyncActions } from '../sync/controller';
import { useHydrated } from '../state/hydrated';
import { usePasskeysSupported } from '../state/passkeys';
import { useSync } from '../sync/store';
import { feedbackMailto } from '../model/feedback';
import { GoogleIcon, MicrosoftIcon } from './icons';
import styles from './LandingPage.module.css';
import menu from './menu.module.css';

// The live demo brings React Flow and the database with it; the page shows first, then it wakes up.
const LiveDemo = lazy(() => import('./LiveDemo'));

/** Product shots live in public/landing (npm run shots). */
const shot = (name: string) => `${import.meta.env.BASE_URL}landing/${name}.webp`;

/**
 * The front door. One idea, told the way the best product pages tell it: a line, the real thing
 * to play with, how it works, each part of the product with a picture, what we believe, one way in.
 */
export function LandingPage({ actions = syncActions }: { actions?: SyncActions }) {
  // One row per visit: the path and the campaign tag that brought it, nothing about the visitor.
  useEffect(() => {
    void countPageView(window.location.pathname);
  }, []);
  const authError = useSync((s) => s.authError);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passkeys = usePasskeysSupported(); // false until hydrated: the pre-render has no browser
  const hydrated = useHydrated(); // the live demo is browser-only; the pre-render shows the still

  // The browser leaves for the provider and comes back signed in; "busy" lasts until it leaves.
  async function signInWith(provider: Provider) {
    setBusy(provider);
    setError(null);
    try {
      if (provider === 'google') await actions.signInWithGoogle();
      else await actions.signInWithMicrosoft();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  // For accounts that added a passkey in Account & sync: the browser's own prompt, no round trip.
  async function signInWithPasskey() {
    setPasskeyBusy(true);
    setError(null);
    try {
      await actions.signInWithPasskey(); // on success the session lands and the app takes over
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPasskeyBusy(false);
    }
  }

  const problem = error ?? authError;

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <a className={styles.brand} href="#top">
            <span className={styles.mark} aria-hidden="true" />
            Somehow I Manage
          </a>
          <nav className={styles.navLinks} aria-label="Sections">
            <a href="#map">People Map</a>
            <a href="#person">1:1s</a>
            <a href="#how">How it works</a>
            <a href={feedbackMailto()}>Feedback</a>
          </nav>
          <div className={styles.navActions}>
            <SignInMenu
              busy={busy !== null || passkeyBusy}
              passkeys={passkeys}
              onPick={(p) => void signInWith(p)}
              onPasskey={() => void signInWithPasskey()}
            />
          </div>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.inner}>
            <img
              className={styles.heroIcon}
              src={`${import.meta.env.BASE_URL}icons/icon-512.png`}
              width={160}
              height={160}
              alt=""
              aria-hidden="true"
            />
            <h1 className={styles.title}>Work with people, not&nbsp;tasks.</h1>
            <p className={styles.lead}>
              Every task, note and 1:1 lives with the person it’s about. The map below is the real
              thing — go ahead and poke it.
            </p>
            <div id="signin" className={styles.cta}>
              <ProviderButtons busy={busy} verb="Continue" onPick={(p) => void signInWith(p)} />
            </div>
            {passkeys && (
              <button
                type="button"
                className={styles.passkey}
                disabled={passkeyBusy}
                onClick={() => void signInWithPasskey()}
              >
                <KeyGlyph />
                {passkeyBusy ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
              </button>
            )}
            {problem && (
              <p className={styles.error} role="alert">
                {problem}
              </p>
            )}
          </div>
          <div className={`${styles.inner} ${styles.demo}`} aria-label="Live demo">
            {hydrated ? (
              <DemoBoundary fallback={<StillDemo />}>
                <Suspense fallback={<StillDemo />}>
                  <LiveDemo />
                </Suspense>
              </DemoBoundary>
            ) : (
              <StillDemo />
            )}
          </div>
          <ul className={`${styles.inner} ${styles.proof}`} aria-label="In short">
            <Proof title="Offline-first" text="Works on a plane. Syncs when you’re back." />
            <Proof title="Private by design" text="Only your email. Your data stays yours." />
            <Proof title="No setup" text="Add a person, type a line. That’s onboarding." />
          </ul>
        </section>

        <section id="how" className={`${styles.band} ${styles.light}`}>
          <div className={styles.inner}>
            <h2 className={styles.h2}>Three habits, one place.</h2>
            <ul className={styles.steps}>
              <Step
                title="Add your people"
                text="Direct reports, peers, clients. Press + or paste a whole list."
              />
              <Step
                title="Capture as it happens"
                text="Type a line on their card, hit ⌘K from anywhere, or drag a card to hand it over."
              />
              <Step
                title="Walk into the 1:1 prepared"
                text="The agenda builds itself from what’s open. Tick what got done, note what came up."
              />
            </ul>
          </div>
        </section>

        <MapSection />
        <PersonSection />
        <AgentSection />

        <section id="author" className={`${styles.band} ${styles.light}`}>
          <div className={`${styles.inner} ${styles.author}`}>
            <img
              className={styles.authorPhoto}
              src={`${import.meta.env.BASE_URL}landing/author.jpg`}
              width={800}
              height={800}
              alt="Sergii Kryvoblotskyi, who made Somehow I Manage"
              loading="lazy"
              decoding="async"
            />
            <div>
              <h2 className={styles.h2}>From the author</h2>
              <div className={styles.story}>
                <p>
                  I’ve managed teams for a long time. For most of it, everything I knew about my
                  people lived in notes: one note per person, their name as the title, a wall of
                  unstructured text underneath.
                </p>
                <p>
                  It worked, somehow — because the idea behind it was right. You work with people.
                  That’s what matters. The tasks come with them.
                </p>
                <p className={styles.storyEnd}>
                  Somehow I Manage is that habit, turned into a tool.
                </p>
              </div>
              <p className={styles.signature}>
                <strong>Sergii Kryvoblotskyi</strong>
                <span>Manages a team. Built this to do it better.</span>
              </p>
            </div>
          </div>
        </section>

        <section className={styles.band}>
          <div className={styles.inner}>
            <h2 className={`${styles.h2} ${styles.statement}`}>
              Managers don’t have tasks.
              <br />
              They have people.
            </h2>
            <div className={styles.principles}>
              <Principle
                title="Tasks belong to people"
                text="A to-do without a face is a to-do you’ll ignore. Here every item hangs off someone."
              />
              <Principle
                title="Prepared beats busy"
                text="Ten minutes before a 1:1 should be enough. The app does the remembering."
              />
              <Principle
                title="Your data is yours"
                text="Offline-first, synced through your own account, exported in one click, deleted in one more."
              />
            </div>
          </div>
        </section>

        <section id="faq" className={`${styles.band} ${styles.light}`}>
          <div className={styles.inner}>
            <h2 className={styles.h2}>Questions, answered.</h2>
            <dl className={styles.faq}>
              {FAQ.map((item) => (
                <div key={item.q} className={styles.faqItem}>
                  <dt>
                    <h3>{item.q}</h3>
                  </dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={styles.band}>
          <div className={`${styles.inner} ${styles.final}`}>
            <h2 className={styles.h2}>Start with your team.</h2>
            <p className={styles.lead}>It takes a minute.</p>
            <div className={styles.cta}>
              <ProviderButtons busy={busy} verb="Get started" onPick={(p) => void signInWith(p)} />
            </div>
            <p className={styles.ctaNote}>
              Only your email address. Export or delete everything, any time.
            </p>
            <p className={styles.ctaNote}>
              Something missing? <a href={feedbackMailto()}>Send feedback</a> — it goes straight to
              the person who built this.
            </p>
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        // What search and answer engines read about the app, the author and the FAQ above.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
      />

      <footer className={styles.footer}>
        <div className={`${styles.inner} ${styles.footerGrid}`}>
          <div className={styles.footerBrand}>
            <span className={styles.mark} aria-hidden="true" />
            Somehow I Manage
            <p>Built by a manager, for managers.</p>
          </div>
          <div className={styles.footerCol}>
            <h3>Product</h3>
            <a href="#map">People Map</a>
            <a href="#person">1:1 mode</a>
            <a href="#how">How it works</a>
            <a href="#mcp">AI assistants</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className={styles.footerCol}>
            <h3>Company</h3>
            <a href={feedbackMailto()}>Feedback</a>
            <a href={`${import.meta.env.BASE_URL}privacy/`}>Privacy</a>
            <a href="mailto:hello@somehowimanage.app">hello@somehowimanage.app</a>
          </div>
          <div className={styles.footerCol}>
            <h3>Account</h3>
            <a href="#signin">Sign in →</a>
          </div>
        </div>
        <div className={`${styles.inner} ${styles.footerLine}`}>© 2026 Somehow I Manage</div>
      </footer>
    </div>
  );
}

type Provider = 'google' | 'microsoft';

const SITE = 'https://somehowimanage.app';
const DESCRIPTION =
  'A task manager for managers: every task, note and 1:1 lives with the person it’s about.';

/** Schema.org JSON-LD: the site, the app, the author, and the FAQ, all from one place. */
function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: 'Somehow I Manage',
        description: DESCRIPTION,
        publisher: { '@id': `${SITE}/#author` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE}/#app`,
        name: 'Somehow I Manage',
        url: `${SITE}/`,
        description: DESCRIPTION,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser; installable on macOS, iOS, iPadOS and Windows',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'People Map: the team as hubs with their tasks and notes around them',
          '1:1 mode with an agenda built from open items',
          'Projects: tag tasks and notes across people and spotlight one on the map',
          "@people and #tasks in notes, linked and listed on each person's page",
          'MCP server: Claude, ChatGPT, Cursor and other AI assistants work with your people as you',
          'Quick capture from anywhere',
          'Offline-first, synced through your own account',
          'Export to Markdown, JSON backup and restore',
        ],
        image: `${SITE}/og.jpg`,
        screenshot: `${SITE}/landing/map.webp`,
        author: { '@id': `${SITE}/#author` },
      },
      {
        '@type': 'Person',
        '@id': `${SITE}/#author`,
        name: 'Sergii Kryvoblotskyi',
        description: 'Manages a team. Built Somehow I Manage to do it better.',
        url: 'https://github.com/Krivoblotsky',
        sameAs: ['https://github.com/Krivoblotsky'],
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE}/#faq`,
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };
}

/** The nav's one button: a menu of the ways in, so no provider is chosen for the visitor. */
function SignInMenu({
  busy,
  passkeys,
  onPick,
  onPasskey,
}: {
  busy: boolean;
  passkeys: boolean;
  onPick: (provider: Provider) => void;
  onPasskey: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={styles.navPill} disabled={busy}>
          {busy ? 'Opening…' : 'Sign in'}
          <span className={styles.navChevron} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={menu.menu} align="end" sideOffset={8}>
          <DropdownMenu.Item className={menu.item} onSelect={() => onPick('google')}>
            <GoogleIcon size={16} />
            Continue with Google
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menu.item} onSelect={() => onPick('microsoft')}>
            <MicrosoftIcon size={16} />
            Continue with Microsoft
          </DropdownMenu.Item>
          {passkeys && (
            <>
              <DropdownMenu.Separator className={menu.separator} />
              <DropdownMenu.Item className={menu.item} onSelect={onPasskey}>
                <KeyGlyph />
                Sign in with a passkey
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The two doors, side by side: Google and Microsoft, each a white pill with its mark. */
function ProviderButtons({
  busy,
  verb,
  onPick,
}: {
  busy: Provider | null;
  verb: string;
  onPick: (provider: Provider) => void;
}) {
  return (
    <>
      <button
        type="button"
        className={styles.provider}
        disabled={busy !== null}
        onClick={() => onPick('google')}
      >
        <GoogleIcon />
        {busy === 'google' ? 'Opening Google…' : `${verb} with Google`}
      </button>
      <button
        type="button"
        className={styles.provider}
        disabled={busy !== null}
        onClick={() => onPick('microsoft')}
      >
        <MicrosoftIcon />
        {busy === 'microsoft' ? 'Opening Microsoft…' : `${verb} with Microsoft`}
      </button>
    </>
  );
}

function KeyGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.5 8h6M12 8v2.5M14.5 8v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Proof({ title, text }: { title: string; text: string }) {
  return (
    <li className={styles.proofItem}>
      <span className={styles.proofDot} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </li>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <li className={styles.step}>
      <h3>{title}</h3>
      <p>{text}</p>
    </li>
  );
}

/**
 * The MCP section: what an assistant can do here, shown as the one exchange every manager has
 * before a meeting. Real text, not a picture, so it is read by people and crawlers alike.
 */
function AgentSection() {
  return (
    <section id="mcp" className={styles.band}>
      <div className={`${styles.inner} ${styles.agent}`}>
        <div>
          <h2 className={styles.h2}>Agentic AI friendly.</h2>
          <p className={styles.lead}>
            Somehow I Manage speaks MCP, the open standard assistants use to work with your tools.
            Connect it to Claude, ChatGPT, Cursor or any agent, and it works with your people the
            way you do.
          </p>
          <ul className={styles.agentPoints}>
            <li>
              <h3>One address</h3>
              <p>Paste it into the assistant. It asks you to sign in and approve it, once.</p>
            </li>
            <li>
              <h3>Works as you</h3>
              <p>
                It sees what you see and nothing more, under the same rules as the app. Disconnect
                it any time.
              </p>
            </li>
            <li>
              <h3>Your assistant, not ours</h3>
              <p>Claude, ChatGPT, Cursor, VS Code, Claude Code: anything that speaks MCP.</p>
            </li>
          </ul>
          <a className={styles.agentLink} href={`${import.meta.env.BASE_URL}mcp/`}>
            Connect an assistant →
          </a>
        </div>
        <figure className={styles.chat} aria-label="An assistant preparing a 1:1">
          <div className={styles.bubbleUser}>Prepare my 1:1 with Emily</div>
          <div className={styles.bubbleAssistant}>
            <div className={styles.agendaHead}>
              <strong>1:1 with Emily Carter</strong>
              <span>last 1:1 12 days ago</span>
            </div>
            <div className={styles.agendaSection}>To discuss</div>
            <ul className={styles.agendaList}>
              <li>
                <span className={styles.agendaFlag} aria-hidden="true" />
                Promotion <em>urgent · due Fri</em>
              </li>
              <li>
                Business trip <em>2 days overdue · MIPP</em>
              </li>
            </ul>
            <div className={styles.agendaSection}>Notes to bring up</div>
            <ul className={styles.agendaList}>
              <li>
                Retro takeaways <em>wants more ownership of the roadmap</em>
              </li>
            </ul>
            <div className={styles.agendaSection}>Since last time</div>
            <ul className={styles.agendaList}>
              <li>
                Done: Launch MIPP <em>new: Expense report</em>
              </li>
            </ul>
          </div>
          <figcaption className={styles.chatCaption}>
            prepare_one_on_one, one of fourteen tools
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Principle({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.principle}>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

const MAP_POINTS = [
  {
    title: 'People, not projects',
    text: 'Every task and note hangs off the person it’s about. The map is the plan.',
    shot: 'map',
    alt: 'The People Map: people as hubs, their tasks and notes as cards around them',
  },
  {
    title: 'Hand things over by dragging',
    text: 'Drop a card onto someone else and it’s theirs, history included.',
    shot: 'map-drag',
    alt: 'A card being dragged from one person towards another, whose avatar lights up',
  },
  {
    title: 'Spotlight one person',
    text: 'Open a card and the rest of the team steps back, so you can think about one person.',
    shot: 'map-focus',
    alt: 'One person’s cluster in focus with a card open; everyone else dimmed',
  },
  {
    title: 'Projects across people',
    text: 'Tag anything with a project. One click lights up everything in it, whoever it’s with.',
    shot: 'map-projects',
    alt: 'The map with one project in the spotlight: its cards lit across two people, the rest dimmed, and a Projects panel counting them',
  },
  {
    title: 'Nobody falls off the edge',
    text: 'People outside the view stay pinned to the edge. One click flies to them.',
    shot: 'map-edges',
    alt: 'A zoomed-in map with small avatars pinned to the edges for people out of view',
  },
] as const;

/** A row of captions that act as tabs: the chosen one is lit, and the picture below follows it. */
function PointTabs({
  items,
  active,
  onChange,
  prefix,
  label,
  accent,
}: {
  items: readonly { title: string; text: string }[];
  active: number;
  onChange: (index: number) => void;
  prefix: string;
  label: string;
  /** The section's colour: the lit caption's edge, matching its picture frame. */
  accent: string;
}) {
  // arrow keys move between captions, as tabs do; only the lit one is in the tab order
  const move = (to: number) => {
    const next = (to + items.length) % items.length;
    onChange(next);
    document.getElementById(`${prefix}-tab-${next}`)?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step !== undefined) move(active + step);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(items.length - 1);
    else return;
    e.preventDefault();
  };
  return (
    <div
      className={styles.points}
      role="tablist"
      aria-label={label}
      style={{ '--accent': accent } as CSSProperties}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          role="tab"
          id={`${prefix}-tab-${i}`}
          aria-selected={i === active}
          aria-controls={`${prefix}-panel`}
          tabIndex={i === active ? 0 : -1}
          className={styles.point}
          onClick={() => onChange(i)}
        >
          <span className={styles.pointTitle}>{item.title}</span>
          <span className={styles.pointText}>{item.text}</span>
        </button>
      ))}
    </div>
  );
}

/** The map, one point at a time, over a full-width picture of that point. */
function MapSection() {
  const [active, setActive] = useState(0);
  const point = MAP_POINTS[active] ?? MAP_POINTS[0];
  return (
    <section id="map" className={styles.band}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>Your whole team, at a glance.</h2>
        <PointTabs
          items={MAP_POINTS}
          active={active}
          onChange={setActive}
          prefix="map"
          label="What the map does"
          accent="var(--person-0)"
        />
        <div
          id="map-panel"
          role="tabpanel"
          aria-labelledby={`map-tab-${active}`}
          className={styles.frame}
          data-tint="map"
        >
          <img
            src={shot(point.shot)}
            width={1440}
            height={900}
            alt={point.alt}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}

const PERSON_TABS = [
  {
    id: 'one-on-one',
    title: '1:1 mode',
    text: 'The agenda is what’s open, what got done since last time sits next to it, and the notes land on the person.',
    shot: 'one-on-one',
    alt: 'A 1:1 in progress: the agenda on the left, what got done since last time on the right',
  },
  {
    id: 'person',
    title: 'Person page',
    text: 'Tasks, notes and completed work for one person, in the order that matters, with a line to type the next thing.',
    shot: 'person',
    alt: 'One person’s page: open tasks, notes and completed work',
  },
  {
    id: 'capture',
    title: 'Quick capture',
    text: '⌘K from anywhere: jump to a person, find a task, or type “Vira: prepare the review”.',
    shot: 'capture',
    alt: 'The command palette over the map, listing people and commands',
  },
] as const;

/** Everything about one person: the three views as captions over a framed product shot. */
function PersonSection() {
  const [active, setActive] = useState(0);
  const tab = PERSON_TABS[active] ?? PERSON_TABS[0];
  return (
    <section id="person" className={styles.band}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>Everything about someone, when you need it.</h2>
        <PointTabs
          items={PERSON_TABS}
          active={active}
          onChange={setActive}
          prefix="person"
          label="Views"
          accent="var(--person-2)"
        />
        <div
          id="person-panel"
          role="tabpanel"
          aria-labelledby={`person-tab-${active}`}
          className={styles.frame}
          data-tint="person"
        >
          <img
            src={shot(tab.shot)}
            width={1440}
            height={900}
            alt={tab.alt}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}

/** The still of the map: what shows while the live demo loads, or if it cannot. */
function StillDemo() {
  return (
    <div className={styles.demoFallback}>
      <MapIllustration />
    </div>
  );
}

/** If the demo chunk fails to load (offline, a deploy in flight), the page must stay up. */
class DemoBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const CARD_W = 150;
const CARD_H = 44;

/** A still of the People Map, in the real colours: three people and what is going on with them. */
function MapIllustration() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 600 420"
      role="img"
      aria-label="The People Map: three people as hubs with their tasks and notes as cards around them"
    >
      {/* edges first, so cards sit on top */}
      <g fill="none" strokeWidth="2.4" strokeLinecap="round">
        <path d="M160 172 C 145 150, 125 130, 105 114" stroke="var(--person-0)" />
        <path d="M198 186 C 215 165, 232 140, 250 112" stroke="var(--person-0)" />
        <path d="M160 228 C 145 250, 120 275, 95 300" stroke="var(--person-0)" />
        <path d="M196 214 C 215 235, 235 262, 260 290" stroke="var(--person-0)" />
        <path d="M450 88 C 435 78, 415 66, 395 54" stroke="var(--person-1)" />
        <path d="M480 140 C 486 152, 492 166, 500 180" stroke="var(--person-1)" />
        <path d="M443 340 C 440 355, 436 370, 430 382" stroke="var(--person-2)" />
      </g>

      <Hub x={170} y={200} color="var(--person-0)" letter="V" name="Vira" />
      <Hub x={470} y={110} color="var(--person-1)" letter="N" name="Nata" dark />
      <Hub x={470} y={330} color="var(--person-2)" letter="A" name="Anton" />

      <Card x={30} y={70} title="Salary review" delay={0} />
      <Card x={250} y={90} title="Promotion" urgent delay={1.2} />
      <Card x={20} y={300} title="Retro takeaways" note delay={2.1} />
      <Card x={230} y={290} title="Book the offsite" done delay={0.6} />
      <Card x={320} y={10} title="Focus areas" delay={1.7} />
      <Card x={440} y={180} title="Patents" delay={0.3} />
      <Card x={280} y={362} title="Plan the retro" delay={1.0} />
    </svg>
  );
}

function Hub({
  x,
  y,
  color,
  letter,
  name,
  dark = false,
}: {
  x: number;
  y: number;
  color: string;
  letter: string;
  name: string;
  dark?: boolean;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={38} fill={color} opacity="0.18" />
      <circle cx={x} cy={y} r={29} fill={color} />
      <text
        x={x}
        y={y + 6}
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill={dark ? '#111' : '#fff'}
      >
        {letter}
      </text>
      <text x={x} y={y + 54} textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">
        {name}
      </text>
    </g>
  );
}

function Card({
  x,
  y,
  title,
  urgent = false,
  note = false,
  done = false,
  delay,
}: {
  x: number;
  y: number;
  title: string;
  urgent?: boolean;
  note?: boolean;
  done?: boolean;
  delay: number;
}) {
  return (
    <g className={styles.float} style={{ animationDelay: `${delay}s` }}>
      <rect
        x={x}
        y={y}
        width={CARD_W}
        height={CARD_H}
        rx="10"
        fill={done ? 'var(--completed-card)' : '#fff'}
      />
      {urgent && (
        <path
          d={`M${x + 12} ${y + 15}v12M${x + 12} ${y + 15}h8l-2 3 2 3h-8`}
          fill="none"
          stroke="#e0a100"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
      <text
        x={x + (urgent ? 26 : 12)}
        y={y + 27}
        fontSize="11.5"
        fontWeight="700"
        fill={done ? 'var(--completed-text)' : '#111'}
      >
        {title}
      </text>
      {note ? (
        <path
          d={`M${x + CARD_W - 24} ${y + 14}h9l4 4v12h-13z`}
          fill="none"
          stroke="#8e8e93"
          strokeWidth="1.4"
        />
      ) : done ? (
        <g>
          <circle cx={x + CARD_W - 18} cy={y + 22} r="7" fill="var(--success)" />
          <path
            d={`M${x + CARD_W - 21.5} ${y + 22.3}l2.3 2.3 4.6-4.9`}
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : (
        <circle
          cx={x + CARD_W - 18}
          cy={y + 22}
          r="6.5"
          fill="none"
          stroke="#111"
          strokeWidth="1.5"
        />
      )}
    </g>
  );
}

/** Shown while the saved session is being checked, before we know whether to ask for sign-in. */
export function Splash() {
  // chosen once per mount: the quote stays put while the session and the workspace load
  const [quote] = useState(pickQuote);
  return (
    <div className={styles.splash} aria-busy="true">
      <div className={styles.splashBrand}>Somehow I Manage</div>
      <figure className={styles.splashQuote}>
        <blockquote>{quote.text}</blockquote>
        <figcaption>{quote.by}</figcaption>
      </figure>
    </div>
  );
}

/** A build without a backend cannot sign anyone in. Developers see this; users never should. */
export function SetupScreen() {
  return (
    <div className={styles.centre}>
      <div className={styles.card}>
        <div className={styles.cardBrand}>Somehow I Manage</div>
        <h1 className={styles.cardTitle}>This build has no backend</h1>
        <p className={styles.cardText}>
          Signing in needs a Supabase project. Put its URL and anon key in{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> — a{' '}
          <code>.env.local</code> file for development, repository variables for the deploy — then
          rebuild. The steps are in <code>docs/SYNC.md</code>.
        </p>
      </div>
    </div>
  );
}
