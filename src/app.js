import express from 'express';
import passport from './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import tsrtcRoutes from './routes/tsrtc.routes.js';
import journeyRoutes from './routes/journey.routes.js';
import metroRoutes from './routes/metro.route.js';
import session from 'express-session';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import razorpayRoutes from './routes/razorpay.route.js';
dotenv.config();

const app = express();

app.use(cors({
    origin: (origin, cb) => {
    if (!origin) return cb(null, true); 
    if (process.env.ALLOWED_URL.indexOf(origin) !== -1) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api', tsrtcRoutes);
app.use('/api/metro', metroRoutes);
app.use('/api', journeyRoutes);
app.use('/api', razorpayRoutes);

export default app;
