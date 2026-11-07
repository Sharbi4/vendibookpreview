import { useEffect, useRef, useState } from 'react';
import { ClipboardCheck, MessageCircle, MousePointer2, Share2, ThumbsUp, Users } from 'lucide-react';
import coffeeTruckImg from '@/assets/food-truck-coffee.jpg';
import popcornTruckImg from '@/assets/food-truck-popcorn.jpg';
import cafecitoTrailerImg from '@/assets/trailer-cafecito.jpg';

/**
 * Decorative, illustrative animation for the homepage BuyerMatch band:
 * an assistant scrolls a community feed, finds a "looking to rent" post and
 * drafts a reply with a listing — ending as a draft awaiting seller review.
 * Labelled "Example" and kept brand-neutral: it is not a live social integration.
 * The loop starts when the scene scrolls into view; reduced-motion shows the end state.
 */
const FillerPost = ({ img }: { img: string }) => (
  <div className="bm-post bm-filler">
    <div className="bm-post-head">
      <span className="bm-avatar" />
      <span className="bm-lines"><i /><i /></span>
    </div>
    <img src={img} alt="" loading="lazy" decoding="async" />
  </div>
);

const BuyerMatchFeedScene = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setPlay(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlay(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="bm-scene" data-play={play ? 'true' : 'false'} aria-hidden="true">
      <div className="bm-window">
        <div className="bm-bar">
          <span className="bm-dots"><i /><i /><i /></span>
          <span className="bm-bar-title"><Users /> Local food vendors group</span>
          <span className="bm-example">Example</span>
        </div>
        <div className="bm-viewport">
          <div className="bm-track">
            <FillerPost img={coffeeTruckImg} />
            <FillerPost img={popcornTruckImg} />
            <article className="bm-post bm-target">
              <div className="bm-post-head">
                <span className="bm-avatar bm-avatar-warm" />
                <span className="bm-who"><b>Group member</b><small>2 min</small></span>
              </div>
              <p className="bm-ask">Looking to rent a coffee trailer for weekend markets. Any leads?</p>
              <div className="bm-actions">
                <span><ThumbsUp /> Like</span>
                <span className="bm-reply">
                  <MessageCircle /> Reply
                  <span className="bm-cursor"><MousePointer2 /></span>
                </span>
                <span><Share2 /> Share</span>
              </div>
              <div className="bm-composer">
                <span className="bm-agent"><img src="/brand/vendibook-icon-48.png" alt="" /></span>
                <div className="bm-bubble">
                  <span className="bm-type bm-type-1">Hi! A coffee trailer for rent near</span>
                  <span className="bm-type bm-type-2">you is listed on Vendibook:</span>
                  <div className="bm-attach">
                    <img src={cafecitoTrailerImg} alt="" loading="lazy" decoding="async" />
                    <span><b>Coffee trailer · For rent</b><small>vendibook.com</small></span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
        <div className="bm-status"><ClipboardCheck /> Draft ready for your review</div>
      </div>
    </div>
  );
};

export default BuyerMatchFeedScene;
