import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";
import Spinner from "../components/Spinner";

export default function VendorDashboard() {
  const { user, userType } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "", price: { current: 0 }, inventory: { stock: 0 }, images: [] });
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  useEffect(() => {
    if (userType !== "vendor") return;
    setLoading(true);
    apiService.getProducts()
      .then(res => setProducts((res.products || []).filter(p => p.vendor?._id === user._id)))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, userType]);

  useEffect(() => {
    if (userType !== "vendor") return;
    setOrdersLoading(true);
    apiService.getVendorOrders()
      .then(res => setOrders(res.orders || []))
      .catch(err => setOrdersError(err.message))
      .finally(() => setOrdersLoading(false));
  }, [user, userType]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("price.")) {
      setForm(f => ({ ...f, price: { ...f.price, current: value } }));
    } else if (name.startsWith("inventory.")) {
      setForm(f => ({ ...f, inventory: { ...f.inventory, stock: value } }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: { current: product.price.current },
      inventory: { stock: product.inventory.stock },
      images: product.images || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    setFormLoading(true);
    try {
      await apiService.request(`/products/${id}`, { method: "DELETE" });
      setProducts(products => products.filter(p => p._id !== id));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      if (editingId) {
        const res = await apiService.request(`/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setProducts(products => products.map(p => p._id === editingId ? res.product : p));
      } else {
        const res = await apiService.request("/products", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setProducts(products => [...products, res.product]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", description: "", category: "", price: { current: 0 }, inventory: { stock: 0 }, images: [] });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    // Implementation of handleImageUpload
  };

  const markAsShipped = async (orderId) => {
    // Implementation of markAsShipped
  };

  const markAsDelivered = async (orderId) => {
    // Implementation of markAsDelivered
  };

  if (userType !== "vendor") {
    return <div className="p-8 text-red-500">Access denied. Vendors only.</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Vendor Dashboard</h1>
      <button className="bg-primary text-white px-4 py-2 rounded mb-4" onClick={() => { setShowForm(true); setEditingId(null); }}>Add Product</button>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-gray-400">No products found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full mb-6 text-sm md:text-base">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sales</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr className="border-b" key={product._id}>
                  <td className="py-2">{product.name}</td>
                  <td>{product.category}</td>
                  <td>${product.price.current}</td>
                  <td>{product.inventory.stock}</td>
                  <td>{product.salesCount || 0}</td>
                  <td>
                    <button className="text-primary underline mr-2" onClick={() => handleEdit(product)}>Edit</button>
                    <button className="text-red-500 underline" onClick={() => handleDelete(product._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <form className="bg-white rounded shadow p-4 md:p-6 max-w-lg" onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold mb-4">{editingId ? "Edit Product" : "Add Product"}</h2>
          <input className="bg-gray-100 p-2 rounded w-full mb-2" name="name" placeholder="Name" value={form.name} onChange={handleFormChange} required />
          <input className="bg-gray-100 p-2 rounded w-full mb-2" name="description" placeholder="Description" value={form.description} onChange={handleFormChange} required />
          <input className="bg-gray-100 p-2 rounded w-full mb-2" name="category" placeholder="Category" value={form.category} onChange={handleFormChange} required />
          <input className="bg-gray-100 p-2 rounded w-full mb-2" name="price.current" placeholder="Price" type="number" value={form.price.current} onChange={handleFormChange} required />
          <input className="bg-gray-100 p-2 rounded w-full mb-2" name="inventory.stock" placeholder="Stock" type="number" value={form.inventory.stock} onChange={handleFormChange} required />
          <input type="file" accept="image/*" className="bg-gray-100 p-2 rounded w-full mb-2" onChange={handleImageUpload} />
          {form.images && form.images[0] && (
            <img src={form.images[0].url || form.images[0]} alt="Preview" className="h-24 mb-2 rounded" />
          )}
          <div className="flex gap-2 mt-4">
            <button type="button" className="border px-4 py-2 rounded" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded" disabled={formLoading}>{formLoading ? "Saving..." : "Save"}</button>
          </div>
          {formError && <div className="text-red-500 mt-2">{formError}</div>}
        </form>
      )}
      <h2 className="text-xl font-bold mt-10 mb-4">My Orders</h2>
      {ordersLoading ? <Spinner /> : ordersError ? <div className="text-red-500">{ordersError}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full mb-6 text-sm md:text-base">
            <thead><tr><th>Order #</th><th>Status</th><th>Total</th><th>Items</th><th>Action</th></tr></thead>
            <tbody>{orders.map(order => (
              <tr key={order._id}>
                <td>{order.orderNumber}</td>
                <td>{order.status}</td>
                <td>${order.totals?.total}</td>
                <td>{order.items.map(i => i.product?.name).join(", ")}</td>
                <td>{order.status === 'processing' && <button onClick={() => markAsShipped(order._id)}>Mark as Shipped</button>}{order.status === 'shipped' && <button onClick={() => markAsDelivered(order._id)}>Mark as Delivered</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
} 