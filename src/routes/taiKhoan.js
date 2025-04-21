const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/connectDB');
const bcrypt = require('bcryptjs');

// Show role selection form - temporarily remove admin restriction for development
router.get('/tao-tai-khoan', async (req, res) => {
    try {
        // For development, allow access without admin check
        // In production, uncomment the admin check below
        /*
        const isAdmin = req.session?.user?.vaitro === 'admin';
        if (!isAdmin) {
            return res.render('access-denied', {
                title: 'Truy cập bị từ chối',
                message: 'Chỉ có quản trị viên (admin) mới có quyền tạo tài khoản.'
            });
        }
        */

        // Get roles directly using a raw SQL query instead of models
        const [roles] = await sequelize.query(
            'SELECT id, vaitro FROM vaitro ORDER BY id'
        );

        res.render('role-selection', {
            title: 'Chọn vai trò',
            roles,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải trang chọn vai trò.',
            error
        });
    }
});

// Handle role selection - simplified version
router.post('/chon-vai-tro', (req, res) => {
    try {
        const { vaitro_id } = req.body;

        if (!vaitro_id) {
            return res.redirect('/taikhoan/tao-tai-khoan?error=Vui lòng chọn vai trò');
        }

        // Directly check the value without database lookup
        if (vaitro_id == 1) { // admin
            res.redirect(`/taikhoan/dangky-admin?vaitro_id=${vaitro_id}`);
        } else if (vaitro_id == 2) { // sinhvien
            res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}`);
        } else {
            res.redirect('/taikhoan/tao-tai-khoan?error=Vai trò không hợp lệ');
        }
    } catch (error) {
        console.error('Role selection error:', error);
        res.redirect('/taikhoan/tao-tai-khoan?error=Đã xảy ra lỗi, vui lòng thử lại');
    }
});

// Admin registration form
router.get('/dangky-admin', (req, res) => {
    res.render('admin-register', {
        title: 'Đăng ký Admin',
        vaitro_id: req.query.vaitro_id,
        error: req.query.error
    });
});

// Process admin registration
router.post('/dangky-admin', async (req, res) => {
    try {
        const { email, matkhau, xacnhan_matkhau, vaitro_id } = req.body;

        // Validation
        if (!email || !matkhau || !xacnhan_matkhau) {
            return res.redirect(`/taikhoan/dangky-admin?vaitro_id=${vaitro_id}&error=Vui lòng điền đầy đủ thông tin`);
        }

        if (matkhau.length < 6) {
            return res.redirect(`/taikhoan/dangky-admin?vaitro_id=${vaitro_id}&error=Mật khẩu phải có ít nhất 6 ký tự`);
        }

        if (matkhau !== xacnhan_matkhau) {
            return res.redirect(`/taikhoan/dangky-admin?vaitro_id=${vaitro_id}&error=Mật khẩu xác nhận không khớp`);
        }

        // Check if email already exists
        const [admins] = await sequelize.query(
            'SELECT * FROM admin WHERE email = ?',
            {
                replacements: [email],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (admins && admins.length > 0) {
            return res.redirect(`/taikhoan/dangky-admin?vaitro_id=${vaitro_id}&error=Email này đã được sử dụng`);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(matkhau, salt);

        // Insert new admin
        await sequelize.query(
            'INSERT INTO admin (email, matkhau, vaitro_id) VALUES (?, ?, ?)',
            {
                replacements: [email, hashedPassword, vaitro_id],
                type: sequelize.QueryTypes.INSERT
            }
        );

        // Redirect to success page or login
        res.redirect('/taikhoan/dangky-thanhcong?role=admin');

    } catch (error) {
        console.error('Admin registration error:', error);
        res.redirect(`/taikhoan/dangky-admin?vaitro_id=${req.body.vaitro_id}&error=Đã xảy ra lỗi, vui lòng thử lại`);
    }
});

// Registration success page
router.get('/dangky-thanhcong', (req, res) => {
    const role = req.query.role || '';
    res.render('registration-success', {
        title: 'Tạo tài khoản thành công',
        role: role,
        isAdmin: true // Always true since only admins can create accounts
    });
});

// Student registration form
router.get('/dangky-sinhvien', (req, res) => {
    res.render('student-register', {
        title: 'Đăng ký Sinh viên',
        vaitro_id: req.query.vaitro_id,
        error: req.query.error
    });
});

// Process student registration
router.post('/dangky-sinhvien', async (req, res) => {
    try {
        // Log the request body for debugging
        console.log("Form data received:", req.body);

        const {
            email, matkhau, xacnhan_matkhau, vaitro_id,
            msv, hovaten, sodienthoai, khoa, nienkhoa, gioitinh, ngaysinh
        } = req.body;

        // Path to save the image file would go here - we'll handle this in a simplified way
        let anhdaidien = '/images/default-avatar.png';

        // Validation - more specific error messages
        if (!email) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Vui lòng nhập email`);
        }
        if (!matkhau) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Vui lòng nhập mật khẩu`);
        }
        if (!msv) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Vui lòng nhập mã sinh viên`);
        }
        if (!hovaten) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Vui lòng nhập họ và tên`);
        }
        if (!khoa) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Vui lòng chọn khoa`);
        }
        if (!nienkhoa) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Vui lòng nhập niên khóa`);
        }

        if (matkhau.length < 6) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Mật khẩu phải có ít nhất 6 ký tự`);
        }

        if (matkhau !== xacnhan_matkhau) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Mật khẩu xác nhận không khớp`);
        }

        // Check if email already exists
        const [emailCheck] = await sequelize.query(
            'SELECT * FROM sinhvien WHERE email = ?',
            {
                replacements: [email],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (emailCheck && emailCheck.length > 0) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Email này đã được sử dụng`);
        }

        // Check if MSV already exists
        const [msvCheck] = await sequelize.query(
            'SELECT * FROM sinhvien WHERE msv = ?',
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (msvCheck && msvCheck.length > 0) {
            return res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${vaitro_id}&error=Mã sinh viên này đã được sử dụng`);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(matkhau, salt);

        // Insert new student - use simpler query to avoid potential SQL errors
        console.log("Inserting new student with values:", {
            msv, hovaten, sodienthoai, khoa, nienkhoa,
            gioitinh, ngaysinh, anhdaidien, vaitro_id, email
        });

        await sequelize.query(
            `INSERT INTO sinhvien 
            (msv, hovaten, sodienthoai, khoa, nienkhoa, gioitinh, ngaysinh, anhdaidien, vaitro_id, email, matkhau) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    msv,
                    hovaten,
                    sodienthoai || null,
                    khoa,
                    nienkhoa,
                    gioitinh || null,
                    ngaysinh || null,
                    anhdaidien,
                    vaitro_id,
                    email,
                    hashedPassword
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        // Redirect to success page
        res.redirect('/taikhoan/dangky-thanhcong?role=sinhvien');

    } catch (error) {
        console.error('Student registration error:', error);
        res.redirect(`/taikhoan/dangky-sinhvien?vaitro_id=${req.body.vaitro_id}&error=Đã xảy ra lỗi, vui lòng thử lại: ${error.message}`);
    }
});

// Show login role selection page
router.get('/dang-nhap', (req, res) => {
    res.render('login-role-selection', {
        title: 'Chọn vai trò đăng nhập',
        error: req.query.error
    });
});

// Handle login role selection
router.post('/chon-vai-tro-dangnhap', (req, res) => {
    try {
        const { vaitro } = req.body;

        if (!vaitro) {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng chọn vai trò');
        }

        if (vaitro === 'admin') {
            res.redirect('/taikhoan/dang-nhap-admin');
        } else if (vaitro === 'sinhvien') {
            res.redirect('/taikhoan/dang-nhap-sinhvien');
        } else {
            res.redirect('/taikhoan/dang-nhap?error=Vai trò không hợp lệ');
        }
    } catch (error) {
        console.error('Role selection error:', error);
        res.redirect('/taikhoan/dang-nhap?error=Đã xảy ra lỗi, vui lòng thử lại');
    }
});

// Admin login form
router.get('/dang-nhap-admin', (req, res) => {
    res.render('login-admin', {
        title: 'Đăng nhập Admin',
        error: req.query.error
    });
});

// Process admin login
router.post('/dang-nhap-admin', async (req, res) => {
    try {
        const { email, matkhau } = req.body;
        console.log("Admin login attempt for email:", email);

        if (!email || !matkhau) {
            return res.redirect('/taikhoan/dang-nhap-admin?error=Vui lòng điền đầy đủ thông tin');
        }

        // Debug connection
        try {
            await sequelize.authenticate();
            console.log('Database connection OK for admin login');
        } catch (dbError) {
            console.error('Database connection failed:', dbError);
            return res.redirect('/taikhoan/dang-nhap-admin?error=Lỗi kết nối cơ sở dữ liệu');
        }

        // Check admin accounts with detailed error handling
        let admins;
        try {
            // Make sure we're getting the data as a result array
            const result = await sequelize.query(
                'SELECT * FROM admin WHERE email = ?',
                {
                    replacements: [email],
                    type: sequelize.QueryTypes.SELECT
                }
            );

            // Log the raw result for debugging
            console.log("SQL query result:", JSON.stringify(result));

            admins = result; // result is already an array of objects

            console.log("Query executed successfully");
            console.log("Found admins:", admins ? admins.length : 0);
        } catch (queryError) {
            console.error('SQL query error:', queryError);
            return res.redirect('/taikhoan/dang-nhap-admin?error=Lỗi truy vấn dữ liệu: ' + queryError.message);
        }

        if (!admins || admins.length === 0) {
            return res.redirect('/taikhoan/dang-nhap-admin?error=Email không tồn tại');
        }

        const admin = admins[0];
        console.log("Admin found:", JSON.stringify(admin));

        // Check if admin has a password
        if (!admin.matkhau) {
            console.error("Admin has no password hash:", admin.id);
            return res.redirect('/taikhoan/dang-nhap-admin?error=Tài khoản chưa được thiết lập mật khẩu');
        }

        try {
            // Log the values used in the comparison for debugging
            console.log("Input password:", matkhau);
            console.log("Stored hash:", admin.matkhau);

            // Carefully handle the password comparison
            const validPassword = await bcrypt.compare(matkhau, admin.matkhau);
            console.log("Password validation result:", validPassword);

            if (!validPassword) {
                return res.redirect('/taikhoan/dang-nhap-admin?error=Mật khẩu không đúng');
            }

            // Set session data
            req.session.user = {
                id: admin.id,
                email: admin.email,
                vaitro: 'admin'
            };

            console.log("Session set:", req.session.user);

            // Redirect to admin dashboard
            console.log("Admin login successful, redirecting to dashboard");
            return res.redirect('/admin/dashboard');
        } catch (bcryptError) {
            console.error("bcrypt error:", bcryptError);
            return res.redirect('/taikhoan/dang-nhap-admin?error=Lỗi xác thực mật khẩu. Vui lòng thử lại.');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        return res.redirect('/taikhoan/dang-nhap-admin?error=Đã xảy ra lỗi, vui lòng thử lại');
    }
});

// Student login form
router.get('/dang-nhap-sinhvien', (req, res) => {
    res.render('login-sinhvien', {
        title: 'Đăng nhập Sinh viên',
        error: req.query.error
    });
});

// Process student login
router.post('/dang-nhap-sinhvien', async (req, res) => {
    try {
        const { email, matkhau } = req.body;
        console.log("Student login attempt for email:", email);

        if (!email || !matkhau) {
            return res.redirect('/taikhoan/dang-nhap-sinhvien?error=Vui lòng điền đầy đủ thông tin');
        }

        // Debug connection
        try {
            await sequelize.authenticate();
            console.log('Database connection OK for student login');
        } catch (dbError) {
            console.error('Database connection failed:', dbError);
            return res.redirect('/taikhoan/dang-nhap-sinhvien?error=Lỗi kết nối cơ sở dữ liệu');
        }

        // Check student accounts with detailed error handling
        let students;
        try {
            // Make sure we're getting the data as a result array
            const result = await sequelize.query(
                'SELECT * FROM sinhvien WHERE email = ?',
                {
                    replacements: [email],
                    type: sequelize.QueryTypes.SELECT
                }
            );

            // Log the raw result for debugging
            console.log("SQL query result:", JSON.stringify(result));

            students = result; // result is already an array of objects

            console.log("Query executed successfully");
            console.log("Found students:", students ? students.length : 0);
        } catch (queryError) {
            console.error('SQL query error:', queryError);
            return res.redirect('/taikhoan/dang-nhap-sinhvien?error=Lỗi truy vấn dữ liệu: ' + queryError.message);
        }

        if (!students || students.length === 0) {
            return res.redirect('/taikhoan/dang-nhap-sinhvien?error=Email không tồn tại');
        }

        const student = students[0];
        console.log("Student found:", JSON.stringify(student));

        // Check if student has a password
        if (!student.matkhau) {
            console.error("Student has no password hash:", student.msv);
            return res.redirect('/taikhoan/dang-nhap-sinhvien?error=Tài khoản chưa được thiết lập mật khẩu');
        }

        try {
            // Log the values used in the comparison for debugging
            console.log("Input password:", matkhau);
            console.log("Stored hash:", student.matkhau);

            // Password validation
            const validPassword = await bcrypt.compare(matkhau, student.matkhau);
            console.log("Password validation result:", validPassword);

            if (!validPassword) {
                return res.redirect('/taikhoan/dang-nhap-sinhvien?error=Mật khẩu không đúng');
            }

            // Set session data
            req.session.user = {
                id: student.msv,
                hovaten: student.hovaten,
                email: student.email,
                khoa: student.khoa,
                nienkhoa: student.nienkhoa,
                vaitro: 'sinhvien'
            };

            console.log("Session set:", req.session.user);

            // Redirect to student dashboard
            console.log("Student login successful, redirecting to dashboard");
            return res.redirect('/sinhvien/dashboard');
        } catch (bcryptError) {
            console.error("bcrypt error:", bcryptError);
            return res.redirect('/taikhoan/dang-nhap-sinhvien?error=Lỗi xác thực mật khẩu. Vui lòng thử lại.');
        }
    } catch (error) {
        console.error('Student login error:', error);
        res.redirect('/taikhoan/dang-nhap-sinhvien?error=Đã xảy ra lỗi, vui lòng thử lại');
    }
});

// Create an admin reset route for testing
router.get('/reset-admin-pw', async (req, res) => {
    try {
        const email = 'admin@example.com';
        const plainPassword = 'admin123';

        // Generate hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        // Update or insert admin
        const [admins] = await sequelize.query(
            'SELECT * FROM admin WHERE email = ?',
            {
                replacements: [email],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (admins && admins.length > 0) {
            // Update existing admin
            await sequelize.query(
                'UPDATE admin SET matkhau = ? WHERE email = ?',
                {
                    replacements: [hashedPassword, email],
                    type: sequelize.QueryTypes.UPDATE
                }
            );
            res.send(`Admin password reset to "${plainPassword}". You can now login with email: ${email}`);
        } else {
            // Insert new admin
            await sequelize.query(
                'INSERT INTO admin (email, matkhau, vaitro_id) VALUES (?, ?, ?)',
                {
                    replacements: [email, hashedPassword, 1],
                    type: sequelize.QueryTypes.INSERT
                }
            );
            res.send(`New admin created with email: ${email} and password: "${plainPassword}"`);
        }
    } catch (error) {
        console.error('Admin reset error:', error);
        res.status(500).send('Error: ' + error.message);
    }
});

// Placeholder routes for dashboards until they are implemented
router.get('/admin/dashboard', (req, res) => {
    try {
        if (!req.session.user) {
            console.log("No session user found, redirecting to login");
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập');
        }

        if (req.session.user.vaitro !== 'admin') {
            console.log("User is not admin, redirecting to login");
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        console.log("Rendering admin dashboard for user:", req.session.user.email);
        res.send(`
            <h1>Admin Dashboard</h1>
            <p>Xin chào admin: ${req.session.user.email}</p>
            <p>Đăng nhập thành công!</p>
            <a href="/taikhoan/dang-xuat">Đăng xuất</a>
        `);
    } catch (error) {
        console.error("Error in admin dashboard:", error);
        res.status(500).send("Đã xảy ra lỗi khi tải trang admin dashboard");
    }
});

router.get('/sinhvien/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.vaitro !== 'sinhvien') {
        return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản sinh viên');
    }
    res.send('Sinh viên Dashboard - Coming Soon');
});

// Logout route
router.get('/dang-xuat', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
