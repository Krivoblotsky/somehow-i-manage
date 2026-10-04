import { db as defaultDb, type PersonalDB } from './db';
import {
  createItem,
  createPerson,
  createProject,
  resetMapLayout,
  type NewItem,
} from './repository';
import { SAMPLE_AVATARS } from './sampleAvatars';

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const MIPP_BODY =
  '<p>The Innovation Portfolio Program turns ideas from any team into small, time-boxed experiments, and funds the ones that prove their value.</p>' +
  '<p>Repeated innovation has to be front and centre. The goal is to help people spot an idea, develop it and move it through the organisation: the kind of idea that changes a team’s future.</p>';

/** One sample item: what to create, plus the dates that make it look lived-in. */
interface SampleItem extends Omit<NewItem, 'personId'> {
  /** Days before now it was created (and last edited); 0 = today. */
  ago?: number;
  /** Days before now it was completed; implies isCompleted. */
  doneAgo?: number;
  /** Due date, in days from today (negative = overdue). */
  due?: number;
  /** Covered in the previous 1:1 (days before now). */
  discussedAgo?: number;
  /** Name of the sample project this belongs to (created up front). */
  project?: string;
}

/**
 * A team of ten (32 items) with every kind of thing the app can show — urgent, due soon, overdue, done,
 * discussed, rich notes, a past 1:1, and one person with nothing yet. Appends; never clears.
 */
export async function loadSampleData(database: PersonalDB = defaultDb): Promise<void> {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dueIn = (days: number) => startOfToday.getTime() + days * DAY;
  const lastOneOnOne = now - 12 * DAY;

  await database.transaction('rw', database.people, database.items, database.projects, async () => {
    // Three pieces of work that cut across the team, so the map shows what a project looks like.
    const projectId = new Map<string, string>();
    for (const name of ['MIPP', 'Release 2.1', 'Hiring'])
      projectId.set(name, (await createProject(name, database)).id);

    async function person(
      name: string,
      role: string,
      colorIndex: number,
      avatar: keyof typeof SAMPLE_AVATARS,
      contacts: { kind: 'email' | 'phone' | 'slack' | 'linkedin'; value: string }[],
      items: SampleItem[],
    ) {
      const created = await createPerson(
        {
          name,
          role,
          colorIndex,
          avatarDataUrl: SAMPLE_AVATARS[avatar],
          avatarSource: 'upload',
          contacts,
        },
        database,
      );
      for (const { ago = 0, doneAgo, due, discussedAgo, project, ...input } of items) {
        const item = await createItem(
          {
            ...input,
            personId: created.id,
            isCompleted: doneAgo !== undefined,
            projectId: project ? projectId.get(project) : undefined,
          },
          database,
        );
        const at = now - ago * DAY;
        await database.items.update(item.id, {
          createdAt: at,
          updatedAt: at,
          completedAt: doneAgo !== undefined ? now - doneAgo * DAY : undefined,
          dueDate: due !== undefined ? dueIn(due) : undefined,
          discussedAt: discussedAgo !== undefined ? now - discussedAgo * DAY : undefined,
        });
      }
      return created;
    }

    const emily = await person(
      'Emily Carter',
      'Senior iOS Engineer',
      0,
      'emily',
      [
        { kind: 'email', value: 'emily.carter@example.com' },
        { kind: 'slack', value: '@emily' },
      ],
      [
        {
          title: 'Promotion',
          isFlagged: true,
          due: 3,
          body: '<p>Emily is ready for Staff. The case:</p><ul><li>Led the offline-first migration end to end</li><li>Mentors two juniors, both shipping</li><li>Owns release quality since Q2</li></ul>',
        },
        {
          title: 'Salary Review',
          ago: 20,
          discussedAgo: 12,
          body: '<p>Benchmark against the new band before we talk numbers.</p>',
        },
        {
          title: 'Business Trip',
          ago: 20,
          due: 7,
          body: '<p>Berlin, 14–16 Oct. Needs a budget code.</p>',
        },
        { title: 'Expense report', ago: 20, due: -4 },
        { title: 'Launch MIPP', project: 'MIPP', ago: 20, doneAgo: 3, body: MIPP_BODY },
        { title: 'Complete Job Description', project: 'Hiring', ago: 20, doneAgo: 1 },
        {
          kind: 'note',
          title: 'Retro takeaways',
          body: '<p>Wants more ownership of the roadmap. Bring it up at the next 1:1.</p><ul><li>Frustrated by late scope changes</li><li>Loved the pairing week — do it again</li></ul>',
        },
      ],
    );
    // Emily had a 1:1 twelve days ago, so her screen has a "since last 1:1" recap to show.
    await database.people.update(emily.id, {
      meetings: [{ startedAt: lastOneOnOne, endedAt: lastOneOnOne + 35 * MINUTE }],
    });

    await person(
      'Marcus Johnson',
      'Product Manager',
      1,
      'marcus',
      [
        { kind: 'email', value: 'marcus.johnson@example.com' },
        { kind: 'phone', value: '+1 (415) 555-0133' },
      ],
      [
        {
          title: 'Promotion Next Steps',
          ago: 6,
          due: 0,
          body: '<p>Agree the timeline with HR, then write the case together.</p>',
        },
        {
          title: 'Approve Focus Areas',
          project: 'MIPP',
          ago: 6,
          due: 1,
          body: '<p>The Q4 draft is in the shared doc; two areas still overlap.</p>',
        },
        {
          title: 'Patents Agreement',
          project: 'MIPP',
          ago: 4,
          body: '<p>Legal needs the final inventor list.</p>',
        },
        {
          title: 'Team Restructuring',
          ago: 2,
          body: '<p>Proposal for the platform split:</p><ol><li>Two squads, one shared on-call rotation</li><li>Marcus leads hiring for both</li><li>Decide by the end of the quarter</li></ol>',
        },
        { title: 'Buy Tickets', ago: 15, doneAgo: 10 },
        {
          kind: 'note',
          title: 'Prefers async updates',
          ago: 1,
          body: '<p>Written status on Fridays beats a sync. Keep the weekly short.</p>',
        },
      ],
    );

    await person(
      'Sofia Reyes',
      'Design Lead',
      2,
      'sofia',
      [
        { kind: 'email', value: 'sofia.reyes@example.com' },
        { kind: 'linkedin', value: 'sofia-reyes' },
      ],
      [
        {
          title: 'Hire a junior designer',
          project: 'Hiring',
          isFlagged: true,
          ago: 14,
          due: -7,
          body: '<p>Two finalists. Decide this week or we lose both.</p>',
        },
        { title: 'Design system audit', ago: 9, doneAgo: 2 },
        { title: 'Conference talk proposal', ago: 3, due: 12 },
        {
          kind: 'note',
          title: 'Career goals',
          ago: 5,
          body: '<blockquote><p>“I want to run a team by next year.”</p></blockquote><p>Discussed two paths: lead designer and manager. She leans manager.</p>',
        },
      ],
    );

    // A peer who joined recently: nothing on the map yet, which is also a state worth showing.
    await person('David Nguyen', 'Engineering Manager · peer', 4, 'david', [], []);

    // The wider team: enough people that some sit off-screen and the strip scrolls.
    await person(
      'Olivia Bennett',
      'Backend Engineer',
      5,
      'olivia',
      [],
      [
        {
          title: 'Postmortem write-up',
          project: 'Release 2.1',
          ago: 2,
          due: 1,
          body: '<p>The Tuesday outage. Blameless, two pages, one action list.</p>',
        },
        { kind: 'note', title: 'Wants to try leading on-call', ago: 9 },
      ],
    );
    // James opens the landing-page demo, so he shows a bit of everything.
    await person(
      'James Patel',
      'QA Lead',
      0,
      'james',
      [{ kind: 'email', value: 'james.patel@example.com' }],
      [
        {
          title: 'Regression suite for 2.1',
          project: 'Release 2.1',
          isFlagged: true,
          ago: 3,
          due: 2,
          body: '<p>Blocks the release train. Needs the new device lab images.</p>',
        },
        {
          title: 'Release checklist v2',
          project: 'Release 2.1',
          ago: 4,
          body: '<p>Fold the App Store steps in.</p>',
        },
        { title: 'Device lab budget', project: 'Release 2.1', ago: 9, due: -3 },
        { title: 'Shadow Olivia on the on-call rota', ago: 2, due: 9 },
        { title: 'Flaky test audit', project: 'Release 2.1', ago: 12, doneAgo: 5 },
        {
          kind: 'note',
          title: 'Wants to move into SDET',
          ago: 6,
          body: '<p>Came up at the offsite.</p><ul><li>Loves tooling, less so manual passes</li><li>Needs a mentor on the platform team</li></ul>',
        },
        {
          kind: 'note',
          title: 'Prefers written feedback',
          ago: 15,
          body: '<p>Give him a day with the notes before talking it through.</p>',
        },
      ],
    );
    await person(
      'Ava Thompson',
      'Recruiter',
      1,
      'ava',
      [],
      [
        {
          title: 'Offer for the designer role',
          project: 'Hiring',
          isFlagged: true,
          ago: 1,
          due: 0,
          body: '<p>Sofia’s pick. Comp approved, start date open.</p>',
        },
      ],
    );
    await person(
      'Daniel Kim',
      'Data Analyst',
      2,
      'daniel',
      [],
      [
        {
          kind: 'note',
          title: 'Dashboard numbers lag a week',
          ago: 3,
          body: '<p>Knows about it; the fix lands with the next pipeline change.</p>',
        },
      ],
    );
    await person(
      'Grace Miller',
      'Customer Success',
      3,
      'grace',
      [],
      [
        { title: 'Churn review prep', ago: 6, due: 5 },
        { title: 'Share NPS verbatims', ago: 10, doneAgo: 5 },
      ],
    );
    await person(
      'Ethan Brooks',
      'Intern',
      4,
      'ethan',
      [],
      [
        { title: 'Onboarding buddy check-in', ago: 8, due: -1 },
        {
          kind: 'note',
          title: 'Interested in iOS',
          ago: 8,
          body: '<p>Pair him with Emily for a week.</p>',
        },
      ],
    );

    // Demo people look best on balanced rings with room between them, like the design frames.
    await resetMapLayout(database);
  });
}
