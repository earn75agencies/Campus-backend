const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isAvailable: true })
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'name email');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, images, category } = req.body;

    console.log('Creating product:', { name, price, stock, sellerId: req.user._id });

    const product = new Product({
      name,
      description,
      price,
      stock,
      images: images || [],
      category,
      sellerId: req.user._id
    });

    await product.save();
    await product.populate('sellerId', 'name email');

    console.log('Product created successfully:', product._id);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, stock, isAvailable } = req.body;

    // Find product first to check ownership
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user owns the product or is admin
    if (product.sellerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only modify your own products' });
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { name, description, price, stock, isAvailable } },
      { new: true }
    ).populate('sellerId', 'name email');

    console.log('Product updated successfully:', updatedProduct._id);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    // Find product first to check ownership
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user owns the product or is admin
    if (product.sellerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own products' });
    }

    await Product.findByIdAndDelete(req.params.id);

    console.log('Product deleted successfully:', req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const query = req.params.query;
    const products = await Product.find({
      name: { $regex: query, $options: 'i' },
      isAvailable: true
    }).populate('sellerId', 'name email');

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
