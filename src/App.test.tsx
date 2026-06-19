import { describe, it, expect } from 'vitest';
import { render, screen } from '../tests/setup/test-utils';
import { App } from './App';

describe('App — smoke tests', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('shows the app title as the h1', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByText(/Document Intake/i)).toBeTruthy();
  });

  it('renders the navigation rail', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /Dashboard/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Documents/i })).toBeTruthy();
  });

  it('shows the Admin Settings tab for the default Admin role', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /Admin Settings/i })).toBeTruthy();
  });

  it('loads seeded documents on the Documents screen', async () => {
    render(<App />, { initialRoute: '/documents' });
    expect(await screen.findByText('northwind-invoice-00841.pdf')).toBeTruthy();
  });
});

