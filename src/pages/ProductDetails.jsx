import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import apiService from "../services/api";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import HeartIcon from "../components/HeartIcon";
import { useWishlist } from "../context/WishlistContext";

export default function ProductDetails({ showToast }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading product with ID:', id);
        const res = await apiService.getProduct(id);
        console.log('Product response:', res);
        
        if (res && res.product) {
          setProduct(res.product);
          // Load similar products
          loadSimilarProducts(res.product);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error loading product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadSimilarProducts = async (currentProduct) => {
    if (!currentProduct) return;
    
    try {
      setLoadingSimilar(true);
      const res = await apiService.getSimilarProducts(currentProduct._id, 4);
      setSimilarProducts(res.products || []);
    } catch (err) {
      console.error('Error loading similar products:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleWishlistToggle = async (product, e) => {
    e.preventDefault();
    try {
      const currentlyInWishlist = isInWishlist(product._id);
      const result = currentlyInWishlist 
        ? await removeFromWishlist(product._id)
        : await addToWishlist(product._id);
        
      if (result?.success) {
        if (showToast) {
          showToast(
            currentlyInWishlist ? "Removed from wishlist" : "Added to wishlist!", 
            currentlyInWishlist ? "info" : "success"
          );
        }
      } else {
        if (showToast) showToast("Failed to update wishlist", "error");
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      if (showToast) showToast("Failed to update wishlist", "error");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewText || !reviewRating) return;
    setSubmitting(true);
    try {
      const res = await apiService.request(`/products/${id}/reviews`, {
        method: "POST",
        body: { rating: reviewRating, comment: reviewText },
      });
      setProduct(p => ({ ...p, reviews: [res.review, ...(p.reviews || [])], rating: res.rating }));
      setReviewText("");
      setReviewRating(5);
      if (showToast) showToast("Review submitted!", "success");
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to submit review", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const nextImage = () => {
    const images = product.images || [];
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = product.images || [];
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'Escape') setShowImageModal(false);
  };

  if (loading) return <Spinner />;
  if (error) return <div className="text-red-500 p-8">{error}</div>;
  if (!product) return <div className="text-gray-400 p-8">Product not found.</div>;

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
      {/* Back to Dashboard button for vendors */}
      {user && user.role === 'vendor' && product.vendor === user._id && (
        <div className="mb-6">
          <Link 
            to="/vendor-dashboard" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Image Gallery Section */}
        <div className="md:w-1/2">
          {user && (
            <button
              className="absolute top-2 right-2 z-10 text-primary hover:text-red-500 focus:outline-none"
              onClick={e => handleWishlistToggle(product, e)}
              aria-label={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
              style={{ position: 'absolute', top: 0, right: 0 }}
            >
              <HeartIcon filled={isInWishlist(product._id)} className="w-8 h-8" />
            </button>
          )}
          
          {/* Main Image Viewer */}
          <div className="relative group">
            <img
              src={product.images && product.images.length > 0 ? product.images[selectedImageIndex].url : "/shop.webp"}
              alt={product.name}
              className="rounded-lg w-full h-96 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
              onClick={() => setShowImageModal(true)}
            />
            
            {/* Navigation Arrows (only show if multiple images) */}
            {product.images && product.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-opacity-70"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-opacity-70"
                  aria-label="Next image"
                >
                  →
                </button>
              </>
            )}
            
            {/* Image Counter */}
            {product.images && product.images.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {selectedImageIndex + 1} / {product.images.length}
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images && product.images.length > 1 && (
            <div className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      index === selectedImageIndex 
                        ? 'border-primary scale-110 shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300 hover:scale-105'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image Modal */}
          {showImageModal && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
              onClick={() => setShowImageModal(false)}
              onKeyDown={handleKeyDown}
              tabIndex={0}
            >
              <div className="relative max-w-4xl max-h-full">
                <img
                  src={product.images && product.images.length > 0 ? product.images[selectedImageIndex].url : "/shop.webp"}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                
                {/* Modal Navigation */}
                {product.images && product.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-colors"
                    >
                      ←
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-colors"
                    >
                      →
                    </button>
                  </>
                )}
                
                {/* Close Button */}
                <button
                  onClick={() => setShowImageModal(false)}
                  className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                >
                  ✕
                </button>
                
                {/* Image Counter in Modal */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
                    {selectedImageIndex + 1} / {product.images.length}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="md:w-1/2">
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <div className="text-yellow-500 mb-2">
            {"★".repeat(Math.round(product.rating?.average || 0))}
            <span className="text-gray-500 text-xs ml-1">({product.rating?.count || 0} reviews)</span>
          </div>
          <div className="text-primary text-2xl font-bold mb-2">₨{product.price.current}
            {product.price.original && (
              <span className="text-gray-400 line-through ml-2 text-lg">₨{product.price.original}</span>
            )}
          </div>
          {product.discount && product.discount.percentage ? (
            <div className="bg-primary text-white inline-block px-2 py-1 rounded mb-2">-{product.discount.percentage}%</div>
          ) : null}
          <div className="mb-2">Stock: {product.inventory.stock > 0 ? product.inventory.stock : <span className="text-red-500">Out of stock</span>}</div>
          <div className="mb-4 text-gray-700">{product.description}</div>
          <div className="mb-4 flex gap-2 flex-wrap">
            {(product.tags || []).map(tag => <span key={tag} className="bg-gray-200 px-2 py-1 rounded text-xs">{tag}</span>)}
          </div>
          <button className="bg-primary text-white px-6 py-2 rounded mb-4">Add to Cart</button>
        </div>
      </div>
      {/* Reviews */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Customer Reviews</h2>
        {user ? (
          <form className="mb-8 bg-gray-50 p-4 rounded" onSubmit={handleReviewSubmit}>
            <div className="mb-2 font-semibold">Leave a Review</div>
            <div className="flex items-center gap-2 mb-2">
              <label>Rating:</label>
              <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="bg-white border rounded px-2 py-1">
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r}★</option>)}
              </select>
            </div>
            <textarea
              className="w-full bg-white border rounded p-2 mb-2"
              placeholder="Write your review..."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              rows={3}
              required
            />
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded" disabled={submitting}>{submitting ? "Submitting..." : "Submit Review"}</button>
          </form>
        ) : (
          <div className="mb-8 text-gray-500">Please <Link to="/login" className="text-primary underline">log in</Link> to leave a review.</div>
        )}
        {product.reviews && product.reviews.length > 0 ? (
          <div className="space-y-4">
            {product.reviews.map((rev, i) => (
              <div key={i} className="bg-white rounded shadow p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{rev.user?.username || "User"}</span>
                  <span className="text-yellow-500">{"★".repeat(rev.rating)}</span>
                  <span className="text-gray-400 text-xs">{new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-gray-700">{rev.comment}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-gray-400">No reviews yet.</div>}
      </div>

      {/* Similar Products Section */}
      {similarProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Similar Products</h2>
          {loadingSimilar ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                  <div className="bg-gray-300 rounded h-32 w-full mb-2"></div>
                  <div className="bg-gray-300 rounded h-4 w-3/4 mb-2"></div>
                  <div className="bg-gray-300 rounded h-4 w-1/2 mb-2"></div>
                  <div className="bg-gray-300 rounded h-8 w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {similarProducts.map(similarProduct => (
                <Link to={`/products/${similarProduct._id}`} key={similarProduct._id} className="bg-white rounded-lg shadow p-4 block hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {similarProduct.discount && similarProduct.discount.percentage ? (
                      <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                        -{similarProduct.discount.percentage}%
                      </span>
                    ) : null}
                    <img
                      src={similarProduct.images && similarProduct.images.length > 0 ? similarProduct.images[0].url : "/shop.webp"}
                      alt={similarProduct.name}
                      className="rounded h-32 w-full object-cover"
                    />
                  </div>
                  <div className="mt-2 font-semibold truncate">{similarProduct.name}</div>
                  <div className="text-primary font-bold">
                    ₨{similarProduct.price?.current || 0}
                    {similarProduct.price?.original && (
                      <span className="text-gray-400 line-through ml-2">₨{similarProduct.price.original}</span>
                    )}
                  </div>
                  <div className="text-yellow-500">
                    {"★".repeat(Math.round(similarProduct.rating?.average || 0))}
                    <span className="text-gray-500 text-xs"> ({similarProduct.rating?.count || 0})</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 