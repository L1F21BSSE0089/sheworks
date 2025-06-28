import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaShoppingCart, FaStar, FaEye, FaTrash } from "react-icons/fa";
import apiService from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import Spinner from "../components/Spinner";

export default function Wishlist({ showToast }) {
  const { addToCart } = useCart();
  const { wishlist, removeFromWishlist, isInWishlist, loading } = useWishlist();
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const loadWishlistProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await apiService.getWishlist();
        
        // Handle different response structures
        let products = [];
        if (response && response.wishlist) {
          // If wishlist contains product objects directly
          products = response.wishlist.map(item => {
            if (item.product && typeof item.product === 'object') {
              return item.product;
            }
            return item;
          });
        } else if (Array.isArray(response)) {
          products = response;
        } else if (response && Array.isArray(response.products)) {
          products = response.products;
        }
        
        setWishlistProducts(products);
      } catch (error) {
        console.error('Error loading wishlist products:', error);
        showToast("Failed to load wishlist", "error");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadWishlistProducts();
  }, [showToast]);

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product._id, 1);
      showToast("Added to cart!", "success");
    } catch (error) {
      showToast("Failed to add to cart", "error");
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await removeFromWishlist(productId);
      setWishlistProducts(prev => prev.filter(p => p._id !== productId));
      showToast("Removed from wishlist", "success");
    } catch (error) {
      showToast("Failed to remove from wishlist", "error");
    }
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0].url;
    }
    
    // Fallback based on category
    const categoryImages = {
      'rings': '/ring.png',
      'necklaces': '/necklace.png',
      'earrings': '/earring.png',
      'bracelets': '/bracelet.png',
      'watches': '/watch.png'
    };
    
    return categoryImages[product.category] || '/shop.webp';
  };

  if (loading || loadingProducts) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
          <p className="text-gray-600">
            {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'} in your wishlist
          </p>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <FaHeart className="mx-auto text-gray-300 text-6xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h2>
            <p className="text-gray-600 mb-8">Start adding products you love to your wishlist!</p>
            <Link
              to="/products"
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors inline-block"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistProducts.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => handleRemoveFromWishlist(product._id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remove from wishlist"
                    >
                      <FaTrash size={14} />
                    </button>
                    <Link
                      to={`/products/${product._id}`}
                      className="p-2 bg-white rounded-full text-gray-600 hover:text-primary transition-colors"
                      title="View details"
                    >
                      <FaEye size={16} />
                    </Link>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        className={`${
                          i < (product.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        size={14}
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-1">
                      ({product.reviewCount || 0})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      ₨{product.price?.current || product.price}
                    </span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-primary text-white px-3 py-1 rounded hover:bg-primary-dark transition-colors flex items-center gap-1"
                    >
                      <FaShoppingCart size={14} />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 