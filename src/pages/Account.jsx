import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";
import Spinner from "../components/Spinner";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

export default function Account() {
  const { user, userType, updateUser, logout } = useAuth();
  const { wishlist } = useWishlist();
  const [activeSection, setActiveSection] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || user?.contactPerson?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || user?.contactPerson?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    setOrdersLoading(true);
    setOrdersError(null);
    if (userType === "customer") {
      apiService.getMyOrders()
        .then(res => setOrders(res.orders || []))
        .catch(err => setOrdersError(err.message))
        .finally(() => setOrdersLoading(false));
    } else if (userType === "vendor") {
      apiService.getVendorOrders()
        .then(res => setOrders(res.orders || []))
        .catch(err => setOrdersError(err.message))
        .finally(() => setOrdersLoading(false));
    }
  }, [userType]);

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const handleEdit = () => {
    setEditMode(true);
    setSuccess(null);
    setError(null);
  };

  const handleCancel = () => {
    setEditMode(false);
    setFirstName(user?.firstName || user?.contactPerson?.firstName || "");
    setLastName(user?.lastName || user?.contactPerson?.lastName || "");
    setEmail(user?.email || "");
    setBusinessName(user?.businessName || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = { ...user };
      if (userType === "customer") {
        updated.firstName = firstName;
        updated.lastName = lastName;
        updated.email = email;
      } else {
        updated.businessName = businessName;
        updated.contactPerson = {
          ...updated.contactPerson,
          firstName,
          lastName
        };
        updated.email = email;
      }
      updateUser(updated);
      setSuccess("Profile updated successfully!");
      setEditMode(false);
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (order) => {
    order.items.forEach(item => {
      addToCart(item.product, item.quantity);
    });
  };

  function OrderStatusBar({ status }) {
    const steps = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    const currentIdx = steps.indexOf(status);
    return (
      <div className="flex items-center gap-2 my-2">
        {steps.slice(0, 5).map((step, idx) => (
          <div key={step} className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${idx <= currentIdx ? "bg-primary text-white border-primary" : "bg-gray-200 text-gray-400 border-gray-300"}`}>{idx + 1}</div>
            {idx < 4 && <div className={`w-8 h-1 ${idx < currentIdx ? "bg-primary" : "bg-gray-200"}`}></div>}
          </div>
        ))}
        <span className="ml-2 text-xs font-semibold capitalize">{status}</span>
      </div>
    );
  }

  const renderProfileSection = () => (
    <>
      <div className="text-right mb-4">
        Welcome! <span className="text-primary font-semibold">{userType === "vendor" ? businessName : `${firstName} ${lastName}`}</span>
      </div>
      <h2 className="text-2xl font-bold mb-4 text-primary">Edit Your Profile</h2>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSave}>
        {userType === "vendor" && (
          <input
            className="bg-gray-100 p-2 rounded col-span-2"
            placeholder="Business Name"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            disabled={!editMode}
            required
          />
        )}
        <input
          className="bg-gray-100 p-2 rounded"
          placeholder="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          disabled={!editMode}
          required
        />
        <input
          className="bg-gray-100 p-2 rounded"
          placeholder="Last Name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          disabled={!editMode}
          required
        />
        <input
          className="bg-gray-100 p-2 rounded col-span-2"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={!editMode}
          required
        />
        {editMode && (
          <>
            <input
              className="bg-gray-100 p-2 rounded col-span-2"
              placeholder="Current Password"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
            <input
              className="bg-gray-100 p-2 rounded col-span-2"
              placeholder="New Password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <input
              className="bg-gray-100 p-2 rounded col-span-2"
              placeholder="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </>
        )}
        <div className="col-span-2 flex justify-end gap-4 mt-4">
          {editMode ? (
            <>
              <button type="button" className="px-6 py-2 rounded border border-primary text-primary" onClick={handleCancel} disabled={loading}>Cancel</button>
              <button type="submit" className="px-6 py-2 rounded bg-primary text-white" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </>
          ) : (
            <button type="button" className="px-6 py-2 rounded bg-primary text-white" onClick={handleEdit}>Edit Profile</button>
          )}
        </div>
        {error && <div className="col-span-2 text-red-500 text-sm text-center">{error}</div>}
        {success && <div className="col-span-2 text-green-600 text-sm text-center">{success}</div>}
      </form>
    </>
  );

  const renderAddressBookSection = () => (
    <>
      <h2 className="text-2xl font-bold mb-4 text-primary">Address Book</h2>
      <div className="mb-4">
        <button className="bg-primary text-white px-4 py-2 rounded">Add New Address</button>
      </div>
      {addresses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">No addresses saved</p>
          <p className="text-sm">Add your first address to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{address.label}</h3>
                <div className="flex gap-2">
                  <button className="text-primary text-sm">Edit</button>
                  <button className="text-red-500 text-sm">Delete</button>
                </div>
              </div>
              <p className="text-gray-600">{address.street}</p>
              <p className="text-gray-600">{address.city}, {address.state} {address.zipCode}</p>
              <p className="text-gray-600">{address.country}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderPaymentOptionsSection = () => (
    <>
      <h2 className="text-2xl font-bold mb-4 text-primary">Payment Options</h2>
      <div className="mb-4">
        <button className="bg-primary text-white px-4 py-2 rounded">Add Payment Method</button>
      </div>
      {paymentMethods.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">No payment methods saved</p>
          <p className="text-sm">Add a payment method for faster checkout</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {paymentMethods.map((method, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{method.type}</p>
                  <p className="text-gray-600">**** **** **** {method.last4}</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-primary text-sm">Edit</button>
                  <button className="text-red-500 text-sm">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderOrderHistorySection = () => (
    <>
      <h2 className="text-xl font-bold mb-4">Order History</h2>
      {ordersLoading ? <Spinner /> : ordersError ? <div className="text-red-500">{ordersError}</div> : orders.length === 0 ? <div>No orders found.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full mb-6 text-sm md:text-base">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Order #</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Items</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr className="border-b" key={order._id}>
                  <td className="py-2">{order.orderNumber}</td>
                  <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</td>
                  <td><OrderStatusBar status={order.status} /></td>
                  <td>₨{order.totals?.total || 0}</td>
                  <td>
                    {order.items.map(item => (
                      <span key={item.product} className="inline-block mr-2">
                        {item.quantity}x {item.product?._id ? <Link to={`/products/${item.product._id}`} className="text-primary underline">{item.product.name}</Link> : (item.product?.name || "Product")}
                      </span>
                    ))}
                  </td>
                  <td>
                    <button className="bg-primary text-white px-3 py-1 rounded" onClick={() => handleReorder(order)}>Reorder</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderWishlistSection = () => (
    <>
      <h2 className="text-2xl font-bold mb-4 text-primary">My Wishlist</h2>
      {wishlist.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">Your wishlist is empty</p>
          <p className="text-sm">Start adding products you love!</p>
          <Link to="/products" className="inline-block mt-4 bg-primary text-white px-6 py-2 rounded">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map(product => (
            <div key={product._id} className="border rounded-lg p-4">
              <img 
                src={product.images?.[0] || "/placeholder.png"} 
                alt={product.name}
                className="w-full h-32 object-cover rounded mb-3"
              />
              <h3 className="font-semibold mb-2">{product.name}</h3>
              <p className="text-primary font-bold mb-2">₨{product.price?.current || product.price}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => addToCart(product._id, 1)}
                  className="flex-1 bg-primary text-white py-2 px-3 rounded text-sm"
                >
                  Add to Cart
                </button>
                <Link 
                  to={`/product/${product._id}`}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm text-center"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return renderProfileSection();
      case "address":
        return renderAddressBookSection();
      case "payment":
        return renderPaymentOptionsSection();
      case "orders":
        return renderOrderHistorySection();
      case "wishlist":
        return renderWishlistSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <div className="flex flex-col md:flex-row px-4 md:px-8 py-8 gap-8">
      <aside className="w-full md:w-1/4 mb-6 md:mb-0">
        <div className="mb-8">
          <div className="font-bold mb-2">Manage My Account</div>
          <ul className="space-y-2">
            <li 
              className={`cursor-pointer hover:text-primary ${activeSection === "profile" ? "text-primary font-semibold" : "text-gray-400"}`}
              onClick={() => setActiveSection("profile")}
            >
              My Profile
            </li>
            <li 
              className={`cursor-pointer hover:text-primary ${activeSection === "address" ? "text-primary font-semibold" : "text-gray-400"}`}
              onClick={() => setActiveSection("address")}
            >
              Address Book
            </li>
            <li 
              className={`cursor-pointer hover:text-primary ${activeSection === "payment" ? "text-primary font-semibold" : "text-gray-400"}`}
              onClick={() => setActiveSection("payment")}
            >
              My Payment Options
            </li>
          </ul>
        </div>
        <div className="mb-8">
          <div className="font-bold mb-2">My Orders</div>
          <ul className="space-y-2">
            <li 
              className={`cursor-pointer hover:text-primary ${activeSection === "orders" ? "text-primary font-semibold" : "text-gray-400"}`}
              onClick={() => setActiveSection("orders")}
            >
              Order History
            </li>
          </ul>
        </div>
        <div className="mb-8">
          <div className="font-bold mb-2">My WishList</div>
          <li 
            className={`cursor-pointer hover:text-primary ${activeSection === "wishlist" ? "text-primary font-semibold" : "text-gray-400"}`}
            onClick={() => setActiveSection("wishlist")}
          >
            My Wishlist
          </li>
        </div>
        <div className="mt-8">
          <button onClick={logout} className="text-red-500 underline">Logout</button>
        </div>
      </aside>
      <section className="flex-1 bg-white rounded-lg shadow p-4 md:p-8 overflow-x-auto">
        {renderContent()}
      </section>
    </div>
  );
}