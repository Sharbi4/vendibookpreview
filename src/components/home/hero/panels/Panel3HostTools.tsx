import MockHeroPanel from './MockHeroPanel';
import mock from '@/assets/hero-hosttools-mock.png.asset.json';

const Panel3HostTools = () => (
  <MockHeroPanel
    imageUrl={mock.url}
    alt="More than listings. Built for food truck hosts."
    ctas={[
      { top: 55.5, left: 3.7, width: 36.7, height: 6, href: '/list?utm_source=homepage&utm_medium=hero&utm_content=explore_host_tools', label: 'Explore host tools', event: 'homepage_host_list_click' },
      { top: 62.3, left: 3.7, width: 36.7, height: 5.4, href: '/how-it-works-host', label: 'How hosting works', event: 'homepage_how_it_works_click' },
    ]}
  />
);

export default Panel3HostTools;
