import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FEEDBACK_EMAIL, feedbackMailto } from '../../model/feedback';
import { FeedbackIsland } from './FeedbackIsland';

describe('FeedbackIsland', () => {
  it('opens a sheet and sends what was typed as an email', async () => {
    const user = userEvent.setup();
    render(<FeedbackIsland />);
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    await user.type(screen.getByLabelText('Your feedback'), 'More room for notes, please');
    const send = screen.getByRole('link', { name: 'Send by email' });
    expect(send).toHaveAttribute('href', expect.stringContaining(`mailto:${FEEDBACK_EMAIL}`));
    expect(send.getAttribute('href')).toContain('More%20room%20for%20notes%2C%20please');
  });

  it('builds a mail link with the subject, and the body only when there is text', () => {
    expect(feedbackMailto()).toBe(
      `mailto:${FEEDBACK_EMAIL}?subject=Feedback%20on%20Somehow%20I%20Manage`,
    );
    expect(feedbackMailto('  Hi  ')).toContain('&body=Hi');
  });
});
