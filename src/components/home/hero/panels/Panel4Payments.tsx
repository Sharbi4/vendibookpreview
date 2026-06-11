import MockHeroPanel from './MockHeroPanel';
import mock from '@/assets/hero-payments-mock.png.asset.json';

const Panel4Payments = () => (
  <MockHeroPanel
    imageUrl={mock.url}
    alt="Accept payments with more confidence"
    visibleTopPx={150}
    visibleBottomPx={1461}
    ctas={[
      { top: 86.97, left: 4, width: 92, height: 5.04, href: '/how-it-works', label: 'Learn more about payments', event: 'homepage_how_it_works_click' },
      { top: 93.06, left: 4, width: 92, height: 5.04, href: '/search?category=food_truck%2Cfood_trailer', label: 'Browse listings', event: 'homepage_browse_click' },
    ]}
  />
);

export default Panel4Payments;
