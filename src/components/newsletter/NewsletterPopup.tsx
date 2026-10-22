import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UpdateSignupForm } from './UpdateSignupForm';
export default function NewsletterPopup() {
  const { pathname, search } = useLocation();
  const designPreview = import.meta.env.DEV && new URLSearchParams(search).get('previewUpdates') === '1';
  const [teaser, setTeaser] = useState(false);
  const [open, setOpen] = useState(designPreview);
  useEffect(() => {
    if (pathname !== '/' || designPreview) return;
    try {
      if (localStorage.getItem('newsletter_subscribed')) return;
      if (Date.now()-Number(localStorage.getItem('vb.updates.dismissed') || 0)<30*86400000) return;
    } catch { /* Storage may be unavailable. */ }
    const started = Date.now();
    const reveal = () => {
      const total = document.documentElement.scrollHeight-window.innerHeight;
      if (Date.now()-started<12000 || (total>0 && window.scrollY/total<.3)) return;
      if (document.querySelector('[role="dialog"]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
      setTeaser(true); window.removeEventListener('scroll', reveal); clearInterval(timer);
    };
    const timer = window.setInterval(reveal, 3000);
    window.addEventListener('scroll', reveal, { passive:true });
    return () => { clearInterval(timer); window.removeEventListener('scroll',reveal); };
  }, [pathname, designPreview]);
  const dismiss = () => { setTeaser(false); try { localStorage.setItem('vb.updates.dismissed',String(Date.now())); } catch { /* optional */ } };
  if (pathname !== '/') return null;
  return <>
    {teaser && !open && <aside className="vu-teaser" aria-label="Personalized Vendibook updates"><button className="vu-teaser-close" aria-label="Dismiss updates invitation" onClick={dismiss}><X size={16}/></button><img className="vu-teaser-logo" src="/brand/vendibook-logo-email.png" alt="Vendibook"/><h2>Stay ahead of your next move.</h2><p>Local listings, mobile food news, and updates picked for you.</p><button className="vu-primary" onClick={()=>{setOpen(true);dismiss();}}>Personalize my updates <ArrowRight size={16}/></button></aside>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="vu-dialog"><DialogTitle className="sr-only">Personalize your Vendibook updates</DialogTitle><DialogDescription className="sr-only">Choose your role, location, interests, and optional text updates.</DialogDescription><UpdateSignupForm preview={designPreview}/></DialogContent></Dialog>
  </>;
}
