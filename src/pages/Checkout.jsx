import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";
import { useNavigate } from "react-router-dom";
import { FaCreditCard, FaPaypal, FaMoneyBillWave, FaLock, FaShieldAlt, FaTruck, FaCheckCircle } from "react-icons/fa";
import DropIn from 'braintree-web-drop-in-react';

export default function Checkout({ showToast }) {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Pakistan"
  });

  // Checkout states
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [braintreeInstance, setBraintreeInstance] = useState(null);
  const [braintreeToken, setBraintreeToken] = useState(null);
  const [tokenLoadingError, setTokenLoadingError] = useState(false);

  const shippingMethods = [
    { id: "standard", name: "Standard Delivery", cost: 0, time: "3-5 business days" },
    { id: "express", name: "Express Delivery", cost: 500, time: "1-2 business days" },
    { id: "overnight", name: "Overnight Delivery", cost: 1000, time: "Next day" }
  ];

  const selectedShipping = shippingMethods.find(m => m.id === shippingMethod);
  const finalTotal = total + selectedShipping.cost;

  useEffect(() => {
    if (cart.length === 0) {
      navigate("/cart");
    }
  }, [cart, navigate]);

  useEffect(() => {
    if (paymentMethod === 'card') {
      setBraintreeToken(null);
      setBraintreeInstance(null);
      setTokenLoadingError(false);
      setError(null);
      apiService.request('/orders/braintree/token')
        .then(res => setBraintreeToken(res.clientToken))
        .catch(err => {
          console.error('Failed to load Braintree token:', err);
          setTokenLoadingError(true);
          setError('Failed to load payment form. Please try again.');
        });
    }
  }, [paymentMethod]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1: // Shipping info
        return formData.firstName && formData.lastName && formData.email && 
               formData.phone && formData.street && formData.city && 
               formData.state && formData.zipCode;
      case 2: // Payment
        if (paymentMethod === "card") {
          return braintreeInstance !== null;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setError(null);
    } else {
      setError("Please fill in all required fields");
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const processPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      let paymentResult = null;

      switch (paymentMethod) {
        case "card":
          // Use Braintree for card payments
          if (!braintreeInstance) throw new Error('Payment form not ready');
          const { nonce } = await braintreeInstance.requestPaymentMethod();
          const result = await apiService.request('/orders/braintree/checkout', {
            method: 'POST',
            body: { paymentMethodNonce: nonce, amount: finalTotal },
          });
          if (!result.success) throw new Error(result.message || 'Payment failed');
          paymentResult = {
            method: 'card',
            status: 'paid',
            transactionId: result.transaction.id,
            amount: finalTotal
          };
          break;

        case "cod":
          paymentResult = {
            method: "cash_on_delivery",
            status: "pending",
            amount: finalTotal
          };
          break;

        default:
          throw new Error("Invalid payment method");
      }

      // Create order
      const orderData = {
        items: cart.map(item => ({
          product: item.product._id,
          vendor: item.product.vendor,
          quantity: item.quantity,
          price: item.product.price.current,
          total: item.product.price.current * item.quantity
        })),
        billingAddress: formData,
        shippingAddress: formData,
        payment: paymentResult,
        shipping: {
          method: shippingMethod,
          cost: selectedShipping.cost
        },
        totals: {
          subtotal: total,
          shipping: selectedShipping.cost,
          total: finalTotal
        }
      };

      const orderRes = await apiService.placeOrder(orderData);
      setOrderId(orderRes.order._id);
      setCurrentStep(3);
      clearCart();
      
      if (showToast) showToast("Order placed successfully!", "success");

    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "Payment failed. Please try again.");
      if (showToast) showToast("Payment failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">1</div>
        <h2 className="text-xl font-semibold">Shipping Information</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="First Name *"
          required
        />
        <input
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Last Name *"
          required
        />
      </div>

      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary w-full"
        placeholder="Email Address *"
        required
      />

      <input
        name="phone"
        value={formData.phone}
        onChange={handleInputChange}
        className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary w-full"
        placeholder="Phone Number *"
        required
      />

      <input
        name="street"
        value={formData.street}
        onChange={handleInputChange}
        className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary w-full"
        placeholder="Street Address *"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          name="city"
          value={formData.city}
          onChange={handleInputChange}
          className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="City *"
          required
        />
        <input
          name="state"
          value={formData.state}
          onChange={handleInputChange}
          className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="State/Province *"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          name="zipCode"
          value={formData.zipCode}
          onChange={handleInputChange}
          className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="ZIP/Postal Code *"
          required
        />
        <input
          name="country"
          value={formData.country}
          onChange={handleInputChange}
          className="bg-gray-50 p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Country *"
          required
        />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Shipping Method</h3>
        <div className="space-y-3">
          {shippingMethods.map((method) => (
            <label key={method.id} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="shipping"
                value={method.id}
                checked={shippingMethod === method.id}
                onChange={(e) => setShippingMethod(e.target.value)}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium">{method.name}</div>
                <div className="text-sm text-gray-600">{method.time}</div>
              </div>
              <div className="font-semibold">
                {method.cost === 0 ? "Free" : `₨${method.cost}`}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">2</div>
        <h2 className="text-xl font-semibold">Payment Method</h2>
      </div>

      <div className="space-y-4">
        <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="payment"
            value="card"
            checked={paymentMethod === "card"}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mr-3"
          />
          <FaCreditCard className="text-blue-600 mr-3" />
          <div className="flex-1">
            <div className="font-medium">Credit/Debit Card</div>
            <div className="text-sm text-gray-600">Visa, MasterCard, American Express</div>
          </div>
        </label>

        <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={paymentMethod === "cod"}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mr-3"
          />
          <FaMoneyBillWave className="text-green-600 mr-3" />
          <div className="flex-1">
            <div className="font-medium">Cash on Delivery</div>
            <div className="text-sm text-gray-600">Pay when you receive your order</div>
          </div>
        </label>
      </div>

      {paymentMethod === "card" && (
        <div className="mt-6 p-4 border rounded-lg bg-white">
          <div className="mb-2 font-medium">Card Details</div>
          {tokenLoadingError ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Failed to load payment form</div>
              <button 
                onClick={() => {
                  setTokenLoadingError(false);
                  setError(null);
                  apiService.request('/orders/braintree/token')
                    .then(res => setBraintreeToken(res.clientToken))
                    .catch(err => {
                      console.error('Failed to load Braintree token:', err);
                      setTokenLoadingError(true);
                      setError('Failed to load payment form. Please try again.');
                    });
                }}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
              >
                Retry
              </button>
            </div>
          ) : braintreeToken ? (
            <DropIn
              options={{ authorization: braintreeToken }}
              onInstance={instance => setBraintreeInstance(instance)}
            />
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading payment form...</span>
            </div>
          )}
        </div>
      )}

      {paymentMethod === "cod" && (
        <div className="mt-6 p-4 border rounded-lg bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <FaMoneyBillWave />
            <span className="font-medium">Cash on Delivery</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Pay with cash when your order is delivered. Additional charges may apply.
          </p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
          <FaCheckCircle />
        </div>
        <h2 className="text-xl font-semibold">Order Confirmed!</h2>
      </div>

      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Thank you for your order!</h3>
        <p className="text-green-700 mb-4">
          Your order has been successfully placed and is being processed.
        </p>
        <div className="bg-white p-4 rounded border">
          <p className="font-medium">Order ID: <span className="text-primary">{orderId}</span></p>
          <p className="text-sm text-gray-600 mt-1">
            You will receive an email confirmation shortly.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => navigate("/account")}
          className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
        >
          View My Orders
        </button>
        <button
          onClick={() => navigate("/")}
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Step {currentStep} of 3</span>
            <span>•</span>
            <span>{cart.length} items</span>
            <span>•</span>
            <span>Total: ₨{finalTotal}</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Checkout Form */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep < 3 && (
                <div className="flex justify-between mt-8 pt-6 border-t">
                  {currentStep > 1 && (
                    <button
                      onClick={prevStep}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                  )}
                  
                  {currentStep === 1 && (
                    <button
                      onClick={nextStep}
                      className="ml-auto bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Continue to Payment
                    </button>
                  )}
                  
                  {currentStep === 2 && (
                    <button
                      onClick={processPayment}
                      disabled={loading || !validateStep(2)}
                      className="ml-auto bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        `Pay ₨${finalTotal}`
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="w-full lg:w-96">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                {cart.map(item => (
                  <div key={item.product._id} className="flex items-center gap-3">
                    <img
                      src={item.product.images && item.product.images.length > 0 ? item.product.images[0].url : "/shop.webp"}
                      alt={item.product.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">₨{item.product.price.current * item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₨{total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping ({selectedShipping.name})</span>
                  <span>{selectedShipping.cost === 0 ? "Free" : `₨${selectedShipping.cost}`}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₨{finalTotal}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <FaLock />
                  <span className="font-medium text-sm">Secure Checkout</span>
                </div>
                <p className="text-xs text-blue-600">
                  Your payment information is encrypted and secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}