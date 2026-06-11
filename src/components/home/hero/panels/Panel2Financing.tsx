import MockHeroPanel from './MockHeroPanel';
import mock from '@/assets/hero-financing-mock.png.asset.json';

const Panel2Financing = () => (
  <MockHeroPanel
    imageUrl={mock.url}
    alt="Start with the truck before you commit to ownership"
    visibleTopPx={150}
    visibleBottomPx={1424}
    ctas={[
      // TODO: add a real financing/payment-options filter to the Search page.
      // Until then route to browse-all with UTM so the click still converts.
      { top: 82.55, left: 4, width: 92, height: 5.81, href: '/search?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=browse_eligible_listings', label: 'Browse eligible listings', event: 'homepage_browse_click' },
      { top: 90.20, left: 4, width: 92, height: 5.81, href: '/how-it-works?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=learn_how_it_works', label: 'Learn how it works', event: 'homepage_how_it_works_click' },
    ]}
  />
);

export default Panel2Financing;
