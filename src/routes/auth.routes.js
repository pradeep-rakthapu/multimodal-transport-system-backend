import { Router } from 'express';
import passport from 'passport';
import { register, login, googleCallback } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { updateUserProfile } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);


router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  googleCallback
);

router.put('/profile', authenticate, updateUserProfile);

export default router;
