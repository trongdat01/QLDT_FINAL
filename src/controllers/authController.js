const db = require('../models');

// Show registration form with role selection
exports.showRegisterForm = async (req, res) => {
    try {
        const roles = await db.VaiTro.findAll();

        res.render('register', {
            title: 'Đăng ký tài khoản',
            roles,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).send('Đã xảy ra lỗi khi tải trang đăng ký.');
    }
};

// Process registration form
exports.register = async (req, res) => {
    try {
        const { email, matkhau, vaitro_id } = req.body;

        if (!email || !matkhau || !vaitro_id) {
            return res.redirect('/taikhoan/dangky?error=Vui lòng điền đầy đủ thông tin');
        }

        // Get role information
        const role = await db.VaiTro.findByPk(vaitro_id);
        if (!role) {
            return res.redirect('/taikhoan/dangky?error=Vai trò không hợp lệ');
        }

        // Based on role, redirect to appropriate form
        if (role.vaitro === 'admin') {
            // Redirect to admin registration form
            res.redirect(`/taikhoan/dangky-admin?email=${email}&matkhau=${matkhau}&vaitro_id=${vaitro_id}`);
        } else if (role.vaitro === 'sinhvien') {
            // Redirect to student registration form
            res.redirect(`/taikhoan/dangky-sinhvien?email=${email}&matkhau=${matkhau}&vaitro_id=${vaitro_id}`);
        } else {
            res.redirect('/taikhoan/dangky?error=Vai trò không hợp lệ');
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.redirect('/taikhoan/dangky?error=Đã xảy ra lỗi, vui lòng thử lại');
    }
};
