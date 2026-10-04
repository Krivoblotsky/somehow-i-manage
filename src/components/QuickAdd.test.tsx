import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../data/db';
import { createPerson } from '../data/repository';
import { FakeRecognition, installFakeRecognition } from '../test/fakeRecognition';
import { QuickAdd } from './QuickAdd';

let personId = '';
beforeEach(async () => {
  await Promise.all([db.people.clear(), db.items.clear()]);
  personId = (await createPerson({ name: 'Emily Carter' })).id;
  installFakeRecognition();
});
afterEach(() => vi.unstubAllGlobals());

describe('QuickAdd dictation', () => {
  it('dictates into the field, then Enter saves it like typed text', async () => {
    const user = userEvent.setup();
    render(<QuickAdd personId={personId} personName="Emily Carter" />);
    const input = screen.getByRole('textbox', { name: 'Add a task with Emily Carter' });
    await user.type(input, 'Prepare');
    await user.click(screen.getByRole('button', { name: 'Dictate a task' }));
    const rec = FakeRecognition.instances[0]!;
    expect(rec.started).toBe(true);
    expect(rec.interimResults).toBe(true);
    expect(input).toHaveAttribute('placeholder', 'Listening…');
    expect(screen.getByRole('button', { name: 'Stop dictating' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    act(() => rec.say('the salary', false));
    expect(input).toHaveValue('Prepare the salary');
    act(() => rec.say('the salary review', true));
    expect(input).toHaveValue('Prepare the salary review');
    expect(await screen.findByRole('button', { name: 'Dictate a task' })).toBeInTheDocument();

    await user.keyboard('{Enter}');
    await vi.waitFor(async () => expect(await db.items.count()).toBe(1));
    expect((await db.items.toArray())[0]?.title).toBe('Prepare the salary review');
    expect(input).toHaveValue('');
  });

  it('says plainly when the microphone is refused', async () => {
    const user = userEvent.setup();
    render(<QuickAdd personId={personId} personName="Emily Carter" />);
    await user.click(screen.getByRole('button', { name: 'Dictate a task' }));
    const rec = FakeRecognition.instances[0]!;
    act(() => {
      rec.onerror?.({ error: 'not-allowed' });
      rec.onend?.();
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Microphone access was denied');
  });

  it('offers no mic where the browser has no speech recognition', () => {
    vi.unstubAllGlobals();
    render(<QuickAdd personId={personId} personName="Emily Carter" />);
    expect(screen.queryByRole('button', { name: /Dictate/ })).not.toBeInTheDocument();
  });
});
