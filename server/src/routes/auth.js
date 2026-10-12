import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Login route for all users
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && user.plainPassword && user.plainPassword === password) {
      isMatch = true;
    }
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = {
      id: user._id,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: '24h'
    });

    res.json({ token, user: payload });
  } catch (error) {
    next(error);
  }
});

// GET all users (Super Admin only)
router.get('/users', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// CREATE user (Super Admin only)
router.post('/users', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { username, password, role, permissions } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      plainPassword: password,
      role: role || 'user',
      permissions: permissions || []
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    next(error);
  }
});

// UPDATE user (Super Admin only)
router.put('/users/:id', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { username, password, role, permissions } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username.toLowerCase();
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.plainPassword = password;
    }
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// DELETE user (Super Admin only)
router.delete('/users/:id', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    // Prevent superadmin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
