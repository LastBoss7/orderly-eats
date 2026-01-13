import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Tables from "./pages/Tables";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import MenuImages from "./pages/MenuImages";
import BulkEdit from "./pages/BulkEdit";
import Deliveries from "./pages/Deliveries";
import DeliverySettings from "./pages/DeliverySettings";
import Customers from "./pages/Customers";
import Waiter from "./pages/Waiter";
import WaiterApp from "./pages/WaiterApp";
import Kitchen from "./pages/Kitchen";
import SalonSettings from "./pages/SalonSettings";
import SalonData from "./pages/salon/SalonData";
import WaiterManagement from "./pages/salon/WaiterManagement";
import SalonAreas from "./pages/salon/SalonAreas";
import TableLayout from "./pages/salon/TableLayout";
import PrintLogs from "./pages/PrintLogs";
import Printers from "./pages/Printers";
import PrepTimeReport from "./pages/PrepTimeReport";
import Analytics from "./pages/Analytics";
import TabHistory from "./pages/TabHistory";
import RestaurantSettings from "./pages/RestaurantSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -12,
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  duration: 0.25,
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="h-full w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/menu-images" element={<MenuImages />} />
          <Route path="/bulk-edit" element={<BulkEdit />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/delivery-settings" element={<DeliverySettings />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/waiter" element={<Waiter />} />
          <Route path="/waiter-app" element={<WaiterApp />} />
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="/salon-settings" element={<SalonSettings />} />
          <Route path="/salon-settings/dados" element={<SalonData />} />
          <Route path="/salon-settings/garcons" element={<WaiterManagement />} />
          <Route path="/salon-settings/areas" element={<SalonAreas />} />
          <Route path="/salon-settings/layout" element={<TableLayout />} />
          <Route path="/print-logs" element={<PrintLogs />} />
          <Route path="/printers" element={<Printers />} />
          <Route path="/prep-time-report" element={<PrepTimeReport />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/tab-history" element={<TabHistory />} />
          <Route path="/restaurant-settings" element={<RestaurantSettings />} />
          <Route path="*" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
