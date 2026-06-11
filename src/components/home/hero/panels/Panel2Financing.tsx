import MockHeroPanel from './MockHeroPanel';
import mock from '@/assets/hero-financing-mock.png.asset.json';

const Panel2Financing = () => (
  <MockHeroPanel
    imageUrl={mock.url}
    alt="Start with the truck before you commit to ownership"
    ctas={[
      { top: 67.6, left: 4, width: 92, height: 5.4, href: '/search?financing=true', label: 'Browse eligible listings', event: 'homepage_browse_click' },
      { top: 74.7, left: 4, width: 92, height: 5.4, href: '/how-it-works', label: 'Learn how it works', event: 'homepage_how_it_works_click' },
    ]}
  />
);

export default Panel2Financing;
