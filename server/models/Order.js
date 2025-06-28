const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: false,
    unique: false
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: false
    },
    quantity: {
      type: Number,
      required: false,
      min: 1
    },
    price: {
      type: Number,
      required: false,
      min: 0
    },
    total: {
      type: Number,
      required: false,
      min: 0
    },
    variant: {
      name: String,
      value: String
    }
  }],
  billingAddress: {
    firstName: {
      type: String,
      required: false,
      trim: true
    },
    lastName: {
      type: String,
      required: false,
      trim: true
    },
    email: {
      type: String,
      required: false,
      trim: true
    },
    phone: {
      type: String,
      required: false,
      trim: true
    },
    street: {
      type: String,
      required: false,
      trim: true
    },
    city: {
      type: String,
      required: false,
      trim: true
    },
    state: {
      type: String,
      required: false,
      trim: true
    },
    zipCode: {
      type: String,
      required: false,
      trim: true
    },
    country: {
      type: String,
      required: false,
      trim: true
    }
  },
  shippingAddress: {
    firstName: {
      type: String,
      required: false,
      trim: true
    },
    lastName: {
      type: String,
      required: false,
      trim: true
    },
    email: {
      type: String,
      required: false,
      trim: true
    },
    phone: {
      type: String,
      required: false,
      trim: true
    },
    street: {
      type: String,
      required: false,
      trim: true
    },
    city: {
      type: String,
      required: false,
      trim: true
    },
    state: {
      type: String,
      required: false,
      trim: true
    },
    zipCode: {
      type: String,
      required: false,
      trim: true
    },
    country: {
      type: String,
      required: false,
      trim: true
    }
  },
  payment: {
    method: {
      type: String,
      required: false,
      enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'cash_on_delivery']
    },
    status: {
      type: String,
      required: false,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    amount: {
      type: Number,
      required: false,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
    },
    paidAt: Date
  },
  shipping: {
    method: {
      type: String,
      required: false,
      enum: ['standard', 'express', 'overnight', 'pickup']
    },
    cost: {
      type: Number,
      required: false,
      min: 0
    },
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date
  },
  totals: {
    subtotal: {
      type: Number,
      required: false,
      min: 0
    },
    tax: {
      type: Number,
      required: false,
      min: 0
    },
    shipping: {
      type: Number,
      required: false,
      min: 0
    },
    discount: {
      type: Number,
      required: false,
      min: 0,
      default: 0
    },
    total: {
      type: Number,
      required: false,
      min: 0
    }
  },
  status: {
    type: String,
    required: false,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'statusHistory.updatedByModel'
    },
    updatedByModel: {
      type: String,
      enum: ['User', 'Vendor', 'Admin']
    }
  }],
  notes: {
    customer: String,
    vendor: String,
    admin: String
  },
  refund: {
    amount: Number,
    reason: String,
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }
}, {
  timestamps: true
});

// Generate order number
orderSchema.pre('save', function(next) {
  try {
    console.log('=== ORDER PRE-SAVE MIDDLEWARE ===');
    console.log('Order document:', this);
    console.log('Current orderNumber:', this.orderNumber);
    console.log('Is new document:', this.isNew);
    
    if (!this.orderNumber) {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      this.orderNumber = `SHE-${timestamp}-${random}`;
      console.log('Generated orderNumber:', this.orderNumber);
    } else {
      console.log('OrderNumber already exists:', this.orderNumber);
    }
    next();
  } catch (error) {
    console.error('Error in order number generation:', error);
    next(error);
  }
});

// Calculate totals
orderSchema.pre('save', function(next) {
  try {
    console.log('=== TOTALS CALCULATION MIDDLEWARE ===');
    console.log('Items:', this.items);
    
    if (this.items && this.items.length > 0) {
      this.totals.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
      this.totals.tax = this.totals.subtotal * 0.1; // 10% tax
      this.totals.total = this.totals.subtotal + this.totals.tax + this.totals.shipping - this.totals.discount;
      
      console.log('Calculated totals:', {
        subtotal: this.totals.subtotal,
        tax: this.totals.tax,
        shipping: this.totals.shipping,
        discount: this.totals.discount,
        total: this.totals.total
      });
    } else {
      console.log('No items to calculate totals for');
    }
    next();
  } catch (error) {
    console.error('Error in totals calculation:', error);
    next(error);
  }
});

// Add status to history when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    orderNumber: this.orderNumber,
    totalItems: this.items.length,
    totalAmount: this.totals.total,
    status: this.status,
    createdAt: this.createdAt
  };
});

// Static method to get orders by status
orderSchema.statics.getByStatus = function(status, limit = 20, skip = 0) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('customer', 'firstName lastName email')
    .populate('items.product', 'name images price')
    .populate('items.vendor', 'businessName');
};

// Static method to get customer orders
orderSchema.statics.getCustomerOrders = function(customerId, limit = 20, skip = 0) {
  return this.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('items.product', 'name images price')
    .populate('items.vendor', 'businessName');
};

module.exports = mongoose.model('Order', orderSchema); 