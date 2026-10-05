import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import CollapsibleDescription from '../CollapsibleDescription';

afterEach(cleanup);

describe('CollapsibleDescription', () => {
  it('masks contact details for buyers', () => {
    render(<CollapsibleDescription description="Great trailer. Call 480-555-1234 or email me@x.com" />);
    expect(screen.getByText(/Great trailer/)).toHaveTextContent('Call [contact via Vendibook] or email [contact via Vendibook]');
    expect(screen.queryByText(/480-555-1234/)).not.toBeInTheDocument();
  });

  it('shows the owner their own text unmasked', () => {
    render(<CollapsibleDescription description="Call 480-555-1234" maskContacts={false} />);
    expect(screen.getByText('Call 480-555-1234')).toBeInTheDocument();
  });
});
