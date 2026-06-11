import MockHeroPanel from './MockHeroPanel';
import mock from '@/assets/hero-financing-mock.png.asset.json';

const Panel2Financing = () => (
  <MockHeroPanel
    imageUrl={mock.url}
    alt="Start with the truck before you commit to ownership"
    visibleBottomPx={1424}
    ctas={[
      // TODO: add a real financing/payment-options filter to the Search page.
      // Until then route to browse-all with UTM so the click still converts.
      { top: 80.65, left: 4, width: 92, height: 6.44, href: '/search?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=browse_eligible_listings', label: 'Browse eligible listings', event: 'homepage_browse_click' },
      { top: 89.13, left: 4, width: 92, height: 6.44, href: '/how-it-works?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=learn_how_it_works', label: 'Learn how it works', event: 'homepage_how_it_works_click' },
    ]}
  />
);

export default Panel2Financing;
