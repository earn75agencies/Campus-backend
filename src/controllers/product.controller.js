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

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, stock, isAvailable } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { name, description, price, stock, isAvailable } },
      { new: true }
    ).populate('sellerId', 'name email');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
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
