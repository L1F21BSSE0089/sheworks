import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiService from "../services/api";
import { useCart } from "../context/CartContext";
import Spinner from "../components/Spinner";
import HeartIcon from "../components/HeartIcon";
import { useWishlist } from "../context/WishlistContext";

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

function filterProducts(products, filters) {
  return products.filter(p => {
    // Search
    const matchesSearch = !filters.search ||
      p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(filters.search.toLowerCase())) ||
      (p.tags && p.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase())));
    // Categories
    const matchesCategory = filters.categories.length === 0 || filters.categories.includes(p.category);
    // Price
    const matchesPrice = (!filters.price[0] || p.price.current >= filters.price[0]) && (!filters.price[1] || p.price.current <= filters.price[1]);
    // Rating
    const matchesRating = !filters.rating || (p.rating?.average || 0) >= filters.rating;
    // Discount
    const matchesDiscount = !filters.discount || (p.discount && p.discount.percentage >= filters.discount);
    // Tags
    const matchesTags = filters.tags.length === 0 || (p.tags && filters.tags.every(tag => p.tags.includes(tag)));
    return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesDiscount && matchesTags;
  });
}

function sortProducts(products, sort) {
  const arr = [...products];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => a.price.current - b.price.current);
    case "price-desc":
      return arr.sort((a, b) => b.price.current - a.price.current);
    case "rating-desc":
      return arr.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    case "newest":
      return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case "bestselling":
      return arr.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    default:
      return arr;
  }
}

export default function Home({ showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();
  const [filters, setFilters] = useState({
    search: "",
    categories: [],
    price: [0, 0],
    rating: 0,
    discount: 0,
    tags: [],
  });
  const [sort, setSort] = useState("");
  const [recommended, setRecommended] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 0]);
  const { wishlist, addToWishlist, removeFromWishlist, loading: wishlistLoading } = useWishlist();

  useEffect(() => {
    setLoading(true);
    apiService.getProducts()
      .then(res => {
        console.log('Products loaded:', res);
        setProducts(res.products || []);
        // Collect all tags and price range
        const tags = new Set();
        let minPrice = Infinity, maxPrice = 0;
        (res.products || []).forEach(p => {
          (p.tags || []).forEach(tag => tags.add(tag));
          if (p.price?.current < minPrice) minPrice = p.price.current;
          if (p.price?.current > maxPrice) maxPrice = p.price.current;
        });
        setAllTags(Array.from(tags));
        setPriceRange([minPrice === Infinity ? 0 : minPrice, maxPrice]);
        setFilters(f => ({ ...f, price: [minPrice === Infinity ? 0 : minPrice, maxPrice] }));
      })
      .catch(err => {
        console.error('Error loading products:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
    
    // Fetch recommendations - use the correct endpoint
    apiService.getProducts()
      .then(res => {
        console.log('Recommendations loaded:', res);
        setRecommended(res.products || []);
      })
      .catch(err => {
        console.error('Error loading recommendations:', err);
        // Don't set error for recommendations, just log it
      });
  }, []);

  const handleAddToCart = (product, qty) => {
    addToCart(product, qty);
    if (showToast) showToast("Added to cart!", "success");
  };

  const isInWishlist = (productId) => wishlist.some(w => w.product && (w.product._id === productId || w.product === productId));
  const handleWishlistToggle = async (product, e) => {
    e.preventDefault();
    if (isInWishlist(product._id)) {
      await removeFromWishlist(product._id);
      if (showToast) showToast("Removed from wishlist", "info");
    } else {
      await addToWishlist(product._id);
      if (showToast) showToast("Added to wishlist!", "success");
    }
  };

  // Filtered and sorted products
  const filtered = sortProducts(filterProducts(products, filters), sort);

  // UI Handlers
  const handleCategoryChange = (cat) => {
    setFilters(f => ({ ...f, categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat] }));
  };
  const handleTagChange = (tag) => {
    setFilters(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));
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
  };
  const handleSortChange = (e) => setSort(e.target.value);
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

  return (
    <div>
      {/* Filter Sidebar (collapsible on mobile) */}
      <div className="flex flex-col md:flex-row gap-8 px-4 md:px-8 py-8">
        <aside className={`w-full md:w-1/5 mb-6 md:mb-0 ${showFilters ? '' : 'hidden md:block'}`}> 
          <div className="bg-white rounded-lg shadow p-4 sticky top-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Filters</h3>
              <button className="md:hidden text-primary" onClick={() => setShowFilters(false)}>Close</button>
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-2">Search</label>
              <input className="bg-gray-100 px-3 py-2 rounded w-full" placeholder="Search products..." value={filters.search} onChange={handleSearchChange} />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-2">Category</label>
              <div className="flex flex-col gap-2">
                {CATEGORY_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2">
                    <input type="checkbox" checked={filters.categories.includes(opt.value)} onChange={() => handleCategoryChange(opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-2">Price Range</label>
              <div className="flex gap-2 items-center">
                <input type="number" min={priceRange[0]} max={filters.price[1]} value={filters.price[0]} onChange={e => handlePriceChange(e, 0)} className="w-20 bg-gray-100 px-2 py-1 rounded" />
                <span>-</span>
                <input type="number" min={filters.price[0]} max={priceRange[1]} value={filters.price[1]} onChange={e => handlePriceChange(e, 1)} className="w-20 bg-gray-100 px-2 py-1 rounded" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-2">Minimum Rating</label>
              <select className="bg-gray-100 px-3 py-2 rounded w-full" value={filters.rating} onChange={handleRatingChange}>
                <option value={0}>Any</option>
                <option value={1}>1★ & up</option>
                <option value={2}>2★ & up</option>
                <option value={3}>3★ & up</option>
                <option value={4}>4★ & up</option>
                <option value={5}>5★</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-2">Minimum Discount (%)</label>
              <input type="number" min={0} max={100} value={filters.discount} onChange={handleDiscountChange} className="w-full bg-gray-100 px-2 py-1 rounded" />
            </div>
            {allTags.length > 0 && (
              <div className="mb-4">
                <label className="block font-semibold mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <label key={tag} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer">
                      <input type="checkbox" checked={filters.tags.includes(tag)} onChange={() => handleTagChange(tag)} />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
        <section className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <button className="md:hidden bg-primary text-white px-4 py-2 rounded" onClick={() => setShowFilters(true)}>Filters</button>
            <div className="flex gap-2 items-center">
              <label className="font-semibold">Sort by:</label>
              <select className="bg-gray-100 px-3 py-2 rounded" value={sort} onChange={handleSortChange}>
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Active Filters as tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.search && <span className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Search: {filters.search} <button className="ml-1" onClick={() => removeFilter("search")}>×</button></span>}
            {filters.categories.map(cat => <span key={cat} className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">{CATEGORY_OPTIONS.find(c => c.value === cat)?.label || cat} <button className="ml-1" onClick={() => removeFilter("categories", cat)}>×</button></span>)}
            {filters.tags.map(tag => <span key={tag} className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Tag: {tag} <button className="ml-1" onClick={() => removeFilter("tags", tag)}>×</button></span>)}
            {filters.rating > 0 && <span className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Rating: {filters.rating}★ & up <button className="ml-1" onClick={() => removeFilter("rating")}>×</button></span>}
            {filters.discount > 0 && <span className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Discount: {filters.discount}%+ <button className="ml-1" onClick={() => removeFilter("discount")}>×</button></span>}
            {(filters.price[0] !== priceRange[0] || filters.price[1] !== priceRange[1]) && <span className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">Price: ₨{filters.price[0]} - ₨{filters.price[1]} <button className="ml-1" onClick={() => removeFilter("price")}>×</button></span>}
          </div>
          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-4 w-full animate-pulse h-64" />
              ))}
            </div>
          ) : error ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-400">
                  No products found. 
                  {products.length === 0 && (
                    <div className="mt-2">
                      <p>No products available in the database.</p>
                      <p className="text-sm">Please check if products have been seeded.</p>
                    </div>
                  )}
                </div>
              ) : filtered.slice(0, 8).map(product => (
                <Link to={`/products/${product._id}`} key={product._id} className="bg-white rounded-lg shadow p-4 w-full block hover:shadow-lg transition-shadow relative">
                  <button
                    className="absolute top-2 right-2 z-10 text-primary hover:text-red-500 focus:outline-none"
                    onClick={e => handleWishlistToggle(product, e)}
                    aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <HeartIcon filled={isInWishlist(product._id)} className="w-6 h-6" />
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
                    />
                  </div>
                  <div className="mt-2 font-semibold truncate">{product.name}</div>
                  <div className="text-primary font-bold">
                    ₨{product.price.current}
                    {product.price.original && (
                      <span className="text-gray-400 line-through ml-2">₨{product.price.original}</span>
                    )}
                  </div>
                  <div className="text-yellow-500">
                    {"★".repeat(Math.round(product.rating?.average || 0))}
                    <span className="text-gray-500 text-xs"> ({product.rating?.count || 0})</span>
                  </div>
                  <div className="mt-2">
                    <button
                      className="bg-primary text-white w-full py-1 rounded"
                      onClick={e => { e.preventDefault(); handleAddToCart(product, 1); }}
                    >
                      Add To Cart
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="flex justify-center mt-8">
            <Link to="/products" className="bg-primary text-white px-8 py-2 rounded">View All Products</Link>
          </div>
        </section>
      </div>
      {/* Recommended for you */}
      {recommended.length > 0 && (
        <div className="px-4 md:px-8 mt-12">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-green-500 w-2 h-6 rounded" />
            <span className="text-green-600 font-semibold">Recommended for you</span>
          </div>
          <h2 className="text-2xl font-bold mb-6">Recommended for you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recommended.slice(0, 8).map(product => (
              <Link to={`/products/${product._id}`} key={product._id} className="bg-white rounded-lg shadow p-4 w-full block hover:shadow-lg transition-shadow relative">
                <button
                  className="absolute top-2 right-2 z-10 text-primary hover:text-red-500 focus:outline-none"
                  onClick={e => handleWishlistToggle(product, e)}
                  aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <HeartIcon filled={isInWishlist(product._id)} className="w-6 h-6" />
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
                  />
                </div>
                <div className="mt-2 font-semibold truncate">{product.name}</div>
                <div className="text-primary font-bold">
                  ₨{product.price.current}
                  {product.price.original && (
                    <span className="text-gray-400 line-through ml-2">₨{product.price.original}</span>
                  )}
                </div>
                <div className="text-yellow-500">
                  {"★".repeat(Math.round(product.rating?.average || 0))}
                  <span className="text-gray-500 text-xs"> ({product.rating?.count || 0})</span>
                </div>
                <div className="mt-2">
                  <button
                    className="bg-primary text-white w-full py-1 rounded"
                    onClick={e => { e.preventDefault(); handleAddToCart(product, 1); }}
                  >
                    Add To Cart
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}