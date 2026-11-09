import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeetInput } from './FeetInput';

function Harness({ initial = '' }: { initial?: string }) {
  const [inches, setInches] = useState(initial);
  return (
    <>
      <FeetInput id="length_ft" inches={inches} onInchesChange={setInches} maxPlausibleFeet={60} />
      <output data-testid="inches">{inches}</output>
    </>
  );
}

describe('FeetInput', () => {
  it('saves 28 typed feet as 336 inches (not 248 ft)', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('spinbutton'), '28');
    expect(screen.getByRole('spinbutton')).toHaveValue(28);
    expect(screen.getByTestId('inches').textContent).toBe('336');
  });

  it('saves 18 typed feet as 216 inches (not 128 ft)', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('spinbutton'), '18');
    expect(screen.getByTestId('inches').textContent).toBe('216');
  });

  it('shows a saved 26 ft length as 26', () => {
    render(<Harness initial="312" />);
    expect(screen.getByRole('spinbutton')).toHaveValue(26);
  });

  it('suggests the feet value when inches are typed into a feet box', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('spinbutton'), '312');
    expect(screen.getByText(/enter 26 ft/)).toBeInTheDocument();
  });
});
