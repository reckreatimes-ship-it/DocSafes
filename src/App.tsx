import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LockScreen } from "@/components/LockScreen";
import { PermissionsScreen } from "@/components/PermissionsScreen";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { HomePage } from "@/pages/HomePage";
import { SearchPage } from "@/pages/SearchPage";
import { AddDocumentPage } from "@/pages/AddDocumentPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { CategoryPage } from "@/pages/CategoryPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { DocumentViewPage } from "@/pages/DocumentViewPage";
import { SharePage } from "@/pages/SharePage";
import { QRCodePage } from "@/pages/QRCodePage";
import { ReceivePage } from "@/pages/ReceivePage";
import { getSetting, saveSetting } from "@/lib/storage";

const queryClient = new QueryClient();

// Routes that don't require authentication
function PublicRoutes() {
  return (
    <Routes>
      <Route path="/receive" element={<ReceivePage />} />
    </Routes>
  );
}

// Routes that require authentication
function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/add" element={<AddDocumentPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/category/:categoryId" element={<CategoryPage />} />
      <Route path="/document/:documentId" element={<DocumentViewPage />} />
      <Route path="/share/:documentId" element={<SharePage />} />
      <Route path="/qr/:documentId" element={<QRCodePage />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

function AppContent() {
  const { isAuthenticated, isSetup, isLoading } = useAuth();
  const location = useLocation();
  const [resetKey, setResetKey] = useState(0);
  const [permissionsChecked, setPermissionsChecked] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  // Check if permissions and onboarding were already done
  useEffect(() => {
    async function checkInitialState() {
      const permRequested = await getSetting('permissionsRequested');
      const onboardingDone = await getSetting('onboardingComplete');
      setPermissionsChecked(permRequested === 'true');
      setOnboardingComplete(onboardingDone === 'true');
    }
    checkInitialState();
  }, []);

  const handleOnboardingComplete = async () => {
    await saveSetting('onboardingComplete', 'true');
    setOnboardingComplete(true);
  };

  // Allow public routes without authentication
  const isPublicRoute = location.pathname.startsWith('/receive');

  if (isPublicRoute) {
    return <PublicRoutes />;
  }

  // Show loading while checking state
  if (permissionsChecked === null || onboardingComplete === null || isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show onboarding on first launch
  if (!onboardingComplete) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Show permissions screen
  if (!permissionsChecked) {
    return <PermissionsScreen onComplete={() => setPermissionsChecked(true)} />;
  }

  if (!isSetup) {
    return <LockScreen key={resetKey} isSetup onReset={() => setResetKey(k => k + 1)} />;
  }

  if (!isAuthenticated) {
    return <LockScreen key={resetKey} onReset={() => setResetKey(k => k + 1)} />;
  }

  return <ProtectedRoutes />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
