import { CONTACT_LABEL, contactDisplay } from '../model/contacts';
import { stripHtml } from '../model/derive';
import { formatDateTime } from '../model/format';
import type { Item, Person } from '../model/types';

/** A person's dossier as Markdown — the escape hatch out of the app. */
export function personToMarkdown(person: Person, items: Item[]): string {
  const lines: string[] = [`# ${person.name}`];
  if (person.role) lines.push(`_${person.role}_`);
  for (const c of person.contacts ?? [])
    lines.push(`- ${CONTACT_LABEL[c.kind]}: ${contactDisplay(c)}`);
  lines.push('');

  const tasks = items
    .filter((i) => i.kind === 'task')
    .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted) || a.sortOrder - b.sortOrder);
  const notes = items.filter((i) => i.kind === 'note').sort((a, b) => b.updatedAt - a.updatedAt);

  if (tasks.length > 0) {
    lines.push('## Tasks', '');
    for (const t of tasks) {
      const body = stripHtml(t.body);
      lines.push(
        `- [${t.isCompleted ? 'x' : ' '}] ${t.isFlagged ? '⚑ ' : ''}${t.title || 'Untitled'}`,
      );
      if (body) lines.push(`  ${body}`);
    }
    lines.push('');
  }
  if (notes.length > 0) {
    lines.push('## Notes', '');
    for (const n of notes) {
      lines.push(`### ${n.title || 'Untitled'}`, `_${formatDateTime(n.updatedAt)}_`, '');
      const body = stripHtml(n.body);
      if (body) lines.push(body, '');
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}

export function allToMarkdown(people: Person[], items: Item[]): string {
  return people
    .map((p) =>
      personToMarkdown(
        p,
        items.filter((i) => i.personId === p.id),
      ),
    )
    .join('\n---\n\n');
}
