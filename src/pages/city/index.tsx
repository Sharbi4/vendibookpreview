import { CitySupplyPage } from '@/components/city/CitySupplyPage';
import { CityDemandPage } from '@/components/city/CityDemandPage';
import { CITY_DATA, ASSET_TYPES } from '@/data/cityData';

// Houston pages
export const HoustonList = () => <CitySupplyPage city={CITY_DATA.houston} />;
export const HoustonBrowse = () => <CityDemandPage city={CITY_DATA.houston} />;
export const HoustonListFoodTruck = () => <CitySupplyPage city={CITY_DATA.houston} assetType="food-truck" />;
export const HoustonListFoodTrailer = () => <CitySupplyPage city={CITY_DATA.houston} assetType="food-trailer" />;
export const HoustonListVendorLot = () => <CitySupplyPage city={CITY_DATA.houston} assetType="vendor-lot" />;

// Los Angeles pages
export const LosAngelesList = () => <CitySupplyPage city={CITY_DATA['los-angeles']} />;
export const LosAngelesBrowse = () => <CityDemandPage city={CITY_DATA['los-angeles']} />;
export const LosAngelesListFoodTruck = () => <CitySupplyPage city={CITY_DATA['los-angeles']} assetType="food-truck" />;
export const LosAngelesListFoodTrailer = () => <CitySupplyPage city={CITY_DATA['los-angeles']} assetType="food-trailer" />;
export const LosAngelesListVendorLot = () => <CitySupplyPage city={CITY_DATA['los-angeles']} assetType="vendor-lot" />;

// Dallas pages
export const DallasList = () => <CitySupplyPage city={CITY_DATA.dallas} />;
export const DallasBrowse = () => <CityDemandPage city={CITY_DATA.dallas} />;
export const DallasListFoodTruck = () => <CitySupplyPage city={CITY_DATA.dallas} assetType="food-truck" />;
export const DallasListFoodTrailer = () => <CitySupplyPage city={CITY_DATA.dallas} assetType="food-trailer" />;
export const DallasListVendorLot = () => <CitySupplyPage city={CITY_DATA.dallas} assetType="vendor-lot" />;

// Phoenix pages
export const PhoenixList = () => <CitySupplyPage city={CITY_DATA.phoenix} />;
export const PhoenixBrowse = () => <CityDemandPage city={CITY_DATA.phoenix} />;
export const PhoenixListFoodTruck = () => <CitySupplyPage city={CITY_DATA.phoenix} assetType="food-truck" />;
export const PhoenixListFoodTrailer = () => <CitySupplyPage city={CITY_DATA.phoenix} assetType="food-trailer" />;
export const PhoenixListVendorLot = () => <CitySupplyPage city={CITY_DATA.phoenix} assetType="vendor-lot" />;
