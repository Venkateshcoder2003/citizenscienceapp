const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId, role: decoded.role });

        if (!user) {
            throw new Error();
        }

        req.user = { userId: user._id, role: user.role };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};