import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import apiService from "../services/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import Spinner from "../components/Spinner";
import HeartIcon from "../components/HeartIcon";

const CATEGORY_OPTIONS = [
  { value: "rings", label: "Rings" },
  { value: "necklaces", label: "Necklaces" },
  { value: "earrings", label: "Earrings" },
  { value: "bracelets", label: "Bracelets" },
  { value: "watches", label: "Watches" },
  { value: "handbags", label: "Handbags" },
  { value: "scarves", label: "Scarves" },
  { value: "other", label: "Other" },
];

const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating-desc", label: "Rating: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "bestselling", label: "Best Selling" },
];

export default function Products({ showToast }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist, loading: wishlistLoading } = useWishlist();
  
  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || "",
    categories: searchParams.get('categories')?.split(',') || [],
    price: [Number(searchParams.get('minPrice')) || 0, Number(searchParams.get('maxPrice')) || 0],
    rating: Number(searchParams.get('rating')) || 0,
    discount: Number(searchParams.get('discount')) || 0,
    tags: searchParams.get('tags')?.split(',') || [],
  });
  
  const [sort, setSort] = useState(searchParams.get('sort') || "");
  const [showFilters, setShowFilters] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 0]);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
    if (filters.price[0] > 0) params.set('minPrice', filters.price[0].toString());
    if (filters.price[1] > 0) params.set('maxPrice', filters.price[1].toString());
    if (filters.rating > 0) params.set('rating', filters.rating.toString());
    if (filters.discount > 0) params.set('discount', filters.discount.toString());
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (sort) params.set('sort', sort);
    if (pagination.page > 1) params.set('page', pagination.page.toString());
    
    setSearchParams(params);
  }, [filters, sort, pagination.page, setSearchParams]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        // Add pagination
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        
        // Add filters
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (filters.categories.length > 0) params.append('category', filters.categories.join(','));
        if (sort) params.append('sort', sort);
        
        const res = await apiService.request(`/products?${params}`);
        
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
        
        setProducts(productsArray);
        
        // Update pagination
        if (res.pagination) {
          setPagination(res.pagination);
        }
        
        // Calculate tags and price range on first load
        if (productsArray.length > 0 && allTags.length === 0) {
          const tags = new Set();
          let minPrice = Infinity, maxPrice = 0;
          
          productsArray.forEach(p => {
            (p.tags || []).forEach(tag => tags.add(tag));
            if (p.price?.current < minPrice) minPrice = p.price.current;
            if (p.price?.current > maxPrice) maxPrice = p.price.current;
          });
          
          setAllTags(Array.from(tags));
          setPriceRange([minPrice === Infinity ? 0 : minPrice, maxPrice]);
          if (filters.price[0] === 0 && filters.price[1] === 0) {
            setFilters(f => ({ ...f, price: [minPrice === Infinity ? 0 : minPrice, maxPrice] }));
          }
        }
        
      } catch (err) {
        console.error('Error loading products:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [debouncedSearch, filters.categories, sort, pagination.page, pagination.limit]);

  // Filtered products
  const filtered = useMemo(() => {
    if (!products.length) return [];
    
    let result = products;
    
    // Apply client-side filters
    if (filters.tags.length > 0) {
      result = result.filter(p => 
        p.tags?.some(tag => filters.tags.includes(tag))
      );
    }
    
    if (filters.rating > 0) {
      result = result.filter(p => (p.rating?.average || 0) >= filters.rating);
    }
    
    if (filters.discount > 0) {
      result = result.filter(p => (p.discount?.percentage || 0) >= filters.discount);
    }
    
    if (filters.price[0] > 0 || filters.price[1] > 0) {
      result = result.filter(p => {
        const price = p.price?.current || 0;
        return price >= filters.price[0] && (filters.price[1] === 0 || price <= filters.price[1]);
      });
    }
    
    return result;
  }, [products, filters]);

  const handleAddToCart = useCallback((product, qty) => {
    addToCart(product, qty);
    if (showToast) showToast("Added to cart!", "success");
  }, [addToCart, showToast]);

  const isInWishlist = useCallback((productId) => {
    if (!productId) return false;
    return wishlist.some(w => {
      const wishlistProductId = w.product?._id || w.product;
      return wishlistProductId === productId;
    });
  }, [wishlist]);

  const handleWishlistToggle = useCallback(async (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product || !product._id) {
      console.error('Invalid product for wishlist:', product);
      return;
    }
    
    try {
      if (isInWishlist(product._id)) {
        await removeFromWishlist(product._id);
        if (showToast) showToast("Removed from wishlist", "info");
      } else {
        await addToWishlist(product._id);
        if (showToast) showToast("Added to wishlist!", "success");
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
      if (showToast) showToast("Failed to update wishlist", "error");
    }
  }, [isInWishlist, removeFromWishlist, addToWishlist, showToast]);

  // UI Handlers
  const handleCategoryChange = (cat) => {
    setFilters(f => ({ 
      ...f, 
      categories: f.categories.includes(cat) 
        ? f.categories.filter(c => c !== cat) 
        : [...f.categories, cat] 
    }));
    setPagination(p => ({ ...p, page: 1 })); // Reset to first page
  };

  const handleTagChange = (tag) => {
    setFilters(f => ({ 
      ...f, 
      tags: f.tags.includes(tag) 
        ? f.tags.filter(t => t !== tag) 
        : [...f.tags, tag] 
    }));
  };

  const handlePriceChange = (e, idx) => {
    const val = Number(e.target.value);
    setFilters(f => {
      const newPrice = [...f.price];
      newPrice[idx] = val;
      return { ...f, price: newPrice };
    });
  };

  const handleRatingChange = (e) => {
    setFilters(f => ({ ...f, rating: Number(e.target.value) }));
  };

  const handleDiscountChange = (e) => {
    setFilters(f => ({ ...f, discount: Number(e.target.value) }));
  };

  const handleSearchChange = (e) => {
    setFilters(f => ({ ...f, search: e.target.value }));
    setPagination(p => ({ ...p, page: 1 })); // Reset to first page
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPagination(p => ({ ...p, page: 1 })); // Reset to first page
  };

  const removeFilter = (type, value) => {
    setFilters(f => {
      if (type === "search") return { ...f, search: "" };
      if (type === "categories") return { ...f, categories: f.categories.filter(c => c !== value) };
      if (type === "tags") return { ...f, tags: f.tags.filter(t => t !== value) };
      if (type === "rating") return { ...f, rating: 0 };
      if (type === "discount") return { ...f, discount: 0 };
      if (type === "price") return { ...f, price: priceRange };
      return f;
    });
  };

  const loadMore = () => {
    setPagination(p => ({ ...p, page: p.page + 1 }));
  };

  const goToPage = (page) => {
    setPagination(p => ({ ...p, page }));
  };

  // Product Card Component
  const ProductCard = ({ product }) => (
    <Link to={`/products/${product._id}`} className="bg-white rounded-lg shadow p-4 w-full block hover:shadow-lg transition-shadow relative">
      <button
        className="absolute top-2 right-2 z-10 text-primary hover:text-red-500 focus:outline-none"
        onClick={e => handleWishlistToggle(product, e)}
        disabled={wishlistLoading}
        aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
      >
        <HeartIcon filled={isInWishlist(product._id)} className={`w-6 h-6 ${wishlistLoading ? 'opacity-50' : ''}`} />
      </button>
      <div className="relative">
        {product.discount && product.discount.percentage ? (
          <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
            -{product.discount.percentage}%
          </span>
        ) : null}
        <img
          src={product.images && product.images.length > 0 ? product.images[0].url : "/shop.webp"}
          alt={product.name}
          className="rounded h-32 w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="mt-2 font-semibold truncate">{product.name}</div>
      <div className="text-primary font-bold">
        ₨{product.price?.current || 0}
        {product.price?.original && (
          <span className="text-gray-400 line-through ml-2">₨{product.price.original}</span>
        )}
      </div>
      <div className="text-yellow-500">
        {"★".repeat(Math.round(product.rating?.average || 0))}
        <span className="text-gray-500 text-xs"> ({product.rating?.count || 0})</span>
      </div>
      <div className="mt-2">
        <button
          className="bg-primary text-white w-full py-1 rounded hover:bg-primary-dark transition-colors"
          onClick={e => { e.preventDefault(); handleAddToCart(product, 1); }}
        >
          Add To Cart
        </button>
      </div>
    </Link>
  );

  // Loading skeleton
  const ProductSkeleton = () => (
    <div className="bg-white rounded-lg shadow p-4 w-full animate-pulse">
      <div className="bg-gray-300 rounded h-32 w-full mb-2"></div>
      <div className="bg-gray-300 rounded h-4 w-3/4 mb-2"></div>
      <div className="bg-gray-300 rounded h-4 w-1/2 mb-2"></div>
      <div className="bg-gray-300 rounded h-4 w-1/4 mb-2"></div>
      <div className="bg-gray-300 rounded h-8 w-full"></div>
    </div>
  );

  if (loading && products.length === 0) {
    return (
      <div className="px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">Discover amazing products with AI-powered recommendations</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <select value={sort} onChange={handleSortChange} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Filters
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Categories</label>
                  <div className="space-y-2">
                    {CATEGORY_OPTIONS.map(cat => (
                      <label key={cat.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(cat.value)}
                          onChange={() => handleCategoryChange(cat.value)}
                          className="mr-2"
                        />
                        {cat.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price Range</label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.price[0]}
                      onChange={e => handlePriceChange(e, 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.price[1]}
                      onChange={e => handlePriceChange(e, 1)}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rating</label>
                  <select value={filters.rating} onChange={handleRatingChange} className="w-full px-2 py-1 border border-gray-300 rounded">
                    <option value={0}>Any Rating</option>
                    <option value={4}>4★ & up</option>
                    <option value={3}>3★ & up</option>
                    <option value={2}>2★ & up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {allTags.map(tag => (
                      <label key={tag} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.tags.includes(tag)}
                          onChange={() => handleTagChange(tag)}
                          className="mr-2"
                        />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.search && <span className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Search: {filters.search} <button className="ml-1" onClick={() => removeFilter("search")}>×</button></span>}
          {filters.categories.map(cat => <span key={cat} className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">{CATEGORY_OPTIONS.find(c => c.value === cat)?.label || cat} <button className="ml-1" onClick={() => removeFilter("categories", cat)}>×</button></span>}
          {filters.tags.map(tag => <span key={tag} className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Tag: {tag} <button className="ml-1" onClick={() => removeFilter("tags", tag)}>×</button></span>}
          {filters.rating > 0 && <span className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Rating: {filters.rating}★ & up <button className="ml-1" onClick={() => removeFilter("rating")}>×</button></span>}
          {filters.discount > 0 && <span className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Discount: {filters.discount}%+ <button className="ml-1" onClick={() => removeFilter("discount")}>×</button></span>}
          {(filters.price[0] !== priceRange[0] || filters.price[1] !== priceRange[1]) && <span className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Price: ₨{filters.price[0]} - ₨{filters.price[1]} <button className="ml-1" onClick={() => removeFilter("price")}>×</button></span>}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-gray-600">
          Showing {filtered.length} of {pagination.total || products.length} products
        </div>

        {/* Product Grid */}
        {error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">Error loading products: {error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-400">
                  <p className="text-lg font-semibold mb-2">No products found</p>
                  <p className="text-sm">Try adjusting your filters or search terms.</p>
                </div>
              ) : filtered.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-2 border rounded ${
                          page === pagination.page
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Load More Button */}
            {pagination.page < pagination.pages && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-primary text-white px-8 py-2 rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 