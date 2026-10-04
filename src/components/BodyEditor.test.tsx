import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRecognition, installFakeRecognition } from '../test/fakeRecognition';
import { BodyEditor } from './BodyEditor';

beforeEach(() => installFakeRecognition());
afterEach(() => vi.unstubAllGlobals());

describe('BodyEditor dictation', () => {
  it('writes the spoken words at the cursor, replacing them as they firm up', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BodyEditor initialValue="<p>Agenda:</p>" onChange={onChange} />);
    const body = await screen.findByRole('textbox', { name: 'Body' });
    expect(body).toHaveTextContent('Agenda:');

    await user.click(screen.getByRole('button', { name: 'Dictate here' }));
    const rec = FakeRecognition.instances[0]!;
    expect(rec.started).toBe(true);
    act(() => rec.say('talk about the', false));
    expect(body).toHaveTextContent('Agenda: talk about the');
    act(() => rec.say('talk about the offsite budget', true));
    expect(body).toHaveTextContent('Agenda: talk about the offsite budget');
    expect(onChange).toHaveBeenLastCalledWith('<p>Agenda: talk about the offsite budget</p>');
    expect(await screen.findByRole('button', { name: 'Dictate here' })).toBeInTheDocument();
  });

  it('starts a fresh paragraph without a leading space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BodyEditor initialValue="" onChange={onChange} />);
    await screen.findByRole('textbox', { name: 'Body' });
    await user.click(screen.getByRole('button', { name: 'Dictate here' }));
    act(() => FakeRecognition.instances[0]!.say('Hello there', true));
    expect(onChange).toHaveBeenLastCalledWith('<p>Hello there</p>');
  });
});
