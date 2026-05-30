import { describe, it, expect } from 'vitest';
import { detectAvailabilityConflict } from '../availabilityConflict';

describe('detectAvailabilityConflict', () => {
  it('returns the reason when the functions client surfaces the body via `data`', async () => {
    const reason = await detectAvailabilityConflict({
      data: {
        code: 'availability_conflict',
        error: 'Slot 2 is already booked for these dates',
      },
      error: null,
    });
    expect(reason).toBe('Slot 2 is already booked for these dates');
  });

  it('returns the reason when the functions client wraps a 409 in `error.context.response`', async () => {
    const response = new Response(
      JSON.stringify({
        code: 'availability_conflict',
        error: 'Time slot 14:00 on 2026-06-01 is fully booked',
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
    const reason = await detectAvailabilityConflict({
      data: null,
      error: { context: { response } },
    });
    expect(reason).toBe('Time slot 14:00 on 2026-06-01 is fully booked');
  });

  it('returns a default reason if the 409 body omits an explicit message', async () => {
    const response = new Response(JSON.stringify({ code: 'availability_conflict' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
    const reason = await detectAvailabilityConflict({ data: null, error: { context: { response } } });
    expect(reason).toBe('This time is no longer available.');
  });

  it('returns null for a healthy response with a checkout URL', async () => {
    const reason = await detectAvailabilityConflict({
      data: { url: 'https://checkout.stripe.com/...' } as unknown as {
        code?: string;
        error?: string;
      },
      error: null,
    });
    expect(reason).toBeNull();
  });

  it('returns null when the function returns a non-409 error', async () => {
    const response = new Response(JSON.stringify({ error: 'Boom' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
    const reason = await detectAvailabilityConflict({
      data: null,
      error: { context: { response } },
    });
    expect(reason).toBeNull();
  });

  it('returns null when a 409 has a different error code (not availability)', async () => {
    const response = new Response(JSON.stringify({ code: 'something_else' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
    const reason = await detectAvailabilityConflict({
      data: null,
      error: { context: { response } },
    });
    expect(reason).toBeNull();
  });
});
