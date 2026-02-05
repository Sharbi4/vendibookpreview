import { CitySupplyPage } from '@/components/city/CitySupplyPage';
import { CityDemandPage } from '@/components/city/CityDemandPage';
import { CITY_DATA, ASSET_TYPES } from '@/data/cityData';

// Houston pages
export const HoustonList = () => <CitySupplyPage city={CITY_DATA.houston} />;
export const HoustonBrowse = () => <CityDemandPage city={CITY_DATA.houston} />;
export const HoustonListFoodTruck = () => <CitySupplyPage city={CITY_DATA.houston} assetType="food-truck" />;
export const HoustonListFoodTrailer = () => <CitySupplyPage city={CITY_DATA.houston} assetType="food-trailer" />;
export const HoustonListVendorSpace = () => <CitySupplyPage city={CITY_DATA.houston} assetType="vendor-space" />;

// Los Angeles pages
export const LosAngelesList = () => <CitySupplyPage city={CITY_DATA['los-angeles']} />;
export const LosAngelesBrowse = () => <CityDemandPage city={CITY_DATA['los-angeles']} />;
export const LosAngelesListFoodTruck = () => <CitySupplyPage city={CITY_DATA['los-angeles']} assetType="food-truck" />;
export const LosAngelesListFoodTrailer = () => <CitySupplyPage city={CITY_DATA['los-angeles']} assetType="food-trailer" />;
export const LosAngelesListVendorSpace = () => <CitySupplyPage city={CITY_DATA['los-angeles']} assetType="vendor-space" />;

// Dallas pages
export const DallasList = () => <CitySupplyPage city={CITY_DATA.dallas} />;
export const DallasBrowse = () => <CityDemandPage city={CITY_DATA.dallas} />;
export const DallasListFoodTruck = () => <CitySupplyPage city={CITY_DATA.dallas} assetType="food-truck" />;
export const DallasListFoodTrailer = () => <CitySupplyPage city={CITY_DATA.dallas} assetType="food-trailer" />;
export const DallasListVendorSpace = () => <CitySupplyPage city={CITY_DATA.dallas} assetType="vendor-space" />;

// Phoenix pages
export const PhoenixList = () => <CitySupplyPage city={CITY_DATA.phoenix} />;
export const PhoenixBrowse = () => <CityDemandPage city={CITY_DATA.phoenix} />;
export const PhoenixListFoodTruck = () => <CitySupplyPage city={CITY_DATA.phoenix} assetType="food-truck" />;
export const PhoenixListFoodTrailer = () => <CitySupplyPage city={CITY_DATA.phoenix} assetType="food-trailer" />;
export const PhoenixListVendorSpace = () => <CitySupplyPage city={CITY_DATA.phoenix} assetType="vendor-space" />;
