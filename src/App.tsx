import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LockScreen } from "@/components/LockScreen";
import { HomePage } from "@/pages/HomePage";
import { SearchPage } from "@/pages/SearchPage";
import { AddDocumentPage } from "@/pages/AddDocumentPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { CategoryPage } from "@/pages/CategoryPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { DocumentViewPage } from "@/pages/DocumentViewPage";
import { SharePage } from "@/pages/SharePage";
import { QRCodePage } from "@/pages/QRCodePage";

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, isSetup, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSetup) {
    return <LockScreen isSetup />;
  }

  if (!isAuthenticated) {
    return <LockScreen />;
  }

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
