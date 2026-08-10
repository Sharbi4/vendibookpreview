import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getBlogPostBySlug } from '@/data/blogPosts';

// Supported share networks. Unknown sources fall back safely to the raw value.
const SUPPORTED_SOURCES = ['x', 'linkedin', 'facebook', 'sms'] as const;

// Channel medium per source. SMS shares are messaging, not social.
const SOURCE_MEDIUM: Record<string, string> = {
  x: 'social',
  linkedin: 'social',
  facebook: 'social',
  sms: 'sms',
};

// Legacy default campaign for older shared links that predate per-post campaigns.
const LEGACY_DEFAULT_CAMPAIGN = 'food_truck_fleet_owner_article';

const BlogShareRedirect = () => {
  const { source = 'linkedin', slug = '' } = useParams<{ source: string; slug: string }>();

  useEffect(() => {
    const network = (SUPPORTED_SOURCES as readonly string[]).includes(source) ? source : source || 'link';

    const post = slug ? getBlogPostBySlug(slug) : undefined;
    const campaign = post?.campaign || (post ? post.slug : LEGACY_DEFAULT_CAMPAIGN);
    const medium = SOURCE_MEDIUM[network] || 'referral';
    const urlParams = new URLSearchParams(window.location.search);

    // Allow the share link to carry its own content tag (e.g. ?c=sms_blast_aug).
    const contentOverride = urlParams.get('utm_content') || urlParams.get('c');
    const defaultContent = network === 'sms'
      ? 'sms_share'
      : post?.campaign
        ? 'shared_article'
        : 'founder_post';
    const utmContent = contentOverride || defaultContent;

    const destination = `https://vendibook.com/blog/${slug}` +
      `?utm_source=${encodeURIComponent(network)}` +
      `&utm_medium=${encodeURIComponent(medium)}` +
      `&utm_campaign=${encodeURIComponent(campaign)}` +
      `&utm_content=${encodeURIComponent(utmContent)}`;

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
