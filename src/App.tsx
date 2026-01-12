import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Tables from "./pages/Tables";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import MenuImages from "./pages/MenuImages";
import BulkEdit from "./pages/BulkEdit";
import Waiter from "./pages/Waiter";
import Kitchen from "./pages/Kitchen";
import SalonSettings from "./pages/SalonSettings";
import SalonData from "./pages/salon/SalonData";
import WaiterManagement from "./pages/salon/WaiterManagement";
import SalonAreas from "./pages/salon/SalonAreas";
import TableLayout from "./pages/salon/TableLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/tables" element={<Tables />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/menu-images" element={<MenuImages />} />
            <Route path="/bulk-edit" element={<BulkEdit />} />
            <Route path="/waiter" element={<Waiter />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/salon-settings" element={<SalonSettings />} />
            <Route path="/salon-settings/dados" element={<SalonData />} />
            <Route path="/salon-settings/garcons" element={<WaiterManagement />} />
            <Route path="/salon-settings/areas" element={<SalonAreas />} />
            <Route path="/salon-settings/layout" element={<TableLayout />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
