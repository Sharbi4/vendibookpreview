import { Link } from 'react-router-dom';
import { Eye, Image as ImageIcon, Megaphone, Pencil, Plus } from 'lucide-react';
import WorkspaceShell from '@/components/v2/WorkspaceShell';
import { useHostListings } from '@/hooks/useHostListings';
import { Button } from '@/components/ui/button';

const money = (value: number | null | undefined) => value == null ? 'Price not set' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export default function ListingsV2() {
  const { listings, isLoading, stats } = useHostListings();
  return <WorkspaceShell><div className="v2-page-stack">
    <header className="v2-page-heading v2-heading-action"><div><p className="v2-eyebrow">Inventory</p><h1>Listings</h1><p>{stats.published} live · {stats.drafts} drafts · {stats.paused} paused</p></div><Button asChild variant="secondary"><Link to="/list"><Plus />New listing</Link></Button></header>
    {isLoading ? <div className="v2-empty">Loading your listings…</div> : listings.length === 0 ? <div className="v2-empty v2-card"><h2>Start your first listing</h2><p>List a truck, trailer, mobile kitchen, equipment, or vendor space.</p><Button asChild variant="secondary"><Link to="/list">Create a listing</Link></Button></div> : <div className="v2-listing-grid">{listings.map((listing) => {
      const price = listing.mode === 'sale' ? money(listing.price_sale) : `${money(listing.price_daily)}/day`;
      return <article className="v2-listing-card" key={listing.id}>
        <div className="v2-listing-image">{listing.cover_image_url ? <img src={listing.cover_image_url} alt={listing.title} loading="lazy" /> : <ImageIcon aria-label="No listing image" />}<span className="v2-listing-status">{listing.status}</span></div>
        <div className="v2-listing-body"><div><h2>{listing.title}</h2><p>{listing.city}{listing.state ? `, ${listing.state}` : ''}</p></div><strong className="v2-price">{price}</strong><div className="v2-listing-stats"><span>{listing.view_count ?? 0} views</span></div>
          <div className="v2-listing-actions"><Button asChild variant="outline" size="sm"><Link to={`/edit-listing/${listing.id}`}><Pencil />Edit</Link></Button><Button asChild variant="ghost" size="sm"><Link to={`/host/listings?boost=${listing.id}`}><Megaphone />Promote</Link></Button><Button asChild variant="ghost" size="sm"><Link to={`/listing/${listing.id}`}><Eye />Preview</Link></Button></div>
        </div>
      </article>;
    })}</div>}
  </div></WorkspaceShell>;
}