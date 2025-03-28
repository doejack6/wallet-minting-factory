
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import Generator from "./pages/Generator";
import Filter from "./pages/Filter";
import Database from "./pages/Database";
import PrivateKey from "./pages/PrivateKey";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/analytics" replace />} />
          <Route 
            path="/analytics" 
            element={
              <AppLayout>
                <Analytics />
              </AppLayout>
            } 
          />
          <Route 
            path="/generator" 
            element={
              <AppLayout>
                <Generator />
              </AppLayout>
            } 
          />
          <Route 
            path="/filter" 
            element={
              <AppLayout>
                <Filter />
              </AppLayout>
            } 
          />
          <Route 
            path="/privatekey/:id" 
            element={
              <AppLayout>
                <PrivateKey />
              </AppLayout>
            } 
          />
          <Route 
            path="/database" 
            element={
              <AppLayout>
                <Database />
              </AppLayout>
            } 
          />
          <Route 
            path="/activity" 
            element={
              <AppLayout>
                <Activity />
              </AppLayout>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <AppLayout>
                <Settings />
              </AppLayout>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
