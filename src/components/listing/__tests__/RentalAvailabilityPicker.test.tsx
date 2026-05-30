import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { isSameDay, parseISO } from 'date-fns';

// --- Mock the two data hooks the picker depends on -------------------------------
vi.mock('@/hooks/useBlockedDates', () => ({
  useBlockedDates: () => ({
    blockedDates: [],
    bookedDates: [],
    bufferDates: [],
    bufferDays: 0,
    upcomingBookings: [],
    allUnavailableDates: [],
    isLoading: false,
    addBlockedDates: vi.fn(),
    removeBlockedDate: vi.fn(),
    // The only function the picker actually calls
    isDateUnavailable: (date: Date) => isSameDay(date, parseISO('2026-07-20')),
  }),
}));

vi.mock('@/hooks/useHourlyAvailability', () => ({
  useHourlyAvailability: () => ({
    settings: {
      hourlyEnabled: false,
      dailyEnabled: true,
      minHours: 1,
      minDays: 1,
      bufferTimeMins: 0,
      priceHourly: 0,
      priceDaily: 100,
      priceWeekly: null,
      priceMonthly: null,
    },
    isLoading: false,
    existingBookings: [],
    blockedDates: [],
    blockedTimeSlots: [],
    getDayAvailabilityInfo: (date: Date) => ({
      isUnavailable: isSameDay(date, parseISO('2026-07-20')),
      isLimited: false,
      availableSlots: 1,
      totalSlots: 1,
    }),
    getAvailableWindowsForDate: () => [],
    isDateFullyUnavailable: (date: Date) => isSameDay(date, parseISO('2026-07-20')),
    hasDailyBookingOnDate: () => false,
    hasHourlyBookingOnDate: () => false,
    calculateHourlyPrice: () => 0,
    calculateDailyPrice: () => 0,
    getAvailableSlotsForDate: () => 1,
    countDailyBookingsOnDate: () => 0,
  }),
}));

// Tracking is noisy; stub it
vi.mock('@/lib/leadTracking', () => ({
  trackLeadEvent: vi.fn(),
}));

import { RentalAvailabilityPicker } from '@/components/listing/RentalAvailabilityPicker';

const renderPicker = () =>
  render(
    <MemoryRouter>
      <RentalAvailabilityPicker
        listingId="listing-test-1"
        listingTitle="Test Truck"
        category="food-truck"
        priceDaily={100}
        priceHourly={null}
        priceWeekly={null}
        priceMonthly={null}
        totalSlots={1}
        instantBook={false}
      />
    </MemoryRouter>,
  );

// Helper: pull calendar-day buttons (the only buttons whose label is pure digits)
const getDayButton = (day: number): HTMLButtonElement => {
  const buttons = screen.getAllByRole('button');
  const match = buttons.find((b) => b.textContent?.trim() === String(day)) as
    | HTMLButtonElement
    | undefined;
  if (!match) throw new Error(`Day button ${day} not found`);
  return match;
};

describe('RentalAvailabilityPicker — availability blocking', () => {
  beforeEach(() => {
    // Pin "today" so the calendar deterministically lands on July 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables the blocked day and starts with a non-actionable CTA', () => {
    renderPicker();

    // Day 20 (mocked as unavailable) must be a disabled button with line-through styling
    const blocked = getDayButton(20);
    expect(blocked).toBeDisabled();
    expect(blocked.className).toMatch(/line-through/);

    // CTA cannot be used yet
    expect(
      screen.getByRole('button', { name: /select a date to continue/i }),
    ).toBeDisabled();
  });

  it('shows the conflict warning and disables the CTA when a range spans a blocked day', () => {
    renderPicker();

    // Pick a start before the blocked day and an end after it
    fireEvent.click(getDayButton(18));
    fireEvent.click(getDayButton(22));

    // Conflict warning UI must appear with the explicit message
    expect(
      screen.getByText(/some dates in this rental period are unavailable/i),
    ).toBeInTheDocument();

    // CTA must surface the conflict state and stay disabled
    const cta = screen.getByRole('button', { name: /some dates unavailable/i });
    expect(cta).toBeDisabled();
  });

  it('allows continuing when the chosen range avoids the blocked day', () => {
    renderPicker();

    // Pick a clean range entirely before the blocked day
    fireEvent.click(getDayButton(16));
    fireEvent.click(getDayButton(19));

    // No conflict warning
    expect(
      screen.queryByText(/some dates in this rental period are unavailable/i),
    ).not.toBeInTheDocument();

    // CTA reflects the request-to-book label and is enabled
    const cta = screen.getByRole('button', { name: /start booking request/i });
    expect(cta).toBeEnabled();
  });
});

// -------------------------------------------------------------------------------
// 409 conflict surfacing — proves the checkout layer rejects double-booking
// even if the optimistic UI somehow let it through.
// -------------------------------------------------------------------------------
import { detectAvailabilityConflict } from '@/lib/availabilityConflict';

describe('Checkout double-booking guard — 409 surfacing', () => {
  it('treats a 409 availability_conflict response from the edge function as a blocking error', async () => {
    // Simulates what supabase.functions.invoke surfaces when the edge function
    // returns HTTP 409 with { code: "availability_conflict" }
    const response = new Response(
      JSON.stringify({
        code: 'availability_conflict',
        error: 'Time slot 14:00 on 2026-07-20 is fully booked',
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );

    const reason = await detectAvailabilityConflict({
      data: null,
      error: { context: { response } },
    });

    // BookingCheckout consumes this reason to fire a toast + analytics event
    // and refuses to navigate to Stripe.
    expect(reason).toBe('Time slot 14:00 on 2026-07-20 is fully booked');
  });
});
