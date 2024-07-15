const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');

// Sign up route
router.post(
  '/signup',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('password', 'Password is required and should be at least 6 characters long').isLength({ min: 6 }),
    check('phone', 'Phone is required and should be a valid phone number').isMobilePhone(),
    check('name', 'Name is required').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, phone, name } = req.body;

    try {
      let user = await User.findOne({ username });
      if (user) {
        return res.status(400).json({ status: 400,message: 'Username already exists', errors:[] });
      }

      user = new User({ username, password, phone, name });
      await user.save();

      const payload = { id: user.id, username: user.username };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4d' });

      res.json({
        status:201,
        message:"Sign up successfully",
        data:{ 
            token,
            name : user.name,
            username : user.username,
            phone : user.phone
        }
      });
    } catch (err) {
      if(err.code=="11000"){
        res.status(400).send({
            status:400,
            message:"Phone number already registered"
        });
      }else{
        res.status(500).send({
            status:500,
            message:'Server error'
        });
      }
    }
  }
);

// Login route
router.post(
  '/login',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('password', 'Password is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      let user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ message: 'Invalid username', status:400 });
      }

      const isMatch = await user.isValidPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid password', status:400 });
      }

      const payload = { id: user.id, username: user.username };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4d' });

      res.json({
        status:201,
        message:"Login Successful",
        data:{ token ,name :user.name,username:user.username,phone:user.phone}
      });
    } catch (err) {
      console.log("🚀 ~ err:", err)
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);


// Protected route
router.get('/protected', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ msg: 'You are authorized', user: req.user });
});

module.exports = router;
