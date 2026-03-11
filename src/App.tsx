import { useState, useEffect, lazy, Suspense } from "react";
import type { PurchaseResult } from "@/native/bridge";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SplashScreen } from "@/components/SplashScreen";
import { PageLoader } from "@/components/PageLoader";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { SupportChat } from "@/components/SupportChat";
import { SecurityProvider } from "@/components/SecurityProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminMFAGuard from "@/components/admin/AdminMFAGuard";
import CallNotificationProvider from "@/components/CallNotificationProvider";
import { PageTransition } from "@/components/PageTransition";
import { TermsUpdateBanner } from "@/components/TermsUpdateBanner";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { LazyRouteErrorBoundary } from "@/components/LazyRouteErrorBoundary";

// Lazy load pages
const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Refund = lazy(() => import("@/pages/Refund"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogArticle = lazy(() => import("@/pages/BlogArticle"));
const Lawyers = lazy(() => import("@/pages/Lawyers"));
const LawyerApply = lazy(() => import("@/pages/LawyerApply"));
const Consultation = lazy(() => import("@/pages/Consultation"));
const Predictions = lazy(() => import("@/pages/Predictions"));
const Complaints = lazy(() => import("@/pages/Complaints"));
const Contracts = lazy(() => import("@/pages/Contracts"));
const LegalSearch = lazy(() => import("@/pages/LegalSearch"));
const Messages = lazy(() => import("@/pages/Messages"));
const ClientDashboard = lazy(() => import("@/pages/ClientDashboard"));
const LawyerDashboard = lazy(() => import("@/pages/LawyerDashboard"));
const LawyerFullDashboard = lazy(() => import("@/pages/LawyerFullDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminFullDashboard = lazy(() => import("@/pages/AdminFullDashboard"));
const AdminUserManagement = lazy(() => import("@/pages/AdminUserManagement"));
const AdminLawyers = lazy(() => import("@/pages/AdminLawyers"));
const AdminLawyerApplications = lazy(() => import("@/pages/AdminLawyerApplications"));
const AdminContracts = lazy(() => import("@/pages/AdminContracts"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));
const AdminAuditLog = lazy(() => import("@/pages/AdminAuditLog"));
const AdminSessions = lazy(() => import("@/pages/AdminSessions"));
const AdminSecurityDashboard = lazy(() => import("@/pages/AdminSecurityDashboard"));
const AdminSupportChats = lazy(() => import("@/pages/AdminSupportChats"));
const AdminFiles = lazy(() => import("@/pages/AdminFiles"));
const AdminBackup = lazy(() => import("@/pages/AdminBackup"));
const AdminSystemStatus = lazy(() => import("@/pages/AdminSystemStatus"));
const AdminTermsManagement = lazy(() => import("@/pages/AdminTermsManagement"));
const AdminPlatformSettings = lazy(() => import("@/pages/AdminPlatformSettings"));
const AdminPasswordSecurity = lazy(() => import("@/pages/AdminPasswordSecurity"));
const AdminIPRestriction = lazy(() => import("@/pages/AdminIPRestriction"));
const AdminPaymentErrors = lazy(() => import("@/pages/AdminPaymentErrors"));
const AdminCommunicationSettings = lazy(() => import("@/pages/AdminCommunicationSettings"));
const AdminIntegrations = lazy(() => import("@/pages/admin/Integrations"));
const ApiKeysManagement = lazy(() => import("@/pages/admin/ApiKeysManagement"));
const CommunicationMonitoring = lazy(() => import("@/pages/admin/CommunicationMonitoring"));
const AppLinksManagement = lazy(() => import("@/pages/admin/AppLinksManagement"));
const AuthDemo = lazy(() => import("@/pages/admin/AuthDemo"));
const DeepLinkTester = lazy(() => import("@/pages/admin/DeepLinkTester"));
const NativeSetupGuide = lazy(() => import("@/pages/admin/NativeSetupGuide"));
const AccountSettings = lazy(() => import("@/pages/AccountSettings"));
const SecuritySettings = lazy(() => import("@/pages/SecuritySettings"));
const SecurityReport = lazy(() => import("@/pages/SecurityReport"));
const SubscriptionManagement = lazy(() => import("@/pages/SubscriptionManagement"));
const SubscriptionSuccess = lazy(() => import("@/pages/SubscriptionSuccess"));
const SubscriptionDisabled = lazy(() => import("@/pages/SubscriptionDisabled"));
const SharedContract = lazy(() => import("@/pages/SharedContract"));
const Download = lazy(() => import("@/pages/Download"));
const InstallGuide = lazy(() => import("@/pages/InstallGuide"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ApiDocumentation = lazy(() => import("@/pages/ApiDocumentation"));
const Paywall = lazy(() => import("@/pages/Paywall"));
const DeploymentGuide = lazy(() => import("@/pages/DeploymentGuide"));
const QuickStartWizard = lazy(() => import("@/pages/QuickStartWizard"));
const RiskAssessment = lazy(() => import("@/pages/RiskAssessment"));
const AdminRiskManagement = lazy(() => import("@/pages/AdminRiskManagement"));

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <PageTransition key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />
        <Route path="/lawyers" element={<Lawyers />} />
        <Route path="/lawyer-apply" element={<LawyerApply />} />
        <Route path="/download" element={<Download />} />
        <Route path="/install" element={<InstallGuide />} />
        <Route path="/api-docs" element={<ApiDocumentation />} />
        <Route path="/paywall" element={<Paywall />} />
        <Route path="/shared-contract/:token" element={<SharedContract />} />
        <Route path="/deployment-guide" element={<DeploymentGuide />} />
        <Route path="/quick-start" element={<QuickStartWizard />} />
        <Route path="/risk-assessment" element={<ProtectedRoute><RiskAssessment /></ProtectedRoute>} />
        
        {/* Protected Routes */}
        <Route path="/consultation" element={<ProtectedRoute><Consultation /></ProtectedRoute>} />
        <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
        <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/legal-search" element={<ProtectedRoute><LegalSearch /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
        <Route path="/security-settings" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
        <Route path="/security-report" element={<ProtectedRoute><SecurityReport /></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><SubscriptionManagement /></ProtectedRoute>} />
        <Route path="/subscription-success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
        <Route path="/subscription-disabled" element={<SubscriptionDisabled />} />
        
        {/* Lawyer Routes */}
        <Route path="/lawyer-dashboard" element={<ProtectedRoute><LawyerDashboard /></ProtectedRoute>} />
        <Route path="/lawyer-full-dashboard" element={<ProtectedRoute><LawyerFullDashboard /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminMFAGuard><AdminDashboard /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminMFAGuard><AdminFullDashboard /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminMFAGuard><AdminUserManagement /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/lawyers" element={<ProtectedRoute><AdminMFAGuard><AdminLawyers /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/lawyer-applications" element={<ProtectedRoute><AdminMFAGuard><AdminLawyerApplications /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/contracts" element={<ProtectedRoute><AdminMFAGuard><AdminContracts /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute><AdminMFAGuard><AdminAnalytics /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/audit" element={<ProtectedRoute><AdminMFAGuard><AdminAuditLog /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/sessions" element={<ProtectedRoute><AdminMFAGuard><AdminSessions /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/security" element={<ProtectedRoute><AdminMFAGuard><AdminSecurityDashboard /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/support" element={<ProtectedRoute><AdminMFAGuard><AdminSupportChats /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/files" element={<ProtectedRoute><AdminMFAGuard><AdminFiles /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/backup" element={<ProtectedRoute><AdminMFAGuard><AdminBackup /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/system-status" element={<ProtectedRoute><AdminMFAGuard><AdminSystemStatus /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/terms" element={<ProtectedRoute><AdminMFAGuard><AdminTermsManagement /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/platform-settings" element={<ProtectedRoute><AdminMFAGuard><AdminPlatformSettings /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/password-security" element={<ProtectedRoute><AdminMFAGuard><AdminPasswordSecurity /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/ip-restriction" element={<ProtectedRoute><AdminMFAGuard><AdminIPRestriction /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/payment-errors" element={<ProtectedRoute><AdminMFAGuard><AdminPaymentErrors /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/communication" element={<ProtectedRoute><AdminMFAGuard><AdminCommunicationSettings /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/integrations" element={<ProtectedRoute><AdminMFAGuard><AdminIntegrations /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/api-keys" element={<ProtectedRoute><AdminMFAGuard><ApiKeysManagement /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/monitoring" element={<ProtectedRoute><AdminMFAGuard><CommunicationMonitoring /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/app-links" element={<ProtectedRoute><AdminMFAGuard><AppLinksManagement /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/auth-demo" element={<ProtectedRoute><AdminMFAGuard><AuthDemo /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/deep-link-tester" element={<ProtectedRoute><AdminMFAGuard><DeepLinkTester /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/native-setup" element={<ProtectedRoute><AdminMFAGuard><NativeSetupGuide /></AdminMFAGuard></ProtectedRoute>} />
        <Route path="/admin/risks" element={<ProtectedRoute><AdminMFAGuard><AdminRiskManagement /></AdminMFAGuard></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("hasVisitedThisSession");
    if (!hasVisited) {
      setIsFirstVisit(true);
      sessionStorage.setItem("hasVisitedThisSession", "true");
    } else {
      setShowSplash(false);
    }
  }, []);

  // Listen for native purchase results and show toasts
  useEffect(() => {
    const bridge = (window as any).MOHAMIE_NATIVE;
    if (bridge?.onPurchaseResult) {
      const unsub = bridge.onPurchaseResult((result: PurchaseResult) => {
        if (result.success) {
          import("sonner").then(({ toast }) => {
            toast.success("تم تفعيل الاشتراك بنجاح");
          });
        } else {
          import("sonner").then(({ toast }) => {
            toast.error(result.error || "حدث خطأ أثناء عملية الشراء");
          });
        }
      });
      return unsub;
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          {showSplash && isFirstVisit && (
            <SplashScreen onComplete={handleSplashComplete} />
          )}
          <Toaster />
          <Sonner />
          <HashRouter>
            <AuthProvider>
              <SecurityProvider>
                <AnalyticsProvider>
                  <CallNotificationProvider>
                    <DeepLinkHandler>
                      <PushNotificationManager />
                      <OfflineBanner />
                      <LazyRouteErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <AnimatedRoutes />
                        </Suspense>
                      </LazyRouteErrorBoundary>
                      <TermsUpdateBanner />
                      <SupportChat />
                    </DeepLinkHandler>
                  </CallNotificationProvider>
                </AnalyticsProvider>
              </SecurityProvider>
            </AuthProvider>
          </HashRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
