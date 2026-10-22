import { UpdateSignupForm } from '@/components/newsletter/UpdateSignupForm';
import SEO from '@/components/SEO';
export default function Subscribe() {
  return <main className="min-h-screen bg-[#f4eee4] px-4 py-14"><SEO title="Your Vendibook updates | Vendibook" description="Choose local listings, industry news, and regulatory updates for your next move."/><div className="mx-auto max-w-md shadow-xl rounded-3xl"><UpdateSignupForm source="subscribe_page"/></div></main>;
}
