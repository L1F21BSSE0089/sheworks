import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";
import Spinner from "../components/Spinner";
import { Link } from "react-router-dom";

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
  const [touchStart, setTouchStart] = useState(null);
  const [imageProcessing, setImageProcessing] = useState(false);

  useEffect(() => {
    if (userType !== "vendor") return;
    setLoading(true);
    setError(null);
    
    // Use the new fast vendor products endpoint
    apiService.getVendorProducts()
      .then(res => {
        console.log('Vendor products loaded:', res.products?.length || 0);
        setProducts(res.products || []);
      })
      .catch(err => {
        console.error('Error loading vendor products:', err);
        setError(err.message);
      })
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
      images: product.images ? product.images.map(img => ({
        url: img.url,
        alt: img.alt || product.name,
        isPrimary: img.isPrimary || false
      })) : []
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
      // Prepare product data with images - optimize for performance
      const productData = {
        name: form.name,
        description: form.description,
        category: form.category,
        price: { current: parseFloat(form.price.current) },
        inventory: { stock: parseInt(form.inventory.stock) },
        images: form.images.length > 0 ? form.images.map((img, index) => ({
          url: img.url,
          alt: img.alt || form.name,
          isPrimary: index === 0 // First image is always primary
        })) : [{ url: '/shop.webp', alt: form.name, isPrimary: true }]
      };
      
      // Remove file objects to reduce payload size
      delete productData.file;
      
      console.log('Submitting product data (optimized):', {
        ...productData,
        images: productData.images.map(img => ({ ...img, url: img.url.substring(0, 30) + '...' }))
      });
      
      if (editingId) {
        const res = await apiService.updateProduct(editingId, productData);
        console.log('Update response:', res);
        setProducts(products => products.map(p => p._id === editingId ? res.product : p));
      } else {
        const res = await apiService.createProduct(productData);
        console.log('Create response:', res);
        setProducts(products => [...products, res.product]);
      }
      
      // Close form and reset
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", description: "", category: "", price: { current: "" }, inventory: { stock: "" }, images: [] });
      setCategoryError("");
      setPriceError("");
      setStockError("");
      setFormError(null);
      
      // Show success message
      if (showToast) {
        showToast(editingId ? "Product updated successfully!" : "Product added successfully!", "success");
      }
      
      // No need to refresh - we already updated the local state
      // The automatic refresh was causing performance issues
      
    } catch (err) {
      console.error('Product save error:', err);
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
    const files = Array.from(e.target.files);
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setFormError('Please upload only JPG, PNG, or WebP images.');
      return;
    }
    
    // Validate file sizes (max 2MB per image for better performance)
    const maxSize = 2 * 1024 * 1024; // 2MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setFormError('Images must be smaller than 2MB each for better performance.');
      return;
    }
    
    // Process each file and convert to base64 for preview
    const processFiles = async () => {
      setImageProcessing(true);
      const newImages = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Convert file to base64 for preview
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          newImages.push({
            url: base64,
            alt: file.name,
            isPrimary: form.images.length === 0 && i === 0, // First image is primary
            file: file, // Keep file reference
            originalName: file.name
          });
        } catch (error) {
          console.error('Error processing image:', error);
          setFormError(`Failed to process image: ${file.name}`);
          setImageProcessing(false);
          return;
        }
      }
      
      setForm(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
      setFormError(null);
      setImageProcessing(false);
    };
    
    processFiles();
  };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index).map((img, i) => ({
        ...img,
        isPrimary: i === 0 // Make first image primary if we remove the primary one
      }))
    }));
  };

  const setPrimaryImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    }));
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Your Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-2">Image</th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2 hidden md:table-cell">Category</th>
                  <th className="py-2 px-2">Price</th>
                  <th className="py-2 px-2 hidden md:table-cell">Stock</th>
                  <th className="py-2 px-2 hidden lg:table-cell">Sales</th>
                  <th className="py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr className="border-b hover:bg-gray-50 transition-colors" key={product._id}>
                    <td className="py-2 px-2">
                      <Link to={`/products/${product._id}`}>
                        <img 
                          src={product.images && product.images.length > 0 ? product.images[0].url : "/shop.webp"} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded border hover:scale-105 transition-transform cursor-pointer"
                        />
                      </Link>
                    </td>
                    <td className="py-2 px-2">
                      <Link 
                        to={`/products/${product._id}`} 
                        className="text-primary hover:text-primary-dark hover:underline cursor-pointer font-medium"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell">{product.category}</td>
                    <td className="py-2 px-2">₨{product.price.current}</td>
                    <td className="py-2 px-2 hidden md:table-cell">{product.inventory.stock}</td>
                    <td className="py-2 px-2 hidden lg:table-cell">{product.salesCount || 0}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <Link 
                          to={`/products/${product._id}`}
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          View Details
                        </Link>
                        <button className="text-primary underline text-sm" onClick={() => handleEdit(product)}>Edit</button>
                        <button className="text-red-500 underline text-sm" onClick={() => handleDelete(product._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingId ? "Edit Product" : "Add Product"}</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({ name: "", description: "", category: "", price: { current: "" }, inventory: { stock: "" }, images: [] });
                  setCategoryError("");
                  setPriceError("");
                  setStockError("");
                  setFormError(null);
                }}
                disabled={formLoading}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
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
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation" 
                    onChange={handleImageUpload} 
                    id="image-upload"
                    disabled={imageProcessing}
                  />
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                      imageProcessing 
                        ? 'border-primary bg-primary bg-opacity-10' 
                        : 'border-gray-300 hover:border-primary active:bg-gray-50 active:scale-95'
                    }`}
                  >
                    <div className="text-gray-500">
                      {imageProcessing ? (
                        <div className="flex flex-col items-center">
                          <svg className="animate-spin h-12 w-12 mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-sm font-medium">Processing images...</p>
                          <p className="text-xs text-gray-400 mt-1">Please wait</p>
                        </div>
                      ) : (
                        <>
                          <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="text-sm font-medium">Tap to upload images</p>
                          <p className="text-xs text-gray-400 mt-1">Choose from gallery or take a photo</p>
                          <p className="text-xs text-gray-400">JPG, PNG, WebP - max 2MB each</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Image Previews */}
                {form.images.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Images ({form.images.length})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {form.images.map((img, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={img.url} 
                            alt={img.alt} 
                            className={`w-full h-24 object-cover rounded-lg border-2 ${img.isPrimary ? 'border-primary' : 'border-gray-200'}`}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            {!img.isPrimary && (
                              <button
                                type="button"
                                onClick={() => setPrimaryImage(index)}
                                className="bg-blue-500 text-white p-1 rounded text-xs hover:bg-blue-600 transition-colors"
                                title="Set as primary"
                              >
                                ⭐
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600 transition-colors"
                              title="Remove image"
                            >
                              ✕
                            </button>
                          </div>
                          {img.isPrimary && (
                            <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-1 rounded">
                              Primary
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                            {img.originalName ? img.originalName.substring(0, 8) + '...' : 'Image'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {formError && <div className="text-red-500 text-sm mb-4">{formError}</div>}
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded flex-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingId ? "Updating..." : "Adding..."}
                    </span>
                  ) : (
                    editingId ? "Update Product" : "Add Product"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
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