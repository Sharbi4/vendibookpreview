import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";

// Redirects /listings/:id (plural) to the canonical /listing/:id, preserving querystring + hash
const ListingPluralRedirect = () => {
  const { id } = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={`/listing/${id}${search}${hash}`} replace />;
};
import { AuthProvider } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import ScrollToTop from "@/components/ScrollToTop";

import PageTransition from "@/components/PageTransition";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePageTracking } from "@/hooks/usePageTracking";
import { usePendingMessage } from "@/hooks/usePendingMessage";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import GoogleOneTap from "@/components/auth/GoogleOneTap";

import MobileBottomNav from "@/components/layout/MobileBottomNav";
import OfflineBanner from "@/components/system/OfflineBanner";
import { useOfflineQueueSync } from "@/hooks/useOfflineQueue";
import { ReferralCapture } from "@/components/referrals/ReferralCapture";
const LiveActivityFeed = lazy(() => import("@/components/social-proof/LiveActivityFeed").then(m => ({ default: m.LiveActivityFeed })));
import { toast } from "sonner";


// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Activation = lazy(() => import("./pages/Activation"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const EditListing = lazy(() => import("./pages/EditListing"));
const ListPage = lazy(() => import("./pages/List"));
const AIListingCreator = lazy(() => import("./pages/AIListingCreator"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Account = lazy(() => import("./pages/Account"));
const Favorites = lazy(() => import("./pages/Favorites"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Insurance = lazy(() => import("./pages/Insurance"));
const Search = lazy(() => import("./pages/Search"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Contact = lazy(() => import("./pages/Contact"));
const IdentityVerification = lazy(() => import("./pages/IdentityVerification"));
const VerificationComplete = lazy(() => import("./pages/VerificationComplete"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const Messages = lazy(() => import("./pages/Messages"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminMetrics = lazy(() => import("./pages/AdminMetrics"));
const AdminListings = lazy(() => import("./pages/AdminListings"));
const AdminRisk = lazy(() => import("./pages/AdminRisk"));
const AdminFinance = lazy(() => import("./pages/AdminFinance"));
const AdminDigest = lazy(() => import("./pages/AdminDigest"));
const AdminOrchestration = lazy(() => import("./pages/AdminOrchestration"));
const AdminErrors = lazy(() => import("./pages/AdminErrors"));
const AdminQA = lazy(() => import("./pages/AdminQA"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const HelpArticle = lazy(() => import("./pages/HelpArticle"));
const CaliforniaPrivacy = lazy(() => import("./pages/CaliforniaPrivacy"));
const ToolsIndex = lazy(() => import("./pages/tools/Index"));
const PricePilot = lazy(() => import("./pages/tools/PricePilot"));
const PermitPath = lazy(() => import("./pages/tools/PermitPath"));
const BuildKit = lazy(() => import("./pages/tools/BuildKit"));
const ListingStudio = lazy(() => import("./pages/tools/ListingStudio"));
const ConceptLab = lazy(() => import("./pages/tools/ConceptLab"));
const MarketRadar = lazy(() => import("./pages/tools/MarketRadar"));
const MarketingStudio = lazy(() => import("./pages/tools/MarketingStudio"));
const StartupGuide = lazy(() => import("./pages/tools/StartupGuide"));
const FoodTruckStartupCosts2026 = lazy(() => import("./pages/tools/FoodTruckStartupCosts2026"));
const RegulationsHub = lazy(() => import("./pages/tools/RegulationsHub"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Transactions = lazy(() => import("./pages/Transactions"));

const Install = lazy(() => import("./pages/Install"));
const VendorLots = lazy(() => import("./pages/VendorLots"));
const Wanted = lazy(() => import("./pages/Wanted"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const EmailUnsubscribe = lazy(() => import("./pages/EmailUnsubscribe"));
const Feedback = lazy(() => import("./pages/Feedback"));
const VendiAISuite = lazy(() => import("./pages/VendiAISuite"));
const Browse = lazy(() => import("./pages/Browse"));
const SellMyFoodTruck = lazy(() => import("./pages/SellMyFoodTruck"));
const SellFoodTruck = lazy(() => import("./pages/sell/SellFoodTruck"));
const SellFoodTrailer = lazy(() => import("./pages/sell/SellFoodTrailer"));
const SellConcessionTrailer = lazy(() => import("./pages/sell/SellConcessionTrailer"));
const RentMyCommercialKitchen = lazy(() => import("./pages/RentMyCommercialKitchen"));
const WhatIsVendibook = lazy(() => import("./pages/seo/WhatIsVendibook"));
const WhyListOnVendibook = lazy(() => import("./pages/seo/WhyListOnVendibook"));
const BestPlaceToSellAFoodTruck = lazy(() => import("./pages/seo/BestPlaceToSellAFoodTruck"));
const ListFoodTruckForSale = lazy(() => import("./pages/seo/ListFoodTruckForSale"));
const RentOutMyFoodTruck = lazy(() => import("./pages/seo/RentOutMyFoodTruck"));
const MobileFoodMarketplaceGlossary = lazy(() => import("./pages/resources/MobileFoodMarketplaceGlossary"));
const FoodTruckSellingFaq = lazy(() => import("./pages/resources/FoodTruckSellingFaq"));
const PricingCalculator = lazy(() => import("./pages/PricingCalculator"));
const KitchenEarningsCalculator = lazy(() => import("./pages/KitchenEarningsCalculator"));
const ListingPublished = lazy(() => import("./pages/ListingPublished"));
const Cities = lazy(() => import("./pages/Cities"));
const SaleCheckout = lazy(() => import("./pages/SaleCheckout"));
const BookingCheckout = lazy(() => import("./pages/BookingCheckout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BlogCategory = lazy(() => import("./pages/BlogCategory"));
const DynamicCityPage = lazy(() => import("./pages/DynamicCityPage"));
const Payments = lazy(() => import("./pages/Payments"));
const Rentals = lazy(() => import("./pages/Rentals"));
const EnterpriseOnboarding = lazy(() => import("./pages/EnterpriseOnboarding"));
const HostBookings = lazy(() => import("./pages/HostBookings"));
const HostListings = lazy(() => import("./pages/HostListings"));
const HostReporting = lazy(() => import("./pages/HostReporting"));
const HostAnalytics = lazy(() => import("./pages/HostAnalytics"));
const HowItWorksHost = lazy(() => import("./pages/HowItWorksHost"));
const HowItWorksSeller = lazy(() => import("./pages/HowItWorksSeller"));
const BecomeAHost = lazy(() => import("./pages/BecomeAHost"));
const SignageRequest = lazy(() => import("./pages/SignageRequest"));

const StartFoodBusiness = lazy(() => import("./pages/StartFoodBusiness"));
const Homepage2 = lazy(() => import("./pages/Homepage2"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const ReferralDashboard = lazy(() => import("./pages/ReferralDashboard"));
const ReferralTerms = lazy(() => import("./pages/ReferralTerms"));
const ReferralAdmin = lazy(() => import("./pages/ReferralAdmin"));
const RHandler = lazy(() => import("./pages/RHandler"));
const AdminEmailDashboard = lazy(() => import("./pages/AdminEmailDashboard"));
const AdminCampaignNewExitPlan = lazy(() => import("./pages/AdminCampaignNewExitPlan"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const EmailFeedbackThanks = lazy(() => import("./pages/EmailFeedbackThanks"));
const CategoryCityPage = lazy(() => import("./pages/CategoryCityPage"));
const CategoryIndex = lazy(() => import("./pages/CategoryIndex"));
const BlogShareRedirect = lazy(() => import("./pages/BlogShareRedirect"));
import { CATEGORY_INDEX_CONFIGS } from "./data/categoryIndexConfigs";
import { CITY_CATEGORY_CONFIGS } from "./data/cityCategoryConfigs";

// City landing pages - direct imports since they're lightweight wrappers
import {
  HoustonList,
  HoustonBrowse,
  HoustonListFoodTruck,
  HoustonListFoodTrailer,
  HoustonListVendorSpace,
  LosAngelesList,
  LosAngelesBrowse,
  LosAngelesListFoodTruck,
  LosAngelesListFoodTrailer,
  LosAngelesListVendorSpace,
  DallasList,
  DallasBrowse,
  DallasListFoodTruck,
  DallasListFoodTrailer,
  DallasListVendorSpace,
  PhoenixList,
  PhoenixBrowse,
  PhoenixListFoodTruck,
  PhoenixListFoodTrailer,
  PhoenixListVendorSpace,
} from "./pages/city";

const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Share redirect: pretty URL → actual listing page
const ShareRedirect = () => {
  const params = new URLSearchParams();
  const pathParts = window.location.pathname.split('/');
  const listingId = pathParts[pathParts.length - 1];
  return <Navigate to={`/listing/${listingId}`} replace />;
};

// Animated Routes wrapper component
const AnimatedRoutes = () => {
  const location = useLocation();

  // Track page views with Google Analytics
  usePageTracking();

  // Process any pending messages after sign-in
  usePendingMessage();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<PageLoader />} key={location.pathname}>
        <ReferralCapture />
        <Routes location={location}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/browse" element={<PageTransition><Browse /></PageTransition>} />
          <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/activation" element={<PageTransition><Activation /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/host/bookings" element={<PageTransition><HostBookings /></PageTransition>} />
          <Route path="/host/listings" element={<PageTransition><HostListings /></PageTransition>} />
          <Route path="/host/reporting" element={<PageTransition><HostReporting /></PageTransition>} />
          <Route path="/host/analytics" element={<PageTransition><HostAnalytics /></PageTransition>} />
          <Route path="/create-listing" element={<Navigate to="/list" replace />} />
          <Route path="/host" element={<Navigate to="/list" replace />} />
          <Route path="/listing/:id" element={<PageTransition><ListingDetail /></PageTransition>} />
          {/* Common typo/plural alias — redirect to canonical singular route */}
          <Route path="/listings/:id" element={<ListingPluralRedirect />} />
          {/* Share route: pretty URL for social sharing, redirects to /listing/:id */}
          <Route path="/share/listing/:id" element={<ShareRedirect />} />
          <Route path="/share/:source/:slug" element={<BlogShareRedirect />} />
          {/* Profile routes */}
          <Route path="/profile" element={<Navigate to="/account" replace />} />
          <Route path="/profile/edit" element={<Navigate to="/account" replace />} />
          <Route path="/settings" element={<Navigate to="/account" replace />} />
          <Route path="/profile/:id" element={<Navigate to={`/u/${window.location.pathname.split('/').pop()}`} replace />} />
          {/* Private account route - owner only */}
          <Route path="/account" element={<PageTransition><Account /></PageTransition>} />
          <Route path="/favorites" element={<PageTransition><Favorites /></PageTransition>} />
          <Route path="/account/profile" element={<Navigate to="/account" replace />} />
          {/* Public profile route - accessible to all */}
          <Route path="/u/:userId" element={<PageTransition><PublicProfile /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/insurance" element={<PageTransition><Insurance /></PageTransition>} />
          <Route path="/how-it-works" element={<PageTransition><HowItWorks /></PageTransition>} />
          <Route path="/how-it-works-host" element={<PageTransition><HowItWorksHost /></PageTransition>} />
          <Route path="/how-it-works-seller" element={<PageTransition><HowItWorksSeller /></PageTransition>} />
          <Route path="/become-a-host" element={<PageTransition><BecomeAHost /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/verify-identity" element={<PageTransition><IdentityVerification /></PageTransition>} />
          <Route path="/verification-complete" element={<PageTransition><VerificationComplete /></PageTransition>} />
          <Route path="/payment-success" element={<PageTransition><PaymentSuccess /></PageTransition>} />
          <Route path="/payment-cancelled" element={<PageTransition><PaymentCancelled /></PageTransition>} />
          <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
          <Route path="/messages/:conversationId" element={<PageTransition><Messages /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
          <Route path="/admin/metrics" element={<PageTransition><AdminMetrics /></PageTransition>} />
          <Route path="/admin/listings" element={<PageTransition><AdminListings /></PageTransition>} />
          <Route path="/admin/risk" element={<PageTransition><AdminRisk /></PageTransition>} />
          <Route path="/admin/finance" element={<PageTransition><AdminFinance /></PageTransition>} />
          <Route path="/admin/digest" element={<PageTransition><AdminDigest /></PageTransition>} />
          <Route path="/admin/orchestration" element={<PageTransition><AdminOrchestration /></PageTransition>} />
          <Route path="/admin/errors" element={<PageTransition><AdminErrors /></PageTransition>} />
          <Route path="/admin/qa" element={<PageTransition><AdminQA /></PageTransition>} />
          <Route path="/admin/email/dashboard" element={<PageTransition><AdminEmailDashboard /></PageTransition>} />
          <Route path="/admin/campaigns/new-exit-plan" element={<PageTransition><AdminCampaignNewExitPlan /></PageTransition>} />
          <Route path="/email/thanks" element={<PageTransition><EmailFeedbackThanks /></PageTransition>} />
          <Route path="/notification-preferences" element={<PageTransition><NotificationPreferences /></PageTransition>} />
          <Route path="/help" element={<PageTransition><HelpCenter /></PageTransition>} />
          <Route path="/help/:slug" element={<PageTransition><HelpArticle /></PageTransition>} />
          <Route path="/california-privacy" element={<PageTransition><CaliforniaPrivacy /></PageTransition>} />
          
          {/* Tools - /tools is the canonical hub */}
          <Route path="/tools" element={<PageTransition><ToolsIndex /></PageTransition>} />
          <Route path="/tools/pricepilot" element={<PageTransition><PricePilot /></PageTransition>} />
          <Route path="/tools/permitpath" element={<PageTransition><PermitPath /></PageTransition>} />
          <Route path="/tools/buildkit" element={<PageTransition><BuildKit /></PageTransition>} />
          <Route path="/tools/listing-studio" element={<PageTransition><ListingStudio /></PageTransition>} />
          <Route path="/tools/concept-lab" element={<PageTransition><ConceptLab /></PageTransition>} />
          <Route path="/tools/market-radar" element={<PageTransition><MarketRadar /></PageTransition>} />
          <Route path="/tools/marketing-studio" element={<PageTransition><MarketingStudio /></PageTransition>} />
          <Route path="/tools/startup-guide" element={<PageTransition><StartupGuide /></PageTransition>} />
          <Route path="/tools/food-truck-startup-costs-2026" element={<PageTransition><FoodTruckStartupCosts2026 /></PageTransition>} />
          <Route path="/tools/regulations-hub" element={<PageTransition><RegulationsHub /></PageTransition>} />
          
          {/* Redirect old /ai-tools route to /tools */}
          <Route path="/ai-tools" element={<Navigate to="/tools" replace />} />
          
          {/* Supply flow: /list is quick start, then /create-listing/:id for publish wizard */}
          <Route path="/list" element={<PageTransition><ListPage /></PageTransition>} />
          <Route path="/list/ai" element={<PageTransition><AIListingCreator /></PageTransition>} />
          <Route path="/create-listing/:listingId" element={<PageTransition><EditListing /></PageTransition>} />
          <Route path="/listing-published" element={<PageTransition><ListingPublished /></PageTransition>} />
          <Route path="/listing-published/:listingId" element={<PageTransition><ListingPublished /></PageTransition>} />
          <Route path="/checkout/:listingId" element={<PageTransition><SaleCheckout /></PageTransition>} />
          <Route path="/book/:listingId" element={<PageTransition><BookingCheckout /></PageTransition>} />

          {/* Referral program */}
          <Route path="/r/:code" element={<RHandler />} />
          <Route path="/referral" element={<PageTransition><ReferralLanding /></PageTransition>} />
          <Route path="/referral/dashboard" element={<PageTransition><ReferralDashboard /></PageTransition>} />
          <Route path="/referral/terms" element={<PageTransition><ReferralTerms /></PageTransition>} />
          <Route path="/referral/admin" element={<PageTransition><ReferralAdmin /></PageTransition>} />

          
          <Route path="/order-tracking/:transactionId" element={<PageTransition><OrderTracking /></PageTransition>} />
          <Route path="/transactions" element={<PageTransition><Transactions /></PageTransition>} />
          
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          <Route path="/vendor-lots" element={<PageTransition><VendorLots /></PageTransition>} />
          <Route path="/wanted" element={<PageTransition><Wanted /></PageTransition>} />
          <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
          <Route path="/signage-request" element={<PageTransition><SignageRequest /></PageTransition>} />
          <Route path="/unsubscribe" element={<PageTransition><Unsubscribe /></PageTransition>} />
          <Route path="/email-unsubscribe" element={<PageTransition><EmailUnsubscribe /></PageTransition>} />
          <Route path="/feedback" element={<PageTransition><Feedback /></PageTransition>} />
          
          {/* SEO article page - separate purpose from tools hub */}
          <Route path="/vendi-ai-suite" element={<PageTransition><VendiAISuite /></PageTransition>} />
          
          {/* Seller landing pages */}
          <Route path="/sell-my-food-truck" element={<PageTransition><SellMyFoodTruck /></PageTransition>} />
          <Route path="/sell-food-truck" element={<PageTransition><SellFoodTruck /></PageTransition>} />
          <Route path="/sell-food-trailer" element={<PageTransition><SellFoodTrailer /></PageTransition>} />
          <Route path="/sell-concession-trailer" element={<PageTransition><SellConcessionTrailer /></PageTransition>} />

          {/* AI-search content pages */}
          <Route path="/what-is-vendibook" element={<PageTransition><WhatIsVendibook /></PageTransition>} />
          <Route path="/why-list-on-vendibook" element={<PageTransition><WhyListOnVendibook /></PageTransition>} />
          <Route path="/best-place-to-sell-a-food-truck" element={<PageTransition><BestPlaceToSellAFoodTruck /></PageTransition>} />
          <Route path="/list-food-truck-for-sale" element={<PageTransition><ListFoodTruckForSale /></PageTransition>} />
          <Route path="/rent-out-my-food-truck" element={<PageTransition><RentOutMyFoodTruck /></PageTransition>} />
          <Route path="/resources/mobile-food-marketplace-glossary" element={<PageTransition><MobileFoodMarketplaceGlossary /></PageTransition>} />
          <Route path="/resources/food-truck-selling-faq" element={<PageTransition><FoodTruckSellingFaq /></PageTransition>} />

          {/* Commercial kitchen rental landing page */}
          <Route path="/rent-my-commercial-kitchen" element={<PageTransition><RentMyCommercialKitchen /></PageTransition>} />
          
          {/* Enterprise onboarding for multi-kitchen operators */}
          <Route path="/enterprise-onboarding" element={<PageTransition><EnterpriseOnboarding /></PageTransition>} />
          
          {/* Pricing Calculator */}
          <Route path="/pricing-calculator" element={<PageTransition><PricingCalculator /></PageTransition>} />
          
          {/* Kitchen Earnings Calculator - Google Ads Landing Page */}
          <Route path="/kitchen-earnings-calculator" element={<PageTransition><KitchenEarningsCalculator /></PageTransition>} />
          
          {/* Payments & Protection */}
          <Route path="/payments" element={<PageTransition><Payments /></PageTransition>} />
          
          
          {/* Renter Landing Page */}
          <Route path="/start" element={<PageTransition><StartFoodBusiness /></PageTransition>} />
          <Route path="/homepage2" element={<PageTransition><Homepage2 /></PageTransition>} />
          
          {/* Rental Manager */}
          <Route path="/rentals" element={<PageTransition><Rentals /></PageTransition>} />
          
          {/* Blog */}
          <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
          <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />
          <Route path="/blog/category/:category" element={<PageTransition><BlogCategory /></PageTransition>} />
          <Route path="/subscribe" element={<PageTransition><Subscribe /></PageTransition>} />
          
          {/* Programmatic SEO: category + city + mode pages */}
          <Route path="/rent/:categorySlug/:cityStateSlug" element={<PageTransition><CategoryCityPage mode="rent" /></PageTransition>} />
          <Route path="/buy/:categorySlug/:cityStateSlug" element={<PageTransition><CategoryCityPage mode="buy" /></PageTransition>} />

          {/* SEO category index pages — crawlable listing grids */}
          {CATEGORY_INDEX_CONFIGS.map((cfg) => (
            <Route
              key={cfg.path}
              path={cfg.path}
              element={<PageTransition><CategoryIndex config={cfg} /></PageTransition>}
            />
          ))}

          {/* SEO city/category landing pages — crawlable, city-filtered listing grids */}
          {CITY_CATEGORY_CONFIGS.map((cfg) => (
            <Route
              key={cfg.path}
              path={cfg.path}
              element={<PageTransition><CategoryIndex config={cfg} /></PageTransition>}
            />
          ))}

          {/* Cities hub page */}
          <Route path="/cities" element={<PageTransition><Cities /></PageTransition>} />
          
          {/* City landing pages - must come BEFORE the dynamic :citySlug route */}
          <Route path="/houston/list" element={<PageTransition><HoustonList /></PageTransition>} />
          <Route path="/houston/browse" element={<PageTransition><HoustonBrowse /></PageTransition>} />
          <Route path="/houston/list-food-truck" element={<PageTransition><HoustonListFoodTruck /></PageTransition>} />
          <Route path="/houston/list-food-trailer" element={<PageTransition><HoustonListFoodTrailer /></PageTransition>} />
          <Route path="/houston/list-vendor-space" element={<PageTransition><HoustonListVendorSpace /></PageTransition>} />
          <Route path="/los-angeles/list" element={<PageTransition><LosAngelesList /></PageTransition>} />
          <Route path="/los-angeles/browse" element={<PageTransition><LosAngelesBrowse /></PageTransition>} />
          <Route path="/los-angeles/list-food-truck" element={<PageTransition><LosAngelesListFoodTruck /></PageTransition>} />
          <Route path="/los-angeles/list-food-trailer" element={<PageTransition><LosAngelesListFoodTrailer /></PageTransition>} />
          <Route path="/los-angeles/list-vendor-space" element={<PageTransition><LosAngelesListVendorSpace /></PageTransition>} />
          <Route path="/dallas/list" element={<PageTransition><DallasList /></PageTransition>} />
          <Route path="/dallas/browse" element={<PageTransition><DallasBrowse /></PageTransition>} />
          <Route path="/dallas/list-food-truck" element={<PageTransition><DallasListFoodTruck /></PageTransition>} />
          <Route path="/dallas/list-food-trailer" element={<PageTransition><DallasListFoodTrailer /></PageTransition>} />
          <Route path="/dallas/list-vendor-space" element={<PageTransition><DallasListVendorSpace /></PageTransition>} />
          <Route path="/phoenix/list" element={<PageTransition><PhoenixList /></PageTransition>} />
          <Route path="/phoenix/browse" element={<PageTransition><PhoenixBrowse /></PageTransition>} />
          <Route path="/phoenix/list-food-truck" element={<PageTransition><PhoenixListFoodTruck /></PageTransition>} />
          <Route path="/phoenix/list-food-trailer" element={<PageTransition><PhoenixListFoodTrailer /></PageTransition>} />
          <Route path="/phoenix/list-vendor-space" element={<PageTransition><PhoenixListVendorSpace /></PageTransition>} />
          
          {/* Dynamic city SEO pages - catches valid city slugs like /houston, /dallas */}
          <Route path="/:citySlug" element={<PageTransition><DynamicCityPage /></PageTransition>} />
          
          {/* Explicit 404 route - redirect to homepage */}
          <Route path="/404" element={<Navigate to="/" replace />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

// Global unhandled rejection handler
const useGlobalErrorHandler = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      
      // Don't show toast for chunk loading errors (handled by vite:preloadError)
      const message = event.reason?.message || String(event.reason);
      if (message.includes('Loading chunk') || message.includes('module script')) {
        return;
      }
      
      toast.error("An error occurred. Please try again.");
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);
};

const FloatingConciergeButton = lazy(() => import("@/components/FloatingConciergeButton"));

const AppContent = () => {
  useGlobalErrorHandler();
  useOfflineQueueSync();

  return (
    <>
      <ScrollToTop />
      <OfflineBanner />
      <Toaster />
      <Sonner />
      <CookieConsent />

      <GoogleOneTap />
      
      <AnimatedRoutes />
      <MobileBottomNav />
      <Suspense fallback={null}>
        <LiveActivityFeed />
      </Suspense>
      <Suspense fallback={null}>
        <FloatingConciergeButton />
      </Suspense>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
