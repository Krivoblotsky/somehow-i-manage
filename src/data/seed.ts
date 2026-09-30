import { db as defaultDb, type PersonalDB } from './db';
import { createItem, createPerson, relayoutPerson } from './repository';

const MIPP_BODY =
  '<p>The objective of the MacPaw Innovations Portfolio Program is to continuously generate and implement new ideas by conducting experiments and validating hypotheses that can unlock potential value.</p>' +
  '<p>Repeated innovation is going to have to be front and center at MacPaw. Primary goal is to help employees identify, develop and move an idea through an organization – an idea that can change your team’s and your unit’s future and jumpstart innovation.</p>';

/** The three people from the Figma frames, with their items. Appends; never clears. */
export async function loadSampleData(database: PersonalDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.people, database.items, async () => {
    const vira = await createPerson({ name: 'Vira', colorIndex: 0 }, database);
    const nata = await createPerson({ name: 'Nata', colorIndex: 1 }, database);
    await createPerson({ name: 'Anton', colorIndex: 2 }, database);

    for (const title of [
      'Promotion Next Steps',
      'Approve Focus Areas',
      'Patents Agreement',
      'Team Restructuring',
    ]) {
      await createItem(
        { personId: nata.id, title, body: '<p>Some text about this item.</p>' },
        database,
      );
    }
    await createItem({ personId: nata.id, title: 'Buy Tickets', isCompleted: true }, database);

    await createItem(
      { personId: vira.id, title: 'Launch MIPP', body: MIPP_BODY, isCompleted: true },
      database,
    );
    await createItem({ personId: vira.id, title: 'Salary Review' }, database);
    await createItem({ personId: vira.id, title: 'Business Trip' }, database);
    await createItem(
      { personId: vira.id, title: 'Complete Job Description', isCompleted: true },
      database,
    );
    await createItem({ personId: vira.id, title: 'Promotion', isFlagged: true }, database);
    await createItem(
      {
        personId: vira.id,
        kind: 'note',
        title: 'Retro takeaways',
        body: '<p>Wants more ownership of the roadmap. Bring it up at the next 1:1.</p>',
      },
      database,
    );

    // Demo people look best on balanced rings, like the design frames.
    await relayoutPerson(vira.id, database);
    await relayoutPerson(nata.id, database);
  });
}
