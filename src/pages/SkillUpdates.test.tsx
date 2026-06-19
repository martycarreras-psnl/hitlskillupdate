import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '../../tests/setup/test-utils';
import { App } from '@/App';

// These tests exercise the rejection → Skill Update Request flow end-to-end against
// the mock provider, plus the new Skill Updates screen. (ADR 0005.)

describe('Rejection raises a Skill Update Request', () => {
  it('shows the dialog on Reject and requires a suggested fix', async () => {
    render(<App />, { initialRoute: '/review/doc-1001' });

    // Wait for the workspace to load.
    await screen.findByText(/Reviewing:/i);

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    // Dialog appears asking about the agent skill.
    const title = await screen.findByText('Reject & suggest a skill update');
    expect(title).toBeTruthy();
    expect(screen.getByText(/improved in the agent's skill/i)).toBeTruthy();

    // Confirming with no text shows the required error.
    fireEvent.click(screen.getByRole('button', { name: /Reject & raise request/i }));
    expect(await screen.findByText(/suggested fix is required/i)).toBeTruthy();
  });

  it('does NOT show an always-visible review comment box on the review screen', async () => {
    render(<App />, { initialRoute: '/review/doc-1001' });
    await screen.findByText(/Reviewing:/i);
    expect(screen.queryByLabelText(/Review comment/i)).toBeNull();
  });

  it('creates a Skill Update Request when a rejection is confirmed', async () => {
    const { unmount } = render(<App />, { initialRoute: '/review/doc-1001' });
    await screen.findByText(/Reviewing:/i);

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await screen.findByText('Reject & suggest a skill update');
    fireEvent.change(screen.getByLabelText(/Suggested fix for the agent skill/i), {
      target: { value: 'Teach the skill to read split tax lines.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Reject & raise request/i }));

    // Wait until the workspace navigates away (both mutations resolved).
    await waitFor(() => expect(screen.queryByText(/Reviewing:/i)).toBeNull());

    // The new request is now persisted; mounting the Skill Updates screen shows it.
    unmount();
    render(<App />, { initialRoute: '/skill-updates' });
    expect(await screen.findByText(/read split tax lines/i, undefined, { timeout: 3000 })).toBeTruthy();
  });
});

describe('Skill Updates screen', () => {
  it('lists seeded skill update requests with their status', async () => {
    render(<App />, { initialRoute: '/skill-updates' });
    expect(await screen.findByText(/detect a separate "Tax" line/i)).toBeTruthy();
  });

  it('filters by status', async () => {
    render(<App />, { initialRoute: '/skill-updates' });
    await screen.findByText(/detect a separate "Tax" line/i);

    // Filter to Completed — only the completed seed remains.
    fireEvent.change(screen.getByLabelText(/Filter by status/i), { target: { value: '720670002' } });
    await waitFor(() => {
      expect(screen.getByText(/infer locale from the merchant address/i)).toBeTruthy();
      expect(screen.queryByText(/detect a separate "Tax" line/i)).toBeNull();
    });
  });

  it('opens a document preview dialog (not a navigation) when the document is clicked', async () => {
    render(<App />, { initialRoute: '/skill-updates' });
    await screen.findByText(/detect a separate "Tax" line/i);

    // The first seed links to office-supplies-receipt.jpg.
    fireEvent.click(screen.getAllByRole('button', { name: /office-supplies-receipt\.jpg/ })[0]);

    // A modal dialog opens in place — still on the Skill Updates screen.
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Extracted Data')).toBeTruthy();
    // The skill-updates table is still mounted behind the dialog (status filter present).
    expect(screen.getByLabelText(/Filter by status/i)).toBeTruthy();
  });
});
