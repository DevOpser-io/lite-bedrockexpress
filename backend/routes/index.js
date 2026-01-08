/**
 * Main application routes
 */
const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const chatRoutes = require('./chat');
const apiRoutes = require('./api');
const { ensureFullAuth } = require('../middleware/authMiddleware');

// Root route - landing page with builder interface (no auth required to view)
router.get('/', (req, res) => {
  // Render the landing builder - works for both authenticated and unauthenticated users
  res.render('landing-builder', {
    user: req.isAuthenticated && req.isAuthenticated() ? req.user : null,
    cspNonce: res.locals.cspNonce || ''
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Account settings page
router.get('/account', (req, res) => {
  // Ensure user is authenticated and MFA verified
  if (!req.isAuthenticated() || !req.session.mfaVerified) {
    req.session.returnTo = '/account';
    return res.redirect('/auth/login');
  }

  // Get current user
  const user = req.user;

  // Render account settings page
  res.render('account', {
    user: user,
    title: 'Account Settings',
    error: req.flash('error'),
    message: req.flash('message'),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// Mount API routes (no authentication required for basic info endpoints)
router.use('/api', apiRoutes);

// Mount auth routes
router.use('/auth', authRoutes);

// Apply full authentication (login + MFA) to all chat routes
router.use('/chat', ensureFullAuth);
router.use('/api/chat', ensureFullAuth);

// Mount chat routes (already have ensureAuthenticated in them)
router.use('/', chatRoutes);

module.exports = router;
