import { useWishlist } from "../context/WishlistContext";
import { Link } from "react-router-dom";
import Spinner from "../components/Spinner";

export default function Wishlist() {
  const { wishlist, removeFromWishlist, loading } = useWishlist();

  if (loading) return <Spinner />;

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>
      {wishlist.length === 0 ? (
        <div className="text-gray-400 text-center py-16">Your wishlist is empty. <br /> <Link to="/" className="text-primary underline">Browse products</Link></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {wishlist.map(w => (
            <div key={w.product._id || w.product} className="bg-white rounded-lg shadow p-4 flex flex-col">
              <Link to={`/products/${w.product._id || w.product}`} className="mb-2">
                <img
                  src={w.product.images && w.product.images.length > 0 ? w.product.images[0].url : "/shop.webp"}
                  alt={w.product.name}
                  className="rounded h-32 w-full object-cover"
                />
                <div className="mt-2 font-semibold truncate">{w.product.name}</div>
              </Link>
              <div className="text-primary font-bold mb-2">${w.product.price?.current}</div>
              <button
                className="bg-red-500 text-white px-4 py-1 rounded mt-auto"
                onClick={() => removeFromWishlist(w.product._id || w.product)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 