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
  const [form, setForm] = useState({ name: "", description: "", category: "", price: { current: "" }, inventory: { stock: "" }, images: [] });
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [categoryError, setCategoryError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [stockError, setStockError] = useState("");

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

  const validateCategory = (category) => {
    if (!category.trim()) {
      setCategoryError("Category is required");
      return false;
    }
    if (category.trim().length < 2) {
      setCategoryError("Category must be at least 2 characters long");
      return false;
    }
    if (category.trim().length > 50) {
      setCategoryError("Category must be less than 50 characters");
      return false;
    }
    // Check for invalid characters
    const invalidChars = /[<>{}]/;
    if (invalidChars.test(category)) {
      setCategoryError("Category contains invalid characters");
      return false;
    }
    setCategoryError("");
    return true;
  };

  const validatePrice = (price) => {
    if (!price || price === "") {
      setPriceError("Price is required");
      return false;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) {
      setPriceError("Price must be a valid number");
      return false;
    }
    if (numPrice <= 0) {
      setPriceError("Price must be greater than 0");
      return false;
    }
    if (numPrice > 999999) {
      setPriceError("Price cannot exceed ₨999,999");
      return false;
    }
    setPriceError("");
    return true;
  };

  const validateStock = (stock) => {
    if (!stock || stock === "") {
      setStockError("Stock quantity is required");
      return false;
    }
    const numStock = parseInt(stock);
    if (isNaN(numStock)) {
      setStockError("Stock must be a valid number");
      return false;
    }
    if (numStock < 0) {
      setStockError("Stock cannot be negative");
      return false;
    }
    if (numStock > 99999) {
      setStockError("Stock cannot exceed 99,999");
      return false;
    }
    setStockError("");
    return true;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("price.")) {
      setForm(f => ({ ...f, price: { ...f.price, current: value } }));
      // Validate price in real-time
      validatePrice(value);
    } else if (name.startsWith("inventory.")) {
      setForm(f => ({ ...f, inventory: { ...f.inventory, stock: value } }));
      // Validate stock in real-time
      validateStock(value);
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
    
    // Validate category in real-time
    if (name === "category") {
      validateCategory(value);
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
      await apiService.deleteProduct(id);
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
    
    // Validate all fields before submission
    const isCategoryValid = validateCategory(form.category);
    const isPriceValid = validatePrice(form.price.current);
    const isStockValid = validateStock(form.inventory.stock);
    
    if (!isCategoryValid || !isPriceValid || !isStockValid) {
      setFormLoading(false);
      return;
    }
    
    try {
      // Ensure there's at least one image
      const productData = {
        ...form,
        price: { current: parseFloat(form.price.current) },
        inventory: { stock: parseInt(form.inventory.stock) },
        images: form.images.length > 0 ? form.images : [{ url: '/shop.webp', alt: form.name, isPrimary: true }]
      };
      
      if (editingId) {
        const res = await apiService.updateProduct(editingId, productData);
        setProducts(products => products.map(p => p._id === editingId ? res.product : p));
      } else {
        const res = await apiService.createProduct(productData);
        setProducts(products => [...products, res.product]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", description: "", category: "", price: { current: "" }, inventory: { stock: "" }, images: [] });
      setCategoryError("");
      setPriceError("");
      setStockError("");
    } catch (err) {
      // Handle server validation errors
      if (err.message && err.message.includes('category')) {
        setCategoryError("Invalid category. Please enter a valid category name.");
      } else if (err.details && Array.isArray(err.details)) {
        // Handle structured validation errors from server
        const categoryError = err.details.find(detail => detail.field === 'category');
        const priceError = err.details.find(detail => detail.field === 'price.current');
        const stockError = err.details.find(detail => detail.field === 'inventory.stock');
        
        if (categoryError) {
          setCategoryError(categoryError.message);
        } else if (priceError) {
          setPriceError(priceError.message);
        } else if (stockError) {
          setStockError(stockError.message);
        } else {
          setFormError(err.error || 'Validation failed. Please check your input.');
        }
      } else {
        setFormError(err.message || 'An error occurred while creating the product.');
      }
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
                  <td>₨{product.price.current}</td>
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
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input 
              className="bg-gray-100 p-2 rounded w-full" 
              name="name" 
              placeholder="Enter product name (e.g., Diamond Ring)" 
              value={form.name} 
              onChange={handleFormChange} 
              required 
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea 
              className="bg-gray-100 p-2 rounded w-full h-20 resize-none" 
              name="description" 
              placeholder="Describe your product in detail..." 
              value={form.description} 
              onChange={handleFormChange} 
              required 
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <input 
              className="bg-gray-100 p-2 rounded w-full" 
              name="category" 
              placeholder="Enter category (e.g., Rings, Necklaces, Watches)" 
              value={form.category} 
              onChange={handleFormChange} 
              required 
            />
            {categoryError && <div className="text-red-500 text-sm mt-1">{categoryError}</div>}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (PKR) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">₨</span>
              <input 
                className="bg-gray-100 p-2 rounded w-full pl-8" 
                name="price.current" 
                placeholder="0.00" 
                type="number" 
                step="0.01" 
                min="0.01" 
                max="999999" 
                value={form.price.current} 
                onChange={handleFormChange} 
                required 
              />
            </div>
            {priceError && <div className="text-red-500 text-sm mt-1">{priceError}</div>}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
            <input 
              className="bg-gray-100 p-2 rounded w-full" 
              name="inventory.stock" 
              placeholder="Enter available quantity (e.g., 10)" 
              type="number" 
              min="0" 
              max="99999" 
              value={form.inventory.stock} 
              onChange={handleFormChange} 
              required 
            />
            {stockError && <div className="text-red-500 text-sm mt-1">{stockError}</div>}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
            <input 
              type="file" 
              accept="image/*" 
              className="bg-gray-100 p-2 rounded w-full" 
              onChange={handleImageUpload} 
            />
            <p className="text-xs text-gray-500 mt-1">Upload product images (optional - default image will be used if none provided)</p>
            {form.images && form.images[0] && (
              <img src={form.images[0].url || form.images[0]} alt="Preview" className="h-24 mt-2 rounded" />
            )}
          </div>
          
          {formError && <div className="text-red-500 text-sm mb-4">{formError}</div>}
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded flex-1 disabled:opacity-60"
              disabled={formLoading}
            >
              {formLoading ? "Saving..." : (editingId ? "Update Product" : "Add Product")}
            </button>
            <button
              type="button"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm({ name: "", description: "", category: "", price: { current: "" }, inventory: { stock: "" }, images: [] });
                setCategoryError("");
                setPriceError("");
                setStockError("");
                setFormError(null);
              }}
            >
              Cancel
            </button>
          </div>
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
                <td>₨{order.totals?.total}</td>
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