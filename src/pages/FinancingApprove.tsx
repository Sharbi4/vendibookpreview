import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';
import { ApproveFinancingLogo } from '@/components/brand/ProviderLogos';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function FinancingApprove() {
  return <><Header/><main className="mx-auto max-w-3xl px-6 py-20"><ApproveFinancingLogo className="h-10 w-auto"/><h1 className="mt-8 text-4xl font-semibold">Explore financing with APPROVE</h1><p className="mt-6 text-lg leading-8 text-muted-foreground">Continue to Vendibook’s dedicated APPROVE financing page to explore options from its lender network. Lenders determine approval, rates and terms. Vendibook is not a lender.</p><a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer" className="mt-8 inline-block rounded-full bg-orange-600 px-7 py-4 font-semibold text-white shadow-lg">Continue to APPROVE</a></main><Footer/></>;
}
