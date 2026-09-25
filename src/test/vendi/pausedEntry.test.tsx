import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import ListWithVendi from '@/pages/ListWithVendi';
import ListingStart from '@/pages/ListingStart';
import { useLocation } from 'react-router-dom';
afterEach(cleanup);
function Destination() { const l=useLocation(); return <div data-testid="destination">{l.pathname}{l.search}</div>; }
it.each([
 ['/list-with-vendi?mode=sale', '/list/start?mode=sale'],
 ['/list-with-vendi?listing=draft-123', '/create-listing/draft-123'],
 ['/list?mode=rent', '/list/start?mode=rent'],
])('redirects %s to the wizard without losing context', (from,to)=>{
 render(<MemoryRouter initialEntries={[from]}><Routes><Route path="/list-with-vendi" element={<ListWithVendi/>}/><Route path="/list" element={<ListingStart/>}/><Route path="*" element={<Destination/>}/></Routes></MemoryRouter>);
 expect(screen.getByTestId('destination').textContent).toBe(to);
});
