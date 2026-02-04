require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

const mockProducts = [
  {
    name: 'Introduction to Algorithms',
    description: 'A comprehensive textbook on computer algorithms, widely used in universities worldwide. Excellent condition with minimal highlighting.',
    price: 2500,
    stock: 3,
    category: 'Books',
    images: ['https://placehold.co/400x400/4F46E5/white?text=Algorithms+Book'],
    isAvailable: true
  },
  {
    name: 'MacBook Pro 13" M1 (2021)',
    description: 'Used MacBook Pro in excellent condition. 16GB RAM, 512GB SSD. Includes original charger and box.',
    price: 95000,
    stock: 1,
    category: 'Electronics',
    images: ['https://placehold.co/400x400/6366F1/white?text=MacBook+Pro'],
    isAvailable: true
  },
  {
    name: 'Engineering Mathematics Hoodie',
    description: 'Comfortable cotton hoodie, size L. Worn only a few times. Perfect for campus classes.',
    price: 1200,
    stock: 5,
    category: 'Clothing',
    images: ['https://placehold.co/400x400/8B5CF6/white?text=Hoodie'],
    isAvailable: true
  },
  {
    name: 'Wireless Bluetooth Earbuds',
    description: 'High-quality wireless earbuds with noise cancellation. 20-hour battery life. Comes with charging case.',
    price: 3500,
    stock: 8,
    category: 'Electronics',
    images: ['https://placehold.co/400x400/EC4899/white?text=Wireless+Earbuds'],
    isAvailable: true
  },
  {
    name: 'Campus Backpack',
    description: 'Spacious backpack with laptop compartment. Water-resistant material. Multiple pockets for organization.',
    price: 2800,
    stock: 10,
    category: 'Accessories',
    images: ['https://placehold.co/400x400/F59E0B/white?text=Backpack'],
    isAvailable: true
  },
  {
    name: 'Organic Chemistry Textbook',
    description: 'Standard organic chemistry textbook. Good condition with some notes in margins.',
    price: 1800,
    stock: 4,
    category: 'Books',
    images: ['https://placehold.co/400x400/10B981/white?text=Chemistry+Book'],
    isAvailable: true
  },
  {
    name: 'Scientific Calculator Casio fx-991EX',
    description: 'Advanced scientific calculator perfect for engineering students. Solar powered with battery backup.',
    price: 4500,
    stock: 6,
    category: 'Electronics',
    images: ['https://placehold.co/400x400/3B82F6/white?text=Calculator'],
    isAvailable: true
  },
  {
    name: 'Denim Jeans Size 32',
    description: 'Slim fit denim jeans, blue color. Brand new with tags. Never worn.',
    price: 2200,
    stock: 2,
    category: 'Clothing',
    images: ['https://placehold.co/400x400/1E40AF/white?text=Denim+Jeans'],
    isAvailable: true
  },
  {
    name: 'Desk Lamp LED',
    description: 'Adjustable LED desk lamp with USB charging port. 3 brightness levels, touch control.',
    price: 1500,
    stock: 7,
    category: 'Accessories',
    images: ['https://placehold.co/400x400/EAB308/white?text=LED+Lamp'],
    isAvailable: true
  },
  {
    name: 'Physics for Scientists and Engineers',
    description: 'Calculus-based physics textbook. Serway & Jewett. 10th edition. Good condition.',
    price: 3000,
    stock: 2,
    category: 'Books',
    images: ['https://placehold.co/400x400/059669/white?text=Physics+Book'],
    isAvailable: true
  },
  {
    name: 'Portable Phone Charger 20000mAh',
    description: 'High capacity power bank with fast charging. Dual USB ports. LED indicator.',
    price: 3200,
    stock: 12,
    category: 'Electronics',
    images: ['https://placehold.co/400x400/DC2626/white?text=Power+Bank'],
    isAvailable: true
  },
  {
    name: 'Campus T-Shirt Collection',
    description: 'Set of 3 cotton t-shirts in different colors. Size M. Comfortable for daily wear.',
    price: 1800,
    stock: 15,
    category: 'Clothing',
    images: ['https://placehold.co/400x400/7C3AED/white?text=T-Shirts'],
    isAvailable: true
  },
  {
    name: 'Laptop Stand Adjustable',
    description: 'Ergonomic aluminum laptop stand. Height and angle adjustable. Foldable design.',
    price: 2500,
    stock: 9,
    category: 'Accessories',
    images: ['https://placehold.co/400x400/64748B/white?text=Laptop+Stand'],
    isAvailable: true
  },
  {
    name: 'Wireless Mouse Logitech',
    description: 'Ergonomic wireless mouse with silent click. Long battery life. USB receiver included.',
    price: 2800,
    stock: 8,
    category: 'Electronics',
    images: ['https://placehold.co/400x400/0EA5E9/white?text=Wireless+Mouse'],
    isAvailable: true
  },
  {
    name: 'Sneakers Size 42',
    description: 'Comfortable running shoes. White and blue color. Lightly used, in great condition.',
    price: 3500,
    stock: 3,
    category: 'Clothing',
    images: ['https://placehold.co/400x400/0891B2/white?text=Sneakers'],
    isAvailable: true
  },
  {
    name: 'Notebook Set Premium',
    description: 'Set of 5 premium notebooks with different covers. 200 pages each. Perfect for lectures.',
    price: 1200,
    stock: 20,
    category: 'Other',
    images: ['https://placehold.co/400x400/A855F7/white?text=Notebooks'],
    isAvailable: true
  }
];

async function seedProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get a seller user to associate products with
    const seller = await User.findOne({ role: { $in: ['seller', 'admin'] } });
    if (!seller) {
      console.error('No seller or admin user found. Please create a seller account first.');
      process.exit(1);
    }

    console.log(`Using seller: ${seller.name} (${seller.email})`);

    // Clear existing products (optional - comment out if you want to keep existing products)
    console.log('Clearing existing products...');
    await Product.deleteMany({});

    // Add mock products
    console.log('Adding mock products...');
    const products = mockProducts.map(product => ({
      ...product,
      sellerId: seller._id
    }));

    await Product.insertMany(products);
    console.log(`Successfully added ${products.length} mock products!`);

    // Display summary
    const count = await Product.countDocuments();
    console.log(`Total products in database: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts();
