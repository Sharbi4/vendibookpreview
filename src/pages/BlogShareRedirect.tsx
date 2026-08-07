import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getBlogPostBySlug } from '@/data/blogPosts';

// Supported share networks. Unknown sources fall back safely to the raw value.
const SUPPORTED_SOURCES = ['x', 'linkedin', 'facebook'] as const;

// Legacy default campaign for older shared links that predate per-post campaigns.
const LEGACY_DEFAULT_CAMPAIGN = 'food_truck_fleet_owner_article';

const BlogShareRedirect = () => {
  const { source = 'linkedin', slug = '' } = useParams<{ source: string; slug: string }>();

  useEffect(() => {
    const network = (SUPPORTED_SOURCES as readonly string[]).includes(source) ? source : source || 'link';

    const post = slug ? getBlogPostBySlug(slug) : undefined;
    const campaign = post?.campaign || (post ? post.slug : LEGACY_DEFAULT_CAMPAIGN);
    const utmContent = post?.campaign ? 'shared_article' : 'founder_post';

    const destination = `https://vendibook.com/blog/${slug}` +
      `?utm_source=${encodeURIComponent(network)}` +
      `&utm_medium=social` +
      `&utm_campaign=${encodeURIComponent(campaign)}` +
      `&utm_content=${utmContent}`;

    const urlParams = new URLSearchParams(window.location.search);

    // Fire-and-forget log, then redirect
    (async () => {
      try {
        await supabase.from('blog_share_clicks').insert({
          article_slug: slug,
          source: network,
          campaign,
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
