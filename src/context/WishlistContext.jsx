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
    
    const loadWishlist = async () => {
      setLoading(true);
      try {
        const res = await apiService.getWishlist();
        setWishlist(res.wishlist || []);
      } catch (error) {
        console.error('Failed to load wishlist:', error);
        setWishlist([]);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [isAuthenticated]);

  const addToWishlist = async (productId) => {
    if (!isAuthenticated) {
      console.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.addToWishlist(productId);
      setWishlist(res.wishlist || []);
      return { success: true };
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!isAuthenticated) {
      console.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.removeFromWishlist(productId);
      setWishlist(res.wishlist || []);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => {
      if (typeof item === 'string') return item === productId;
      if (item.product && typeof item.product === 'string') return item.product === productId;
      if (item.product && item.product._id) return item.product._id === productId;
      if (item._id) return item._id === productId;
      return false;
    });
  };

  return (
    <WishlistContext.Provider value={{ 
      wishlist, 
      addToWishlist, 
      removeFromWishlist, 
      isInWishlist,
      loading 
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
} 