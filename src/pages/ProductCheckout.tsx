import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SEO from '@/components/SEO';
import SquareBillingCheckout from '@/components/checkout/SquareBillingCheckout';
export default function ProductCheckout() {
  const {slug=''}=useParams();const [params]=useSearchParams();const navigate=useNavigate();
  return <main className="sale-light min-h-screen bg-[#f8f6f2] px-4 py-6">
    <SEO title="Secure checkout | Vendibook" noindex />
    <SquareBillingCheckout slug={slug} listingId={params.get('listing_id')||undefined} consentId={params.get('consent_id')||undefined} interval={params.get('interval')||undefined} onClose={()=>navigate('/dashboard')}/>
  </main>;
}
