const express = require('express');
const path = require('path');
const session = require('express-session');
// Clear require cache for connectDB module
delete require.cache[require.resolve('./config/connectDB')];
const { connectDB } = require('./config/connectDB');
const configViewEngine = require('./config/viewEngine');
const homeRoutes = require('./routes/home');
const taiKhoanRoutes = require('./routes/taiKhoan');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Config view engine
configViewEngine(app);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Add a middleware to make the session available to all views
app.use((req, res, next) => {
    res.locals.user = req.session && req.session.user ? req.session.user : null;
    next();
});

// Database connection
connectDB();

// Routes
app.use('/', homeRoutes);
app.use('/taikhoan', taiKhoanRoutes);

// Only in development mode, include admin reset route
if (process.env.NODE_ENV !== 'production') {
    const adminResetRoutes = require('./routes/homeAdminReset');
    app.use('/admin-tools', adminResetRoutes);
    console.log('Admin tools routes enabled for development');
}

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});