import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaFilter, FaSearch, FaStar, FaHeart, FaShoppingCart, FaEye } from "react-icons/fa";
import apiService from "../services/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Spinner from "../components/Spinner";
import HeartIcon from "../components/HeartIcon";
import { useWishlist } from "../context/WishlistContext";

const FILTER_OPTIONS = {
  priceRange: [
    { value: "0-1000", label: "Under ₨1,000" },
    { value: "1000-5000", label: "₨1,000 - ₨5,000" },
    { value: "5000-10000", label: "₨5,000 - ₨10,000" },
    { value: "10000+", label: "Over ₨10,000" }
  ],
  rating: [
    { value: "4+", label: "4+ Stars" },
    { value: "3+", label: "3+ Stars" },
    { value: "2+", label: "2+ Stars" }
  ],
  sortBy: [
    { value: "newest", label: "Newest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "rating", label: "Highest Rated" },
    { value: "popular", label: "Most Popular" }
  ]
};

export default function Home({ showToast }) {
  const { user } = useAuth();
  const { t, isLoadingTranslations } = useLanguage();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist, loading: wishlistLoading } = useWishlist();
  
  // Filter states
  const [filters, setFilters] = useState({
    priceRange: "",
    rating: "",
    sortBy: "newest",
    searchQuery: ""
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading products from API...');
        const res = await apiService.getProducts();
        console.log('API Response:', res);
        
        let productsArray = [];
        if (Array.isArray(res)) {
          productsArray = res;
        } else if (res && Array.isArray(res.products)) {
          productsArray = res.products;
        } else if (res && res.data && Array.isArray(res.data)) {
          productsArray = res.data;
        } else {
          console.error('Unexpected response structure:', res);
          setError('Invalid response format from server');
          return;
        }
        
        console.log('Products loaded:', productsArray.length);
        console.log('Sample product:', productsArray[0]);
        
        // Filter out inactive products
        const activeProducts = productsArray.filter(product => 
          product.isActive !== false && product.isActive !== 'false'
        );
        
        console.log('Active products:', activeProducts.length);
        
        setProducts(activeProducts);
        setFilteredProducts(activeProducts);
      } catch (err) {
        console.error('Error loading products:', err);
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (filters.searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(product => {
        const price = product.price?.current || product.price;
        if (filters.priceRange === "10000+") {
          return price >= 10000;
        }
        return price >= min && price <= max;
      });
    }

    // Rating filter
    if (filters.rating) {
      const minRating = parseInt(filters.rating);
      filtered = filtered.filter(product => {
        const rating = product.rating?.average || product.rating || 0;
        return rating >= minRating;
      });
    }

    // Sort
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (a.price?.current || a.price) - (b.price?.current || b.price));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price?.current || b.price) - (a.price?.current || a.price));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating?.average || b.rating || 0) - (a.rating?.average || a.rating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [products, filters]);

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product._id, 1);
      showToast("Product added to cart!", "success");
    } catch (error) {
      showToast("Failed to add to cart", "error");
    }
  };

  const handleWishlistToggle = async (product) => {
    try {
      const currentlyInWishlist = isInWishlist(product._id);
      const result = currentlyInWishlist 
        ? await removeFromWishlist(product._id)
        : await addToWishlist(product._id);
        
      if (result?.success) {
        showToast(
          currentlyInWishlist ? "Removed from wishlist" : "Added to wishlist", 
          "success"
        );
      } else {
        showToast("Failed to update wishlist", "error");
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      showToast("Failed to update wishlist", "error");
    }
  };

  const ProductCard = ({ product, showWishlist = true }) => {
    // Handle different image formats
    const getProductImage = (product) => {
      if (product.images && product.images.length > 0) {
        const image = product.images[0];
        if (typeof image === 'string') {
          return image;
        } else if (image && image.url) {
          return image.url;
        }
      }
      
      // Fallback based on product category or name
      const category = product.category?.toLowerCase();
      const name = product.name?.toLowerCase();
      
      if (category?.includes('ring') || name?.includes('ring')) return '/ring.png';
      if (category?.includes('necklace') || name?.includes('necklace')) return '/necklace.png';
      if (category?.includes('earring') || name?.includes('earring')) return '/earring.png';
      if (category?.includes('bracelet') || name?.includes('bracelet')) return '/bracelet.png';
      if (category?.includes('watch') || name?.includes('watch')) return '/watch.png';
      
      return '/shop.webp'; // Default fallback
    };

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative group">
          <img
            src={getProductImage(product)}
            alt={product.name}
            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = '/shop.webp';
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
          
          {showWishlist && (
            <button
              onClick={() => handleWishlistToggle(product)}
              disabled={wishlistLoading}
              className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors z-10"
            >
              <HeartIcon
                filled={isInWishlist(product._id)}
                className="w-5 h-5"
              />
            </button>
          )}
          
          {product.discount && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              -{product.discount.percentage}%
            </div>
          )}
          
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex space-x-2">
              <button
                onClick={() => handleAddToCart(product)}
                className="flex-1 bg-primary text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors flex items-center justify-center space-x-1"
              >
                <FaShoppingCart className="w-4 h-4" />
                <span>{t("Add to Cart")}</span>
              </button>
              <Link
                to={`/products/${product._id}`}
                className="flex-1 bg-white text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
              >
                <FaEye className="w-4 h-4" />
                <span>{t("View")}</span>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="p-5">
          <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">{product.name}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">
                ₨{product.price?.current || product.price}
              </span>
              {product.price?.original && product.price.original > product.price.current && (
                <span className="text-sm text-gray-500 line-through">
                  ₨{product.price.original}
                </span>
              )}
            </div>
            {product.rating && (
              <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                <FaStar className="text-yellow-400 w-4 h-4" />
                <span className="ml-1 font-medium">{product.rating.average?.toFixed(1) || product.rating}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>By {product.vendor?.businessName || 'Vendor'}</span>
            <span>{product.inventory?.stock || 0} in stock</span>
          </div>
        </div>
      </div>
    );
  };

  const ProductSkeleton = () => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
      <div className="w-full h-56 bg-gray-300"></div>
      <div className="p-5">
        <div className="h-6 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 rounded mb-3"></div>
        <div className="flex justify-between mb-3">
          <div className="h-6 w-20 bg-gray-300 rounded"></div>
          <div className="h-4 w-16 bg-gray-300 rounded"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-16 bg-gray-300 rounded"></div>
          <div className="h-3 w-12 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );

  const FilterSection = ({ title, options, value, onChange, type = "radio" }) => (
    <div className="mb-6">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
            <input
              type={type}
              name={title.toLowerCase().replace(/\s+/g, '-')}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  if (loading || isLoadingTranslations) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t("Welcome to SheWorks")}
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {t("Discover from women entrepreneurs. Shop jewelry, accessories, and more!")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t("Welcome to SheWorks")}
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            {t("Discover from women entrepreneurs. Shop jewelry, accessories, and more!")}
          </p>
          <Link
            to="/products"
            className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors inline-block shadow-lg"
          >
            {t("Shop All Products")}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 bg-white px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <FaFilter className="text-gray-600" />
                <span className="text-gray-700">{t("Filter")}</span>
              </button>
              
              <div className="text-sm text-gray-600">
                {filteredProducts.length} of {products.length} products
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">{t("Filter")}</h2>
              
              <FilterSection
                title="Price Range"
                options={FILTER_OPTIONS.priceRange}
                value={filters.priceRange}
                onChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
              />
              
              <FilterSection
                title="Rating"
                options={FILTER_OPTIONS.rating}
                value={filters.rating}
                onChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}
              />
              
              <FilterSection
                title="Sort By"
                options={FILTER_OPTIONS.sortBy}
                value={filters.sortBy}
                onChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
              />
              
              <button
                onClick={() => setFilters({
                  priceRange: "",
                  rating: "",
                  sortBy: "newest",
                  searchQuery: ""
                })}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                {t("Clear All Filters")}
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {error ? (
              <div className="text-center py-12">
                <p className="text-red-600 text-lg">{error}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">{t("No products found")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 