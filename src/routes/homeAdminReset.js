const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/connectDB');
const bcrypt = require('bcryptjs');

// A temporary route to reset admin password - remove in production
router.get('/reset-admin', async (req, res) => {
    try {
        // Generate a new admin password
        const plainPassword = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        // Check if admin exists
        const [admins] = await sequelize.query(
            'SELECT * FROM admin WHERE email = ?',
            {
                replacements: ['admin@example.com'],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (admins && admins.length > 0) {
            // Update existing admin
            await sequelize.query(
                'UPDATE admin SET matkhau = ? WHERE email = ?',
                {
                    replacements: [hashedPassword, 'admin@example.com'],
                    type: sequelize.QueryTypes.UPDATE
                }
            );
            res.send(`Admin password reset successful. New password: ${plainPassword}`);
        } else {
            // Create new admin
            await sequelize.query(
                'INSERT INTO admin (email, matkhau, vaitro_id) VALUES (?, ?, ?)',
                {
                    replacements: ['admin@example.com', hashedPassword, 1],
                    type: sequelize.QueryTypes.INSERT
                }
            );
            res.send(`New admin created. Email: admin@example.com, Password: ${plainPassword}`);
        }
    } catch (error) {
        console.error('Admin reset error:', error);
        res.status(500).send('Error resetting admin: ' + error.message);
    }
});

module.exports = router;
