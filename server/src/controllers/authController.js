const User = require('../models/User');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/helpers');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json(
        formatErrorResponse('User already exists with this email', 'USER_EXISTS')
      );
    }

    // Create user
    const user = new User({
      name,
      email,
      password
    });

    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    res.status(201).json(
      formatSuccessResponse(
        {
          user: user.toJSON(),
          token
        },
        'User registered successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json(
        formatErrorResponse('Please provide email and password', 'MISSING_CREDENTIALS')
      );
    }

    // Find user and check password
    const user = await User.findByCredentials(email, password);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    res.json(
      formatSuccessResponse(
        {
          user: user.toJSON(),
          token
        },
        'Login successful'
      )
    );
  } catch (error) {
    if (error.message === 'Invalid login credentials') {
      return res.status(401).json(
        formatErrorResponse('Invalid email or password', 'INVALID_CREDENTIALS')
      );
    }
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json(
        formatErrorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    res.json(
      formatSuccessResponse(user.toJSON(), 'User profile retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
const updateMe = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json(
        formatErrorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;

    await user.save();

    res.json(
      formatSuccessResponse(user.toJSON(), 'Profile updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(
        formatErrorResponse('Please provide current and new password', 'MISSING_PASSWORDS')
      );
    }

    // Find user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json(
        formatErrorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json(
        formatErrorResponse('Current password is incorrect', 'INCORRECT_PASSWORD')
      );
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json(
      formatSuccessResponse(null, 'Password changed successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  // In a real app, you might want to blacklist the token
  // For now, just send success response
  res.json(
    formatSuccessResponse(null, 'Logged out successfully')
  );
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const users = await User.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json(
      formatSuccessResponse(
        {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        },
        'Users retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/auth/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json(
        formatErrorResponse('Cannot delete your own account', 'CANNOT_DELETE_SELF')
      );
    }

    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json(
        formatErrorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    res.json(
      formatSuccessResponse(null, 'User deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  logout,
  getAllUsers,
  deleteUser
};