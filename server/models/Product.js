const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['rings', 'necklaces', 'earrings', 'bracelets', 'watches', 'handbags', 'scarves', 'other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  price: {
    current: {
      type: Number,
      required: true,
      min: 0
    },
    original: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
    }
  },
  images: [{
    url: {
      type: String,
      required: false
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  specifications: {
    material: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      trim: true
    },
    size: {
      type: String,
      trim: true
    },
    weight: {
      type: Number,
      min: 0
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    gemstones: [{
      type: String,
      trim: true
    }],
    metal: {
      type: String,
      trim: true
    },
    purity: {
      type: String,
      trim: true
    }
  },
  inventory: {
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    sku: {
      type: String,
      unique: true,
      trim: true
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    }
  },
  variants: [{
    name: String,
    value: String,
    price: Number,
    stock: Number
  }],
  tags: [{
    type: String,
    trim: true
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 1000
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock', 'discontinued'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  discount: {
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    validUntil: Date
  },
  shipping: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    freeShipping: {
      type: Boolean,
      default: false
    }
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Generate SKU if not provided
productSchema.pre('save', function(next) {
  if (!this.inventory.sku) {
    this.inventory.sku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Calculate discount price
productSchema.virtual('discountedPrice').get(function() {
  if (this.discount && this.discount.percentage && this.discount.validUntil > new Date()) {
    return this.price.current * (1 - this.discount.percentage / 100);
  }
  return this.price.current;
});

// Check if product is on sale
productSchema.virtual('isOnSale').get(function() {
  return this.discount && this.discount.percentage && this.discount.validUntil > new Date();
});

// Check if product is in stock
productSchema.virtual('inStock').get(function() {
  return this.inventory.stock > 0 && this.status === 'active';
});

// Index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema); 