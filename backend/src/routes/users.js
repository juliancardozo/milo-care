'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.patch('/preferences/reminderWindow', authenticate, async (req, res, next) => {
  try {
    const { reminderWindowDays } = req.body;

    if (!Number.isInteger(reminderWindowDays) || reminderWindowDays < 1 || reminderWindowDays > 60) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'reminderWindowDays must be an integer between 1 and 60.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    user.reminderWindowPreference = reminderWindowDays;
    await user.save();

    return res.json({ reminderWindowPreference: user.reminderWindowPreference });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
