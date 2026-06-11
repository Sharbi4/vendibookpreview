import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Maps share source slug → { source label, default campaign }
const SOURCE_MAP: Record<string, { source: string; campaign: string }> = {
  linkedin: { source: 'linkedin', campaign: 'food_truck_fleet_owner_article' },
};

const BlogShareRedirect = () => {
  const { source = 'linkedin', slug = '' } = useParams<{ source: string; slug: string }>();

  useEffect(() => {
    const config = SOURCE_MAP[source] ?? { source, campaign: slug };

    const destination = `https://vendibook.com/blog/${slug}` +
      `?utm_source=${encodeURIComponent(config.source)}` +
      `&utm_medium=social` +
      `&utm_campaign=${encodeURIComponent(config.campaign)}` +
      `&utm_content=founder_post`;

    const urlParams = new URLSearchParams(window.location.search);

    // Fire-and-forget log, then redirect
    (async () => {
      try {
        await supabase.from('blog_share_clicks').insert({
          article_slug: slug,
          source: config.source,
          campaign: config.campaign,
          destination_url: destination,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          utm_source: urlParams.get('utm_source'),
          utm_medium: urlParams.get('utm_medium'),
          utm_campaign: urlParams.get('utm_campaign'),
          utm_content: urlParams.get('utm_content'),
        });
      } catch (e) {
        console.warn('[BlogShareRedirect] log failed', e);
      }
      window.location.replace(destination);
    })();
  }, [source, slug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Redirecting…
    </div>
  );
};

export default BlogShareRedirect;
