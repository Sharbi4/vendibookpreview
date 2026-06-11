import MockHeroPanel from './MockHeroPanel';
import mock from '@/assets/hero-financing-mock.png.asset.json';

const Panel2Financing = () => (
  <MockHeroPanel
    imageUrl={mock.url}
    alt="Start with the truck before you commit to ownership"
    visibleBottomPx={1424}
    ctas={[
      { top: 80.65, left: 4, width: 92, height: 6.44, href: '/search?financing=true', label: 'Browse eligible listings', event: 'homepage_browse_click' },
      { top: 89.13, left: 4, width: 92, height: 6.44, href: '/how-it-works', label: 'Learn how it works', event: 'homepage_how_it_works_click' },
    ]}
  />
);

export default Panel2Financing;
