import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";
import Spinner from "../components/Spinner";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Account() {
  const { user, userType, updateUser, logout } = useAuth();
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
      // Simulate update (replace with real API call if needed)
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
      // Password change logic (not implemented here)
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
  return (
    <div className="flex flex-col md:flex-row px-4 md:px-8 py-8 gap-8">
      <aside className="w-full md:w-1/4 mb-6 md:mb-0">
        <div className="mb-8">
          <div className="font-bold mb-2">Manage My Account</div>
          <ul className="space-y-2">
            <li className="text-primary font-semibold">My Profile</li>
            <li className="text-gray-400">Address Book</li>
            <li className="text-gray-400">My Payment Options</li>
          </ul>
        </div>
        <div className="mb-8">
          <div className="font-bold mb-2">My Orders</div>
          <ul className="space-y-2">
            <li className="text-primary font-semibold">Order History</li>
            <li className="text-gray-400">My Returns</li>
            <li className="text-gray-400">My Cancellations</li>
          </ul>
        </div>
        <div>
          <div className="font-bold mb-2">My WishList</div>
        </div>
        <div className="mt-8">
          <button onClick={logout} className="text-red-500 underline">Logout</button>
        </div>
      </aside>
      <section className="flex-1 bg-white rounded-lg shadow p-4 md:p-8 overflow-x-auto">
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
          {/* Password change fields (optional) */}
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
        <h2 className="text-xl font-bold mt-8 mb-4">Order History</h2>
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
                    <td>${order.totals?.total || 0}</td>
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
      </section>
    </div>
  );
}