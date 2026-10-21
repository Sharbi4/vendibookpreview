import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SharePreviewCard from '@/components/share/SharePreviewCard';
afterEach(cleanup);
describe('listing photo preview', () => {
 it('keeps every photo and preview link scoped to its listing and deduplicates the cover', () => {
  render(<SharePreviewCard title="Truck A" imageUrl="/truck-a.jpg" imageUrls={['/truck-a.jpg','/interior-a.jpg']} previewUrl="https://vendibook.com/listing/a" shareUrl="https://vendibook.com/share/listing/a" checks={[]} running={false} verified={false} blocked={false} onRecheck={()=>{}} />);
  expect(screen.getByRole('link',{name:'Preview listing'})).toHaveAttribute('href','https://vendibook.com/listing/a');
  expect(screen.getByAltText('Truck A — photo 2')).toHaveAttribute('src','/interior-a.jpg');
  expect(screen.queryByAltText('Truck A — photo 3')).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:'View Truck A, photo 2'})).toHaveAttribute('href','https://vendibook.com/listing/a');
 });
 it('shows an available listing photo when there is no cover image', () => {
  render(<SharePreviewCard title="Kitchen B" imageUrls={['/kitchen-b.jpg']} shareUrl="https://vendibook.com/share/listing/b" checks={[]} running={false} verified={false} blocked={false} onRecheck={()=>{}} />);
  expect(screen.getByAltText('Kitchen B')).toHaveAttribute('src','/kitchen-b.jpg');
  expect(screen.getByRole('link',{name:'Preview listing'})).toHaveAttribute('href','https://vendibook.com/share/listing/b');
 });
});
