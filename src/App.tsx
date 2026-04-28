import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineStatusBanner from "@/components/OfflineStatusBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import RequestRole from "./pages/RequestRole";
import CreateBusinessAccount from "./pages/CreateBusinessAccount";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Offer from "./pages/Offer";
import Contacts from "./pages/Contacts";
import Catalog from "./pages/Catalog";
import MasterDetail from "./pages/MasterDetail";
import BusinessDetail from "./pages/BusinessDetail";
import Subscription from "./pages/Subscription";
import About from "./pages/About";
import ForBusiness from "./pages/ForBusiness";
import CreateOrganization from "./pages/CreateOrganization";
import Referral from "./pages/Referral";
import NotFound from "./pages/NotFound";
import AcceptInvite from "./pages/AcceptInvite";
import StressTest from "./pages/StressTest";
import PrivateRoute from "@/components/PrivateRoute";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Catalog />} />
              <Route path="/landing" element={<Index />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/request-role" element={<RequestRole />} />
              <Route path="/create-account" element={<CreateBusinessAccount />} />
              <Route path="/master/:masterId" element={<MasterDetail />} />
              <Route path="/business/:businessId" element={<BusinessDetail />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/about" element={<About />} />
              <Route path="/for-business" element={<ForBusiness />} />
              <Route path="/create-organization" element={<CreateOrganization />} />
              <Route path="/accept-invite/:token" element={<AcceptInvite />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/offer" element={<Offer />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/referral" element={<Referral />} />
              <Route
                path="/admin/stress-test"
                element={
                  <PrivateRoute roles={['super_admin', 'platform_admin']} fallback="/">
                    <StressTest />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <OfflineStatusBanner />
            <PWAInstallPrompt />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
