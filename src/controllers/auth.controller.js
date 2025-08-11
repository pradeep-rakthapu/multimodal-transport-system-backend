import { registerUser, loginUser, generateToken } from '../services/auth.service.js';
import { updateProfile } from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    // Validate request body
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const token = await registerUser(req.body);
    if (!token) {
      return res.status(400).json({ error: 'Registration failed' });  
    }
    res.status(201).json({ token });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    // Validate request body
    if (!req.body || !req.body.email || !req.body.password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const token = await loginUser(req.body);
    if (!token) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    return res.json({ token });
  } catch (err) {
    next(err);
  }
};

export const googleCallback = async (req, res) => {
    const token = generateToken(req.user);
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${encodeURIComponent(token)}`;
    res.redirect(redirectUrl);
};

export const logout = (req, res) => {
  
};

export const updateUserProfile = async (req, res, next) => {
  try {
    if(!req.user.id){
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const updatedUser = await updateProfile(req.user.id, req.body);
    res.json({
      message: 'Profile updated',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    });
  } catch (err) {
    next(err);
  }
};