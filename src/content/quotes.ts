/**
 * Something to read while the app wakes up. Only lines whose attribution holds: the famous
 * "management quotes" that nobody actually said are left out on purpose.
 */
export interface Quote {
  text: string;
  by: string;
}

export const QUOTES: readonly Quote[] = [
  {
    text: 'Hire people who are better than you are, then leave them to get on with it.',
    by: 'David Ogilvy',
  },
  {
    text: 'Train people well enough so they can leave. Treat them well enough so they don’t want to.',
    by: 'Richard Branson',
  },
  {
    text: 'Before you are a leader, success is all about growing yourself. When you become a leader, success is all about growing others.',
    by: 'Jack Welch',
  },
  {
    text: 'Leadership is not about being in charge. It is about taking care of those in your charge.',
    by: 'Simon Sinek',
  },
  { text: 'Clear is kind. Unclear is unkind.', by: 'Brené Brown' },
  { text: 'People leave managers, not companies.', by: 'Marcus Buckingham' },
  {
    text: 'Great things in business are never done by one person. They’re done by a team of people.',
    by: 'Steve Jobs',
  },
  {
    text: 'It doesn’t make sense to hire smart people and then tell them what to do; we hire smart people so they can tell us what to do.',
    by: 'Steve Jobs',
  },
  {
    text: 'The task of leadership is not to put greatness into people, but to elicit it, for the greatness is there already.',
    by: 'John Buchan',
  },
  {
    text: 'A leader is best when people barely know he exists. When his work is done, his aim fulfilled, they will say: we did it ourselves.',
    by: 'Lao Tzu',
  },
  {
    text: 'The way management treats associates is exactly how the associates will treat the customers.',
    by: 'Sam Walton',
  },
  { text: 'Treat employees like they make a difference and they will.', by: 'Jim Goodnight' },
  {
    text: 'Good management is the art of making problems so interesting and their solutions so constructive that everyone wants to get to work and deal with them.',
    by: 'Paul Hawken',
  },
  { text: 'None of us is as smart as all of us.', by: 'Ken Blanchard' },
  {
    text: 'Management is, above all, a practice where art, science, and craft meet.',
    by: 'Henry Mintzberg',
  },
  { text: 'Leadership and learning are indispensable to each other.', by: 'John F. Kennedy' },
  {
    text: 'The function of leadership is to produce more leaders, not more followers.',
    by: 'Ralph Nader',
  },
  {
    text: 'You don’t build a business. You build people, and then people build the business.',
    by: 'Zig Ziglar',
  },
  { text: 'Managers do things right. Leaders do the right thing.', by: 'Warren Bennis' },
  {
    text: 'The strength of the team is each individual member. The strength of each member is the team.',
    by: 'Phil Jackson',
  },
];

/** One at random; the caller keeps it for as long as the screen is up. */
export function pickQuote(random: () => number = Math.random): Quote {
  return QUOTES[Math.floor(random() * QUOTES.length)] ?? QUOTES[0];
}
