const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const user = new User({ username, email, password, role });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// router.post('/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email });

//         if (!user || !(await bcrypt.compare(password, user.password))) {
//             return res.status(401).json({ error: 'Invalid credentials' });
//         }

//         const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
//         res.json({ token, userId: user._id, role: user.role });
//     } catch (error) {
//         res.status(500).json({ error: 'Login failed' });
//     }
// });

router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        // Check if user exists
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if the role matches
        if (user.role !== role) {
            return res.status(401).json({
                error: `Invalid role selected. You are registered as a ${user.role}. Please select the correct role.`
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Send successful response
        res.json({
            token,
            userId: user._id,
            role: user.role
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;