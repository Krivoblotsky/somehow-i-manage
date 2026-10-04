import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../data/db';
import { createPerson } from '../data/repository';
import { WEEK_MS } from '../marketing/attribution';
import { configureMarketing, type MarketingTransport } from '../marketing/send';
import { useSync } from '../sync/store';
import { FeedbackPrompts } from './FeedbackPrompts';

function fakeTransport(): MarketingTransport {
  return { sendFeedback: vi.fn(async () => {}), countPageView: vi.fn(async () => {}) };
}

beforeEach(async () => {
  localStorage.clear();
  await db.people.clear();
  useSync.setState({ configured: true, user: { id: 'u1', email: 'me@example.com' } });
});
afterEach(() => configureMarketing(null));

describe('FeedbackPrompts', () => {
  it('asks where the person heard about the app once, and sends the answer', async () => {
    const user = userEvent.setup();
    const transport = fakeTransport();
    configureMarketing(transport);
    const { unmount } = render(<FeedbackPrompts />);
    expect(screen.getByRole('dialog', { name: 'One quick question' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hacker News' }));
    await waitFor(() =>
      expect(transport.sendFeedback).toHaveBeenCalledWith({
        kind: 'source',
        value: 'hn',
        referral: null,
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();
    render(<FeedbackPrompts />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not ask when a campaign link already said, but records it', async () => {
    localStorage.setItem(
      'personal.referral',
      JSON.stringify({ source: 'producthunt', campaign: 'oct26', landedAt: 1 }),
    );
    const transport = fakeTransport();
    configureMarketing(transport);
    render(<FeedbackPrompts />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(transport.sendFeedback).toHaveBeenCalledWith({
        kind: 'source',
        value: 'producthunt',
        referral: { source: 'producthunt', campaign: 'oct26', landedAt: 1 },
      }),
    );
  });

  it('asks the two questions after a week with three or more people, once', async () => {
    const user = userEvent.setup();
    const transport = fakeTransport();
    configureMarketing(transport);
    localStorage.setItem('personal.sourceAsked', '1');
    localStorage.setItem('personal.firstSeen', String(Date.now() - WEEK_MS - 1000));
    await createPerson({ name: 'A' });
    await createPerson({ name: 'B' });
    render(<FeedbackPrompts />);
    // two people: not yet
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await createPerson({ name: 'C' });
    const dialog = await screen.findByRole('dialog', { name: 'Two questions from the maker' });
    expect(dialog).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Maybe' }));
    await user.type(screen.getByRole('textbox', { name: 'What is missing?' }), 'Recurring 1:1s');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(transport.sendFeedback).toHaveBeenCalledWith({
        kind: 'survey',
        value: 'maybe',
        note: 'Recurring 1:1s',
        referral: null,
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('personal.surveyDone')).toBe('1');
  });

  it('shows nothing when signed out', () => {
    useSync.setState({ user: null });
    render(<FeedbackPrompts />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
