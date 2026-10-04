/**
 * The questions people ask before signing in, answered in a sentence or three. Shown on the
 * landing page and published as FAQ structured data, so the two never drift apart.
 */
export const FAQ: readonly { q: string; a: string }[] = [
  {
    q: 'What is Somehow I Manage?',
    a: 'A task manager built for people managers. Instead of lists and projects, it organises everything around the people you work with: each person has a page with their tasks, notes and 1:1s, and the People Map shows the whole team at a glance.',
  },
  {
    q: 'How is it different from a to-do app?',
    a: 'Every item belongs to a person, not a list. You see who is waiting on you, you prepare a 1:1 in a minute from what is already there, and handing a task to someone else is one drag on the map.',
  },
  {
    q: 'How do 1:1s work?',
    a: 'Start a 1:1 from someone’s page and the agenda builds itself from their open items. Tick what got done, mark what you discussed, capture new things as they come up. Ending the meeting records it, and the next one shows what happened since.',
  },
  {
    q: 'Can I group work by project?',
    a: 'Yes. Tag any task or note with a project; people stay the way in, the project is the thread across them. Cards and rows show the tag, and the Projects panel on the map counts what hangs on each project and, with one click, lights up everything in it, whoever it is with.',
  },
  {
    q: 'Can my AI assistant use it?',
    a: 'Yes. Somehow I Manage has an MCP server, so Claude, ChatGPT, Cursor and other assistants can read and update your people, tasks and notes as you: “what is open with Vira”, “prepare my 1:1 with Anton”, “add a task with Emily”. You give the client one address, sign in once and approve it; you can disconnect it any time.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. Your data is stored on your device and the app works without a connection. When you are back online it syncs to your account, so your other devices catch up.',
  },
  {
    q: 'Where is my data stored, and who can see it?',
    a: 'On your device and in a private database tied to your account, hosted by Supabase. Only you can read it. There are no ads, no trackers, no third-party analytics and no selling of data; the only measurement is a first-party count of visits by day. You can export or delete everything at any time.',
  },
  {
    q: 'How do I sign in?',
    a: 'With Google or Microsoft, using a work, school or personal account. After your first sign-in you can add a passkey and use Face ID, Touch ID or a security key instead.',
  },
  {
    q: 'Does it cost anything?',
    a: 'No. Somehow I Manage is free to use.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. It is a web app you can install on iPhone, iPad, Mac or Windows straight from the browser. It keeps working offline and opens like a native app.',
  },
];
