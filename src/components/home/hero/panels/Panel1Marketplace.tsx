import MockHeroPanel from './MockHeroPanel';
import mock from '@/assets/hero-marketplace-mock.png.asset.json';

const Panel1Marketplace = () => (
  <MockHeroPanel
    imageUrl={mock.url}
    alt="Find, rent, buy, or sell food trucks and food trailers"
    ctas={[
      { top: 57.1, left: 3, width: 94, height: 6.5, href: '/search?category=food_truck%2Cfood_trailer', label: 'Search trucks or trailers', event: 'homepage_browse_click' },
      { top: 66.3, left: 51, width: 23, height: 1.8, href: '/list?utm_source=homepage&utm_medium=hero&utm_content=list_it_free_text', label: 'List it free', event: 'homepage_host_list_click' },
      { top: 70.2, left: 4, width: 92, height: 5.4, href: '/auth?mode=signup&utm_source=homepage&utm_medium=hero&utm_content=mobile_signup_button', label: 'Sign up free', event: 'homepage_primary_cta_click' },
      { top: 76.7, left: 4, width: 92, height: 5.4, href: '/search?category=food_truck%2Cfood_trailer', label: 'Browse trucks and trailers', event: 'homepage_browse_click' },
    ]}
  />
);

export default Panel1Marketplace;
