import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import SidebarLayout from "./layouts/SidebarLayout";
import { GlobalColor, GlobalSecondaryColor } from "./global/GlobalColor";

import Dashboard from "./pages/Dashboard";
import CategoriesPage from "./pages/CategoriesPage";
import OrdersPage from "./pages/OrdersPage";
import BillingPage from "./pages/BillingPage";
import ProductsPage from "./pages/ProductsPage";
import RestaurantsPage from "./pages/RestaurantsPage";
import CarouselsPage from "./pages/CarouselPage";
import UserPage from "./pages/userPage";
import DiscountsPage from "./pages/DiscountsPage";
import DeliveryPage from "./pages/DeliveryPage";
import { AuthProvider } from "./auth/AuthProvider";
import { LoginPage } from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import AdditionsPage from "./pages/AdditionsPage";
// import CreditCustomersPage from "./pages/CreditCustomersPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import CashClosingPage from "./pages/CashClosingPage";
import CreateOrderPage from "./pages/CreateOrderPage";
import InventoryPage from "./pages/InventoryPage";


const theme = createTheme({
  palette: {
    primary: {
      main: GlobalColor,
    },
    secondary: {
      main: GlobalSecondaryColor,
    },
  },
});

const RESTAURANT_ID = "IOjtPfRh1PQ6lnxDeZdJ";

// Redirige según el rol del usuario al entrar a la raíz
function RootRedirect() {
  const { user, userDoc, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = userDoc?.isAdmin === true || userDoc?.role === "admin" || user.uid === "THtaTpKF7mOcSS5VbJtGtkZu9z82";
  if (isAdmin) return <Navigate to={`/${RESTAURANT_ID}/dashboard`} replace />;

  // No-admin: ir a la primera página permitida
  const firstPage = userDoc?.permissions?.allowedPages?.[0];
  if (firstPage) return <Navigate to={`/${RESTAURANT_ID}/${firstPage}`} replace />;

  const role = userDoc?.role;
  if (role === "cajero") return <Navigate to={`/${RESTAURANT_ID}/billing`} replace />;
  return <Navigate to={`/${RESTAURANT_ID}/orders`} replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <CssBaseline />
          <Routes>
            <Route path="login" element={<LoginPage />} />

            {/* Rutas Protegidas - Solo usuarios logueados */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<RootRedirect />} />
              <Route path="settings" element={<SettingsPage />} />

              <Route path="/:restaurantId" element={<SidebarLayout />}>
                {/* Rutas compartidas entre Admin y Cajero */}
                <Route element={<ProtectedRoute allowedRoles={["admin", "cajero"]} />}>
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="cash-closing" element={<CashClosingPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="create-order" element={<CreateOrderPage />} />
                  <Route path="edit-order/:orderId" element={<CreateOrderPage />} />
                  {/* <Route path="credit-customers" element={<CreditCustomersPage />} /> */}

                </Route>

                {/* Rutas exclusivas para Admin */}
                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="carousel" element={<CarouselsPage />} />
                  <Route path="users" element={<UserPage />} />
                  <Route path="discounts" element={<DiscountsPage />} />
                  <Route path="delivery" element={<DeliveryPage />} />
                  <Route path="additions" element={<AdditionsPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
