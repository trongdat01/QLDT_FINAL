const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('home', {
        title: 'Hệ thống Quản lý Đào tạo Đại học'
    });
});

// Add a route for error testing
router.get('/test-error', (req, res) => {
    try {
        // Intentional error for testing
        throw new Error('This is a test error');
    } catch (error) {
        res.status(500).render('error', {
            message: 'Lỗi thử nghiệm',
            error
        });
    }
});

module.exports = router;
