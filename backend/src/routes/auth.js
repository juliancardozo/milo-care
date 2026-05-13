'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const EmailService = require('../services/EmailService');
const authenticate = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Helpers ──────────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, tier: user.tier },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function userResponse(user) {
  return { id: user._id, name: user.name, email: user.email, tier: user.tier };
}

// ── Rate limiter for password reset ──────────────────────────────────────────

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => (req.body.email || '').toLowerCase(),
  handler: (_req, res) =>
    res.status(429).json({ code: 'RATE_LIMIT_EXCEEDED', message: 'Too many reset requests. Try again in 1 hour.' }),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.body.email,
});

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'name, email, and password are required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid email format.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters.' });
    }
    if (name.trim().length < 1 || name.trim().length > 100) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name must be 1–100 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ code: 'EMAIL_ALREADY_EXISTS', message: 'This email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });

    const token = signToken(user);
    return res.status(201).json({ user: userResponse(user), token });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const valid = user && (await bcrypt.compare(password, user.passwordHash));

    if (!valid) {
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({ user: userResponse(user), token });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

router.post('/forgot-password', resetLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'A valid email is required.' });
    }

    // Always respond 200 to prevent email enumeration
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      await PasswordResetToken.deleteMany({ userId: user._id });

      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(plainToken, SALT_ROUNDS);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await PasswordResetToken.create({ userId: user._id, tokenHash, expiresAt });

      const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${plainToken}&userId=${user._id}`;
      await EmailService.sendPasswordReset({ to: user.email, resetUrl });
    }

    return res.json({ message: 'If an account with this email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, userId, newPassword } = req.body;

    if (!token || !userId || !newPassword) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'token, userId, and newPassword are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters.' });
    }

    const resetToken = await PasswordResetToken.findOne({
      userId,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return res.status(400).json({ code: 'INVALID_RESET_TOKEN', message: 'Reset link is invalid or has expired.' });
    }

    const valid = await bcrypt.compare(token, resetToken.tokenHash);
    if (!valid) {
      return res.status(400).json({ code: 'INVALID_RESET_TOKEN', message: 'Reset link is invalid or has expired.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.findByIdAndUpdate(userId, { passwordHash });
    resetToken.usedAt = new Date();
    await resetToken.save();

    return res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

router.post('/logout', authenticate, (_req, res) => {
  return res.json({ message: 'Logged out successfully.' });
});

// ── PATCH /api/auth/me/notifications ────────────────────────────────────────

router.patch('/me/notifications', authenticate, async (req, res, next) => {
  try {
    const { enabled, vaccinationWindowDays, appointmentWindowHours } = req.body;

    const update = {};
    if (typeof enabled === 'boolean') update['notificationPreferences.enabled'] = enabled;
    if (vaccinationWindowDays !== undefined) {
      if (!Number.isInteger(vaccinationWindowDays) || vaccinationWindowDays < 1 || vaccinationWindowDays > 30) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'vaccinationWindowDays must be an integer 1–30.' });
      }
      update['notificationPreferences.vaccinationWindowDays'] = vaccinationWindowDays;
    }
    if (appointmentWindowHours !== undefined) {
      if (!Number.isInteger(appointmentWindowHours) || appointmentWindowHours < 1 || appointmentWindowHours > 168) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'appointmentWindowHours must be an integer 1–168.' });
      }
      update['notificationPreferences.appointmentWindowHours'] = appointmentWindowHours;
    }

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true });
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    return res.json({ notificationPreferences: user.notificationPreferences });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/auth/me ───────────────────────────────────────────────────────

router.delete('/me', authenticate, async (req, res, next) => {
  try {
    await PasswordResetToken.deleteMany({ userId: req.user.id });
    await User.findByIdAndDelete(req.user.id);
    return res.json({ message: 'Account deleted. All data has been permanently removed.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
