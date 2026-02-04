const User = require('../models/User');

// Fix MongoDB username index (admin only - one-time fix)
exports.fixDatabaseIndexes = async (req, res) => {
  try {
    const db = User.db;
    const usersCollection = db.collection('users');

    // Check existing indexes
    const indexes = await usersCollection.indexes();

    // Check if username_1 index exists
    const usernameIndex = indexes.find(index => index.name === 'username_1');

    if (usernameIndex) {
      await usersCollection.dropIndex('username_1');
      res.json({
        message: 'username_1 index dropped successfully',
        droppedIndex: usernameIndex
      });
    } else {
      res.json({
        message: 'No username_1 index found - database is already fixed'
      });
    }
  } catch (error) {
    console.error('Error fixing database indexes:', error);
    res.status(500).json({
      error: 'Failed to fix database indexes',
      details: error.message
    });
  }
};

// Get current user (authenticated)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get seller profile with products and stats
exports.getSellerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const Product = require('../models/Product');
    const Review = require('../models/Review');

    // Get seller info
    const seller = await User.findById(id).select('-password');
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Check if user is a seller
    if (seller.role !== 'seller' && seller.role !== 'admin') {
      return res.status(400).json({ error: 'User is not a seller' });
    }

    // Get seller's products
    const products = await Product.find({ sellerId: id, isAvailable: true })
      .select('name price images category averageRating reviewCount stock createdAt')
      .sort({ createdAt: -1 });

    // Get product statistics
    const totalProducts = await Product.countDocuments({ sellerId: id });
    const activeProducts = await Product.countDocuments({ sellerId: id, isAvailable: true });

    // Get reviews for seller's products (to calculate seller rating)
    const sellerProducts = await Product.find({ sellerId: id }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    let averageRating = 0;
    let totalReviews = 0;

    if (productIds.length > 0) {
      const reviews = await Review.find({ product: { $in: productIds } });
      totalReviews = reviews.length;

      if (reviews.length > 0) {
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        averageRating = sum / reviews.length;
      }
    }

    res.json({
      seller: {
        id: seller._id,
        name: seller.name,
        email: seller.email,
        role: seller.role,
        createdAt: seller.createdAt
      },
      stats: {
        totalProducts,
        activeProducts,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        memberSince: seller.createdAt
      },
      products
    });
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['student', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Toggle user active status (admin only)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};
