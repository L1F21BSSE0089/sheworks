import { createContext, useContext, useEffect, useState } from "react";
import apiService from "../services/api";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }
    setLoading(true);
    apiService.getWishlist()
      .then(res => setWishlist(res.wishlist || []))
      .catch(() => setWishlist([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const addToWishlist = async (productId) => {
    setLoading(true);
    try {
      const res = await apiService.addToWishlist(productId);
      setWishlist(res.wishlist || []);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      // Don't throw error, just log it to prevent crashes
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    setLoading(true);
    try {
      const res = await apiService.removeFromWishlist(productId);
      setWishlist(res.wishlist || []);
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      // Don't throw error, just log it to prevent crashes
    } finally {
      setLoading(false);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
} 