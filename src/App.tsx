import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import ScrollToTop from "@/components/ScrollToTop";
import ZendeskWidget from "@/components/ZendeskWidget";
import PageTransition from "@/components/PageTransition";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Activation = lazy(() => import("./pages/Activation"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const EditListing = lazy(() => import("./pages/EditListing"));
const ListPage = lazy(() => import("./pages/List"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Account = lazy(() => import("./pages/Account"));
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
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const HostOnboarding = lazy(() => import("./pages/HostOnboarding"));
const Install = lazy(() => import("./pages/Install"));
const VendorLots = lazy(() => import("./pages/VendorLots"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const VendiAISuite = lazy(() => import("./pages/VendiAISuite"));
const Browse = lazy(() => import("./pages/Browse"));
const ListingPublished = lazy(() => import("./pages/ListingPublished"));
const Cities = lazy(() => import("./pages/Cities"));
const NotFound = lazy(() => import("./pages/NotFound"));

// City landing pages - direct imports since they're lightweight wrappers
import {
  HoustonList,
  HoustonBrowse,
  HoustonListFoodTruck,
  HoustonListFoodTrailer,
  HoustonListVendorLot,
  LosAngelesList,
  LosAngelesBrowse,
  LosAngelesListFoodTruck,
  LosAngelesListFoodTrailer,
  LosAngelesListVendorLot,
  DallasList,
  DallasBrowse,
  DallasListFoodTruck,
  DallasListFoodTrailer,
  DallasListVendorLot,
  PhoenixList,
  PhoenixBrowse,
  PhoenixListFoodTruck,
  PhoenixListFoodTrailer,
  PhoenixListVendorLot,
} from "./pages/city";

const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Animated Routes wrapper component
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<PageLoader />} key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/browse" element={<PageTransition><Browse /></PageTransition>} />
          <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/activation" element={<PageTransition><Activation /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/create-listing" element={<PageTransition><CreateListing /></PageTransition>} />
          <Route path="/listing/:id" element={<PageTransition><ListingDetail /></PageTransition>} />
          <Route path="/profile" element={<Navigate to="/account" replace />} />
          <Route path="/profile/edit" element={<Navigate to="/account" replace />} />
          <Route path="/profile/:id" element={<Navigate to={`/u/${window.location.pathname.split('/').pop()}`} replace />} />
          <Route path="/account" element={<PageTransition><Account /></PageTransition>} />
          <Route path="/u/:userId" element={<PageTransition><PublicProfile /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/insurance" element={<PageTransition><Insurance /></PageTransition>} />
          <Route path="/how-it-works" element={<PageTransition><HowItWorks /></PageTransition>} />
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
          
          {/* Redirect old /ai-tools route to /tools */}
          <Route path="/ai-tools" element={<Navigate to="/tools" replace />} />
          
          {/* Supply flow: /list is quick start, then /create-listing/:id for publish wizard */}
          <Route path="/list" element={<PageTransition><ListPage /></PageTransition>} />
          <Route path="/create-listing/:listingId" element={<PageTransition><EditListing /></PageTransition>} />
          <Route path="/listing-published/:listingId" element={<PageTransition><ListingPublished /></PageTransition>} />
          
          <Route path="/order-tracking/:transactionId" element={<PageTransition><OrderTracking /></PageTransition>} />
          <Route path="/host" element={<PageTransition><HostOnboarding /></PageTransition>} />
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          <Route path="/vendor-lots" element={<PageTransition><VendorLots /></PageTransition>} />
          <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
          <Route path="/unsubscribe" element={<PageTransition><Unsubscribe /></PageTransition>} />
          
          {/* SEO article page - separate purpose from tools hub */}
          <Route path="/vendi-ai-suite" element={<PageTransition><VendiAISuite /></PageTransition>} />
          
          {/* Cities hub page */}
          <Route path="/cities" element={<PageTransition><Cities /></PageTransition>} />
          
          {/* City landing pages */}
          <Route path="/houston/list" element={<PageTransition><HoustonList /></PageTransition>} />
          <Route path="/houston/browse" element={<PageTransition><HoustonBrowse /></PageTransition>} />
          <Route path="/houston/list-food-truck" element={<PageTransition><HoustonListFoodTruck /></PageTransition>} />
          <Route path="/houston/list-food-trailer" element={<PageTransition><HoustonListFoodTrailer /></PageTransition>} />
          <Route path="/houston/list-vendor-lot" element={<PageTransition><HoustonListVendorLot /></PageTransition>} />
          <Route path="/los-angeles/list" element={<PageTransition><LosAngelesList /></PageTransition>} />
          <Route path="/los-angeles/browse" element={<PageTransition><LosAngelesBrowse /></PageTransition>} />
          <Route path="/los-angeles/list-food-truck" element={<PageTransition><LosAngelesListFoodTruck /></PageTransition>} />
          <Route path="/los-angeles/list-food-trailer" element={<PageTransition><LosAngelesListFoodTrailer /></PageTransition>} />
          <Route path="/los-angeles/list-vendor-lot" element={<PageTransition><LosAngelesListVendorLot /></PageTransition>} />
          <Route path="/dallas/list" element={<PageTransition><DallasList /></PageTransition>} />
          <Route path="/dallas/browse" element={<PageTransition><DallasBrowse /></PageTransition>} />
          <Route path="/dallas/list-food-truck" element={<PageTransition><DallasListFoodTruck /></PageTransition>} />
          <Route path="/dallas/list-food-trailer" element={<PageTransition><DallasListFoodTrailer /></PageTransition>} />
          <Route path="/dallas/list-vendor-lot" element={<PageTransition><DallasListVendorLot /></PageTransition>} />
          <Route path="/phoenix/list" element={<PageTransition><PhoenixList /></PageTransition>} />
          <Route path="/phoenix/browse" element={<PageTransition><PhoenixBrowse /></PageTransition>} />
          <Route path="/phoenix/list-food-truck" element={<PageTransition><PhoenixListFoodTruck /></PageTransition>} />
          <Route path="/phoenix/list-food-trailer" element={<PageTransition><PhoenixListFoodTrailer /></PageTransition>} />
          <Route path="/phoenix/list-vendor-lot" element={<PageTransition><PhoenixListVendorLot /></PageTransition>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ScrollToTop />
          <Toaster />
          <Sonner />
          <CookieConsent />
          <ZendeskWidget />
          <AnimatedRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
