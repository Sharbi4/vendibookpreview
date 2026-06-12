import SellerLandingPage from '@/components/sell/SellerLandingPage';

const SellFoodTruck = () => (
  <SellerLandingPage
    asset="food truck"
    assetPlural="food trucks"
    path="/sell-food-truck"
    title="Sell Your Food Truck or Trailer Online | Vendibook"
    description="List your food truck, food trailer, concession trailer, or mobile kitchen for free on Vendibook. Reach buyers, receive offers, chat with prospects, and use optional secure transaction tools."
    h1="Sell Your Food Truck or Trailer on Vendibook"
    subheadline="List your mobile kitchen for free, reach serious buyers, receive offers, chat with prospects, and use optional secure transaction tools when you are ready to sell."
    primaryCtaLabel="List Your Food Truck Free"
    secondaryCtaHref="/food-trucks-for-sale"
    secondaryCtaLabel="Browse Food Trucks for Sale"
    rentBrowseHref="/food-trucks-for-rent"
  />
);

export default SellFoodTruck;
