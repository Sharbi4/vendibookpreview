import { describe, expect, it, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FieldHelp from '../FieldHelp';
import VisibilityLabel from '../VisibilityLabel';

beforeAll(() => {
  // jsdom lacks matchMedia; FieldHelp uses it to detect hover-capable pointers.
  if (!window.matchMedia) {
    // @ts-expect-error test shim
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }
});

describe('FieldHelp', () => {
  it('exposes a descriptive screen-reader label', () => {
    render(<FieldHelp label="title status">Guidance body</FieldHelp>);
    expect(
      screen.getByRole('button', { name: 'More information about title status' }),
    ).toBeInTheDocument();
  });

  it('opens on click and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<FieldHelp label="title status">Guidance body</FieldHelp>);
    const trigger = screen.getByRole('button', { name: /more information/i });

    expect(screen.queryByText('Guidance body')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(await screen.findByText('Guidance body')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('Guidance body')).not.toBeInTheDocument();
  });

  it('opens on keyboard focus', async () => {
    const user = userEvent.setup();
    render(<FieldHelp label="title status">Guidance body</FieldHelp>);
    await user.tab();
    expect(await screen.findByText('Guidance body')).toBeInTheDocument();
  });
});

describe('VisibilityLabel', () => {
  it('renders privacy facts as visible text, not tooltip-only', () => {
    const { rerender } = render(<VisibilityLabel kind="public" />);
    expect(screen.getByText('Public — Buyers will see this')).toBeVisible();

    rerender(<VisibilityLabel kind="private" />);
    expect(
      screen.getByText(
        'Private — Only you and authorized VendiBook personnel can access this',
      ),
    ).toBeVisible();

    rerender(<VisibilityLabel kind="optional" />);
    expect(
      screen.getByText('Optional — Add this to create a more detailed listing'),
    ).toBeVisible();
  });
});
