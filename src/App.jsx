import { Routes, Route, Navigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Home from "./pages/Home";
import About from "./pages/About";
import Account from "./pages/Account";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Messages from "./pages/Messages";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import VendorDashboard from "./pages/VendorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Toast from "./components/Toast";
import { useState, useEffect } from "react";
import socketService from "./services/socket";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import ProductDetails from "./pages/ProductDetails";
import Products from "./pages/Products";
import { WishlistProvider } from "./context/WishlistContext";
import Wishlist from "./pages/Wishlist";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key');

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "info") => setToast({ message, type });
  const { user, userType } = useAuth();

  useEffect(() => {
    if (userType === 'vendor' && user) {
      const token = localStorage.getItem('token');
      socketService.connect(token, user._id, 'vendor');
      const off = socketService.onOrderPlaced((data) => {
        showToast(data.message || 'You have a new order!', 'success');
      });
      return () => {
        off();
        socketService.disconnect();
      };
    }
  }, [userType, user]);

  return (
    <WishlistProvider>
      <CartProvider>
        <div className="bg-white min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home showToast={showToast} />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
              <Route path="/cart" element={<PrivateRoute><Cart showToast={showToast} /></PrivateRoute>} />
              <Route path="/checkout" element={
                <PrivateRoute>
                  <Elements stripe={stripePromise}>
                    <Checkout showToast={showToast} />
                  </Elements>
                </PrivateRoute>
              } />
              <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
              <Route path="/vendor-dashboard" element={userType === 'vendor' ? <VendorDashboard /> : <Navigate to="/" />} />
              <Route path="/admin-dashboard" element={userType === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
              <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
              <Route path="/products" element={<Products showToast={showToast} />} />
              <Route path="/products/:id" element={<ProductDetails showToast={showToast} />} />
              <Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
      </CartProvider>
    </WishlistProvider>
  );
}