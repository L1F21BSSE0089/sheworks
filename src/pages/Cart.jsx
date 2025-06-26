import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart({ showToast }) {
  const { cart, updateQuantity, removeFromCart, total, clearCart } = useCart();

  const handleRemove = (productId) => {
    removeFromCart(productId);
    if (showToast) showToast("Removed from cart", "success");
  };

  const handleUpdateQty = (productId, qty) => {
    updateQuantity(productId, qty);
    if (showToast) showToast("Quantity updated", "success");
  };

  return (
    <div className="px-4 md:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Cart</h1>
      {cart.length === 0 ? (
        <div className="text-gray-500 mb-8">Your cart is empty.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full mb-6 text-sm md:text-base">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr className="border-b" key={item.product._id}>
                    <td className="py-2 flex items-center gap-2">
                      <img
                        src={item.product.images && item.product.images.length > 0 ? item.product.images[0].url : "/shop.webp"}
                        alt={item.product.name}
                        className="w-12 h-12 rounded"
                      />
                      {item.product.name}
                    </td>
                    <td>${item.product.price.current}</td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        min={1}
                        className="w-16 border rounded px-2 py-1"
                        onChange={e => handleUpdateQty(item.product._id, Math.max(1, Number(e.target.value)))}
                      />
                    </td>
                    <td>${item.product.price.current * item.quantity}</td>
                    <td>
                      <button
                        className="text-red-500 underline text-sm"
                        onClick={() => handleRemove(item.product._id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 mb-6 lg:mb-0">
              <Link to="/" className="border px-6 py-2 rounded mr-4 mb-2 inline-block">Return To Shop</Link>
              <button className="border px-6 py-2 rounded mb-2" onClick={clearCart}>Clear Cart</button>
            </div>
            <div className="w-full lg:w-1/3 border rounded p-6">
              <h2 className="text-xl font-bold mb-4">Cart Total</h2>
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>${total}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg mb-4">
                <span>Total:</span>
                <span>${total}</span>
              </div>
              <Link
                to="/checkout"
                className={`bg-primary text-white w-full block text-center py-2 rounded ${cart.length === 0 ? "opacity-50 pointer-events-none" : ""}`}
              >
                Proceed to checkout
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}