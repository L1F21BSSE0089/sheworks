import { useState } from "react";
import { useCart } from "../context/CartContext";
import apiService from "../services/api";
import { useNavigate } from "react-router-dom";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

export default function Checkout({ showToast }) {
  const { cart, total, clearCart } = useCart();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const handleOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (paymentMethod === "card") {
        // 1. Create payment intent
        const intentRes = await apiService.request("/orders/create-payment-intent", {
          method: "POST",
          body: { amount: total, currency: "usd" },
        });
        const clientSecret = intentRes.clientSecret;
        // 2. Confirm card payment
        const cardElement = elements.getElement(CardElement);
        const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: `${firstName} ${lastName}`, email },
          },
        });
        if (stripeError) throw new Error(stripeError.message);
        if (paymentIntent.status !== "succeeded") throw new Error("Payment not successful");
      }
      // Place order as before
      const orderData = {
        items: cart.map(item => ({
          product: item.product._id,
          vendor: item.product.vendor,
          quantity: item.quantity,
          price: item.product.price.current,
          total: item.product.price.current * item.quantity
        })),
        billingAddress: {
          firstName,
          lastName,
          email,
          phone,
          street,
          city,
          state,
          zipCode,
          country
        },
        shippingAddress: {
          firstName,
          lastName,
          email,
          phone,
          street,
          city,
          state,
          zipCode,
          country
        },
        payment: {
          method: paymentMethod,
          status: paymentMethod === "card" ? "paid" : "pending"
        },
        shipping: {
          method: "standard",
          cost: 0
        }
      };
      const res = await apiService.placeOrder(orderData);
      setSuccess("Order placed successfully!");
      clearCart();
      setTimeout(() => navigate("/account"), 2000);
      if (showToast) showToast("Order placed successfully!", "success");
    } catch (err) {
      setError(err.message || "Failed to place order");
      if (showToast) showToast("Failed to place order", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
      <form className="flex-1 space-y-4" onSubmit={handleOrder}>
        <h1 className="text-2xl font-bold mb-4">Billing Details</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <input className="bg-gray-100 p-2 rounded w-full" placeholder="First Name*" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          <input className="bg-gray-100 p-2 rounded w-full" placeholder="Last Name*" value={lastName} onChange={e => setLastName(e.target.value)} required />
        </div>
        <input className="bg-gray-100 p-2 rounded w-full" placeholder="Email Address*" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="bg-gray-100 p-2 rounded w-full" placeholder="Phone Number*" value={phone} onChange={e => setPhone(e.target.value)} required />
        <input className="bg-gray-100 p-2 rounded w-full" placeholder="Street Address*" value={street} onChange={e => setStreet(e.target.value)} required />
        <div className="flex flex-col md:flex-row gap-4">
          <input className="bg-gray-100 p-2 rounded w-full" placeholder="City*" value={city} onChange={e => setCity(e.target.value)} required />
          <input className="bg-gray-100 p-2 rounded w-full" placeholder="State*" value={state} onChange={e => setState(e.target.value)} required />
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <input className="bg-gray-100 p-2 rounded w-full" placeholder="Zip Code*" value={zipCode} onChange={e => setZipCode(e.target.value)} required />
          <input className="bg-gray-100 p-2 rounded w-full" placeholder="Country*" value={country} onChange={e => setCountry(e.target.value)} required />
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="payment" className="accent-primary" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
            <span>Card Payment</span>
            <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-5 ml-2" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/MasterCard_Logo.svg" alt="MasterCard" className="h-5 ml-2" />
          </label>
          <label className="flex items-center gap-2 mt-2">
            <input type="radio" name="payment" className="accent-primary" checked={paymentMethod === "cash_on_delivery"} onChange={() => setPaymentMethod("cash_on_delivery")} />
            <span>Cash on delivery</span>
          </label>
        </div>
        {paymentMethod === "card" && (
          <div className="my-4 p-4 border rounded bg-white">
            <CardElement options={{ hidePostalCode: true }} />
          </div>
        )}
        <button className="bg-primary text-white w-full py-2 rounded mt-4" disabled={loading || cart.length === 0} type="submit">
          {loading ? (paymentMethod === "card" ? "Processing Payment..." : "Placing Order...") : "Place Order"}
        </button>
        {error && <div className="text-red-500 text-sm text-center mt-2">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center mt-2">{success}</div>}
      </form>
      <div className="w-full lg:w-1/3 border rounded p-6 mt-8 lg:mt-0">
        <h2 className="text-xl font-bold mb-4">Order Summary</h2>
        {cart.length === 0 ? (
          <div className="text-gray-400">Your cart is empty.</div>
        ) : cart.map(item => (
          <div className="mb-2 flex justify-between" key={item.product._id}>
            <span>{item.product.name} x{item.quantity}</span>
            <span>₨{item.product.price.current * item.quantity}</span>
          </div>
        ))}
        <div className="flex justify-between mb-2 mt-4">
          <span>Subtotal:</span>
          <span>₨{total}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Shipping:</span>
          <span>Free</span>
        </div>
        <div className="flex justify-between font-bold text-lg mb-4">
          <span>Total:</span>
          <span>₨{total}</span>
        </div>
      </div>
    </div>
  );
}