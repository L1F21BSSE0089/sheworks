import { useEffect, useState } from "react";
import apiService from "../services/api";
import Spinner from "../components/Spinner";

export default function AdminDashboard({ showToast }) {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiService.request("/admin/users"),
      apiService.request("/admin/vendors"),
      apiService.getProducts(),
      apiService.request("/orders"),
    ])
      .then(([usersRes, vendorsRes, productsRes, ordersRes]) => {
        setUsers(usersRes.users || []);
        setVendors(vendorsRes.vendors || []);
        setProducts(productsRes.products || []);
        setOrders(ordersRes.orders || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const suspendUser = async (userId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.request(`/admin/users/${userId}/suspend`, { method: "PUT" });
      setUsers(users => users.map(u => u._id === userId ? { ...u, isActive: false } : u));
      showToast("User suspended", "success");
    } catch (err) {
      setActionError(err.message);
      showToast("Failed to suspend user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.request(`/admin/users/${userId}`, { method: "DELETE" });
      setUsers(users => users.filter(u => u._id !== userId));
      showToast("User deleted", "success");
    } catch (err) {
      setActionError(err.message);
      showToast("Failed to delete user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const activateVendor = async (vendorId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.request(`/admin/vendors/${vendorId}/activate`, { method: "PUT" });
      setVendors(vendors => vendors.map(v => v._id === vendorId ? { ...v, isActive: true } : v));
      showToast("Vendor activated", "success");
    } catch (err) {
      setActionError(err.message);
      showToast("Failed to activate vendor", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const suspendVendor = async (vendorId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.request(`/admin/vendors/${vendorId}/suspend`, { method: "PUT" });
      setVendors(vendors => vendors.map(v => v._id === vendorId ? { ...v, isActive: false } : v));
      showToast("Vendor suspended", "success");
    } catch (err) {
      setActionError(err.message);
      showToast("Failed to suspend vendor", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteVendor = async (vendorId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.request(`/admin/vendors/${vendorId}`, { method: "DELETE" });
      setVendors(vendors => vendors.filter(v => v._id !== vendorId));
      showToast("Vendor deleted", "success");
    } catch (err) {
      setActionError(err.message);
      showToast("Failed to delete vendor", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const suspendProduct = async (productId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.request(`/admin/products/${productId}/suspend`, { method: "PUT" });
      setProducts(products => products.map(p => p._id === productId ? { ...p, isActive: false } : p));
      showToast("Product suspended", "success");
    } catch (err) {
      setActionError(err.message);
      showToast("Failed to suspend product", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteProduct = async (productId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.request(`/admin/products/${productId}`, { method: "DELETE" });
      setProducts(products => products.filter(p => p._id !== productId));
      showToast("Product deleted", "success");
    } catch (err) {
      setActionError(err.message);
      showToast("Failed to delete product", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteOrder = async (orderId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.request(`/admin/orders/${orderId}`, { method: "DELETE" });
      setOrders(orders => orders.filter(o => o._id !== orderId));
      showToast("Order deleted", "success");
    } catch (err) {
      setActionError(err.message);
      showToast("Failed to delete order", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <button className={`px-4 py-2 rounded ${tab === "users" ? "bg-primary text-white" : "bg-gray-200"}`} onClick={() => setTab("users")}>Users</button>
        <button className={`px-4 py-2 rounded ${tab === "vendors" ? "bg-primary text-white" : "bg-gray-200"}`} onClick={() => setTab("vendors")}>Vendors</button>
        <button className={`px-4 py-2 rounded ${tab === "products" ? "bg-primary text-white" : "bg-gray-200"}`} onClick={() => setTab("products")}>Products</button>
        <button className={`px-4 py-2 rounded ${tab === "orders" ? "bg-primary text-white" : "bg-gray-200"}`} onClick={() => setTab("orders")}>Orders</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-primary text-white rounded p-4 text-center">
          <div className="text-2xl font-bold">{users.length}</div>
          <div>Users</div>
        </div>
        <div className="bg-pink-500 text-white rounded p-4 text-center">
          <div className="text-2xl font-bold">{vendors.length}</div>
          <div>Vendors</div>
        </div>
        <div className="bg-green-500 text-white rounded p-4 text-center">
          <div className="text-2xl font-bold">{products.length}</div>
          <div>Products</div>
        </div>
        <div className="bg-yellow-500 text-white rounded p-4 text-center">
          <div className="text-2xl font-bold">{orders.length}</div>
          <div>Orders</div>
        </div>
        <div className="bg-blue-500 text-white rounded p-4 text-center">
          <div className="text-2xl font-bold">₨{orders.reduce((sum, o) => sum + (o.totals?.total || 0), 0)}</div>
          <div>Total Sales</div>
        </div>
      </div>
      {loading ? <Spinner /> : error ? <div className="text-red-500">{error}</div> : (
        <div>
          {tab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full mb-6 text-sm md:text-base">
                <thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
                <tbody>{users.map(u => <tr key={u._id}><td>{u.firstName} {u.lastName}</td><td>{u.email}</td><td><button onClick={() => suspendUser(u._id)}>Suspend</button> <button onClick={() => deleteUser(u._id)}>Delete</button></td></tr>)}</tbody>
              </table>
            </div>
          )}
          {tab === "vendors" && (
            <div className="overflow-x-auto">
              <table className="w-full mb-6 text-sm md:text-base">
                <thead><tr><th>Business</th><th>Contact</th><th>Email</th><th>Actions</th></tr></thead>
                <tbody>{vendors.map(v => <tr key={v._id}><td>{v.businessName}</td><td>{v.contactPerson?.firstName} {v.contactPerson?.lastName}</td><td>{v.email}</td><td><button onClick={() => activateVendor(v._id)}>Activate</button> <button onClick={() => suspendVendor(v._id)}>Suspend</button> <button onClick={() => deleteVendor(v._id)}>Delete</button></td></tr>)}</tbody>
              </table>
            </div>
          )}
          {tab === "products" && (
            <div className="overflow-x-auto">
              <table className="w-full mb-6 text-sm md:text-base">
                <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Vendor</th><th>Actions</th></tr></thead>
                <tbody>{products.map(p => <tr key={p._id}><td>{p.name}</td><td>{p.category}</td><td>₨{p.price.current}</td><td>{p.inventory.stock}</td><td>{p.vendor?.businessName || p.vendor?.username || ""}</td><td><button onClick={() => suspendProduct(p._id)}>Suspend</button> <button onClick={() => deleteProduct(p._id)}>Delete</button></td></tr>)}</tbody>
              </table>
            </div>
          )}
          {tab === "orders" && (
            <div className="overflow-x-auto">
              <table className="w-full mb-6 text-sm md:text-base">
                <thead><tr><th>Order #</th><th>Status</th><th>Total</th><th>Customer</th><th>Actions</th></tr></thead>
                <tbody>{orders.map(o => <tr key={o._id}><td>{o.orderNumber}</td><td>{o.status}</td><td>₨{o.totals?.total}</td><td>{o.customer}</td><td><button onClick={() => deleteOrder(o._id)}>Delete</button></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 