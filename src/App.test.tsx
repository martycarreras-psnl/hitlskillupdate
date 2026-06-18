import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../tests/setup/test-utils';
import { App } from './App';

describe('App — smoke tests', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('displays the app title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('shows the celebratory launch screen', () => {
    render(<App />);
    expect(screen.getByText(/is live!/i)).toBeTruthy();
  });

  it('shows the path selection question', () => {
    render(<App />);
    expect(screen.getByText(/What are you building/i)).toBeTruthy();
  });

  it('navigates to new-tables steps when first card is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByText('A brand new app'));
    expect(screen.getByText('Building something new')).toBeTruthy();
    expect(screen.getByText('Describe your business problem')).toBeTruthy();
  });

  it('navigates to existing-tables steps when second card is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByText('An app on existing data'));
    expect(screen.getByText('Building on existing data')).toBeTruthy();
    expect(screen.getByText('Discover your existing schema')).toBeTruthy();
  });

  it('returns to the choice screen when Back is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByText('A brand new app'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText(/What are you building/i)).toBeTruthy();
  });
});
