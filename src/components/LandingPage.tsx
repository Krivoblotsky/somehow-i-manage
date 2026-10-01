import { useState, type ReactNode } from 'react';
import { syncActions, type SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
import { CloudIcon, GoogleIcon } from './icons';
import styles from './LandingPage.module.css';

/** The front door: what the app is, and the one way in. Nothing else is reachable signed out. */
export function LandingPage({ actions = syncActions }: { actions?: SyncActions }) {
  const authError = useSync((s) => s.authError);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      await actions.signInWithGoogle(); // the browser leaves for Google and comes back signed in
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const problem = error ?? authError;
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.nav}>
          <div className={styles.brand}>Somehow I Manage</div>
          <button type="button" className={styles.navBtn} onClick={() => void signIn()}>
            Sign in
          </button>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.kicker}>A task manager for managers</div>
            <h1 className={styles.title}>Work with people, not&nbsp;tasks.</h1>
            <p className={styles.lead}>
              Every task, note and 1:1 lives with the person it’s about. See your whole team on one
              map, walk into every 1:1 prepared, and retire the dossier you keep in Apple Notes.
            </p>
            <div className={styles.cta}>
              <button
                type="button"
                className={styles.google}
                disabled={busy}
                onClick={() => void signIn()}
              >
                <GoogleIcon />
                {busy ? 'Opening Google…' : 'Continue with Google'}
              </button>
              <span className={styles.ctaNote}>
                Free while in beta.
                <br />
                Only your email address, nothing else.
              </span>
            </div>
            {problem && (
              <p className={styles.error} role="alert">
                {problem}
              </p>
            )}
          </div>
          <MapIllustration />
        </section>

        <h2 className={styles.sectionTitle}>What’s different</h2>
        <section className={styles.features}>
          <Feature
            color="var(--person-0)"
            icon={<PersonGlyph />}
            title="People first"
            text="Add a person, then collect what you need to do with them. A task is “with Vira”, not assigned to her."
          />
          <Feature
            color="var(--person-1)"
            icon={<MapGlyph />}
            title="The People Map"
            text="Your team as hubs, their items as cards around them. Drag a card to another person to hand it over."
          />
          <Feature
            color="var(--person-2)"
            icon={<MeetingGlyph />}
            title="1:1 mode"
            text="One screen for the meeting: tick what got done, mark what you covered, capture what comes up, see what changed since last time."
          />
          <Feature
            color="var(--person-4)"
            icon={<CloudIcon size={20} />}
            title="Yours, everywhere"
            text="Works offline, installs like an app, syncs across your devices. Export to Markdown or JSON whenever you like."
          />
        </section>

        <h2 className={styles.sectionTitle}>How it works</h2>
        <section className={styles.steps}>
          <Step
            no="01"
            title="Add your people"
            text="Direct reports, peers, clients — anyone you keep things in mind for. A photo comes from Gravatar if they have one."
          />
          <Step
            no="02"
            title="Capture as it happens"
            text={
              <>
                Type a line under their name, hit <kbd>⌘K</kbd> from anywhere, or paste a whole list
                straight out of your notes.
              </>
            }
          />
          <Step
            no="03"
            title="Run your 1:1s"
            text="Start the meeting from their page. The agenda is already there; so is what got done since you last talked."
          />
        </section>

        <footer className={styles.footer}>
          <span>Somehow I Manage · built by a manager, for managers.</span>
          <button type="button" className={styles.footerBtn} onClick={() => void signIn()}>
            Sign in with Google →
          </button>
        </footer>
      </div>
    </div>
  );
}

function Feature({
  color,
  icon,
  title,
  text,
}: {
  color: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className={styles.feature}>
      <div className={styles.featureIcon} style={{ background: color }}>
        {icon}
      </div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureText}>{text}</p>
    </article>
  );
}

function Step({ no, title, text }: { no: string; title: string; text: ReactNode }) {
  return (
    <article>
      <div className={styles.stepNo}>{no}</div>
      <h3 className={styles.stepTitle}>{title}</h3>
      <p className={styles.stepText}>{text}</p>
    </article>
  );
}

const glyph = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor' };

function PersonGlyph() {
  return (
    <svg {...glyph} strokeWidth="1.8" aria-hidden="true">
      <circle cx="10" cy="7" r="3.5" />
      <path d="M3.5 17a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
    </svg>
  );
}
function MapGlyph() {
  return (
    <svg {...glyph} strokeWidth="1.8" aria-hidden="true">
      <circle cx="10" cy="10" r="3" />
      <circle cx="3.5" cy="4.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <path d="M7.8 8.2 4.8 5.6M12.6 8.3l2.7-2.4M12.2 12.2l2.3 2.6" strokeLinecap="round" />
    </svg>
  );
}
function MeetingGlyph() {
  return (
    <svg {...glyph} strokeWidth="1.8" aria-hidden="true">
      <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h6A2.5 2.5 0 0 1 14 5.5v3a2.5 2.5 0 0 1-2.5 2.5H8l-3.5 3v-3A2.5 2.5 0 0 1 3 8.5v-3Z" />
      <path
        d="M16.5 8.5a2.5 2.5 0 0 1 .5 1.5v3a2.5 2.5 0 0 1-2.5 2.5h-1l-2 2"
        strokeLinecap="round"
      />
    </svg>
  );
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
  return (
    <div className={styles.splash} aria-busy="true">
      Somehow I Manage
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
