import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ListingLaunchKit } from '@/components/listing-wizard/ListingLaunchKit';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
afterEach(cleanup);
const props = { listingId: 'listing-123', caption: 'My listing', onFacebook: vi.fn(), onCopyLink: vi.fn(), onCopyCaption: vi.fn(), onDownloadStory: vi.fn() };
describe('listing launch kit', () => {
 it('uses explicit Instagram preparation and respects blocked sharing', () => {
  render(<ListingLaunchKit {...props} blocked />);
  expect(screen.getByRole('button', {name:'Share on Facebook'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name:'Prepare Instagram'}));
  expect(screen.getByText(/Link sticker/)).toBeInTheDocument();
  expect(screen.getByRole('button', {name:'Save Story image'})).toBeDisabled();
  expect(screen.getByRole('link', {name:'Set up live walkthroughs'})).toHaveAttribute('href','/dashboard/account/scheduling');
 });
 it('opens optional upgrades only on request and keeps checkout tied to the listing', () => {
  render(<ListingLaunchKit {...props} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:/Explore Featured/}));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('link', {name:'Review Featured pricing'})).toHaveAttribute('href','/checkout/product/boost-featured-30?listing_id=listing-123');

  fireEvent.click(screen.getByRole('button', {name:'Continue with my listing'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:/Explore Pro/}));
  expect(screen.getByRole('link', {name:'View Pro membership'})).toHaveAttribute('href','/dashboard/buyermatch/membership');
 });
});
