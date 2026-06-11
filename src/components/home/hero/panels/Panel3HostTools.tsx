import MockHeroPanel from './MockHeroPanel';
import mock from '@/assets/hero-hosttools-mock.png.asset.json';

const Panel3HostTools = () => (
  <MockHeroPanel
    imageUrl={mock.url}
    alt="More than listings. Built for food truck hosts."
    visibleBottomPx={1297}
    ctas={[
      { top: 73.49, left: 3.7, width: 36.7, height: 7.94, href: '/tools?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=explore_host_tools', label: 'Explore host tools', event: 'homepage_host_list_click' },
      { top: 82.49, left: 3.7, width: 36.7, height: 7.15, href: '/how-it-works-host?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=how_hosting_works', label: 'How hosting works', event: 'homepage_how_it_works_click' },
    ]}
  />
);

export default Panel3HostTools;
