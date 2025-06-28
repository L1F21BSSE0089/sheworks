import { useWishlist } from "../context/WishlistContext";
import { useLanguage } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import Spinner from "../components/Spinner";
import { FaTrash, FaEye } from "react-icons/fa";

export default function Wishlist() {
  const { wishlist, removeFromWishlist, loading } = useWishlist();
  const { t, isLoadingTranslations } = useLanguage();

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

  const getProductId = (wishlistItem) => {
    if (typeof wishlistItem === 'string') return wishlistItem;
    if (wishlistItem.product && typeof wishlistItem.product === 'string') return wishlistItem.product;
    if (wishlistItem.product && wishlistItem.product._id) return wishlistItem.product._id;
    if (wishlistItem._id) return wishlistItem._id;
    return null;
  };

  const getProductData = (wishlistItem) => {
    if (wishlistItem.product && typeof wishlistItem.product === 'object') {
      return wishlistItem.product;
    }
    return wishlistItem;
  };

  if (loading || isLoadingTranslations) return <Spinner />;

  return (
    <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">{t("My Wishlist")}</h1>
      
      {wishlist.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 text-xl mb-4">{t("Your wishlist is empty")}</div>
          <Link 
            to="/" 
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
          >
            {t("Browse Products")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((wishlistItem, index) => {
            const product = getProductData(wishlistItem);
            const productId = getProductId(wishlistItem);
            
            if (!product || !productId) {
              console.warn('Invalid wishlist item:', wishlistItem);
              return null;
            }

            return (
              <div key={productId || index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative group">
                  <img
                    src={getProductImage(product)}
                    alt={product.name || 'Product'}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = '/shop.webp';
                    }}
                  />
                  
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                  
                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex space-x-2">
                      <Link
                        to={`/products/${productId}`}
                        className="flex-1 bg-white text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
                      >
                        <FaEye className="w-4 h-4" />
                        <span>{t("View")}</span>
                      </Link>
                      <button
                        onClick={() => removeFromWishlist(productId)}
                        className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center space-x-1"
                      >
                        <FaTrash className="w-4 h-4" />
                        <span>{t("Remove")}</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">
                    {product.name || 'Product Name'}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description || 'No description available'}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-primary">
                        ₨{product.price?.current || product.price || 'N/A'}
                      </span>
                      {product.price?.original && product.price.original > product.price.current && (
                        <span className="text-sm text-gray-500 line-through">
                          ₨{product.price.original}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>By {product.vendor?.businessName || 'Vendor'}</span>
                    <span>{product.inventory?.stock || 0} in stock</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 