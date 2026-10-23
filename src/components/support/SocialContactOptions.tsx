import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { isAtlasEnabled, startAtlas } from '@/lib/atlas/atlasFlag';

export default function SocialContactOptions() {
  if (!isAtlasEnabled()) return <Button size="lg" asChild><Link to="/atlas">Meet Atlas</Link></Button>;
  return <div className="flex justify-center"><Button size="lg" className="h-auto gap-4 rounded-2xl px-8 py-5 text-left" onClick={() => startAtlas({ mode: 'text' })}>
    <MessageCircle className="h-7 w-7" aria-hidden="true" /><span><span className="block text-lg font-bold">Chat with Atlas</span><span className="block text-sm font-normal opacity-80">Vendibook AI assistant · Type or talk</span></span>
  </Button></div>;
}
