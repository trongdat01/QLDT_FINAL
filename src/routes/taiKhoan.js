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

            // Redirect to admin dashboard - update this path
            console.log("Admin login successful, redirecting to dashboard");
            return res.redirect('/taikhoan/admin/dashboard');
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

// Admin dashboard route - move this under /taikhoan prefix
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
        res.render('admin/dashboard', {
            title: 'Bảng điều khiển Admin',
            user: req.session.user
        });
    } catch (error) {
        console.error("Error in admin dashboard:", error);
        res.status(500).send("Đã xảy ra lỗi khi tải trang admin dashboard");
    }
});

// Create a route to check if the dsdangkyhocphan table exists and create it if needed
router.get('/admin/create-registration-table', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if table exists
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'dsdangkyhocphan'",
            { type: sequelize.QueryTypes.SELECT }
        );

        if (tableCheck && tableCheck.length > 0) {
            return res.send('Table dsdangkyhocphan already exists. <a href="/taikhoan/admin/manage-courses">Go back to course management</a>');
        }

        // Create the table
        await sequelize.query(`
            CREATE TABLE dsdangkyhocphan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                msv VARCHAR(20) NOT NULL,
                mahocphan VARCHAR(20) NOT NULL,
                ngaydangky TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                trangthaidangky ENUM('đã đăng ký', 'chưa đăng ký', 'đã hủy') DEFAULT 'chưa đăng ký',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (msv) REFERENCES sinhvien(msv),
                FOREIGN KEY (mahocphan) REFERENCES dangkyhocphan(mahocphan),
                UNIQUE KEY (msv, mahocphan)
            )
        `);

        return res.send('Table dsdangkyhocphan created successfully. <a href="/taikhoan/admin/manage-courses">Go back to course management</a>');
    } catch (error) {
        console.error('Create registration table error:', error);
        return res.status(500).send('Error: ' + error.message);
    }
});

// Modify the database schema to include "đã hủy" in the enum values
router.get('/admin/update-registration-table', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Update the table structure to add "đã hủy" to the enum
        await sequelize.query(`
            ALTER TABLE dsdangkyhocphan 
            MODIFY COLUMN trangthaidangky ENUM('đã đăng ký', 'chưa đăng ký', 'đã hủy') DEFAULT 'chưa đăng ký'
        `);

        return res.send('Table dsdangkyhocphan updated successfully. <a href="/taikhoan/admin/manage-courses">Go back to course management</a>');
    } catch (error) {
        console.error('Update registration table error:', error);
        return res.status(500).send('Error: ' + error.message);
    }
});

// Admin management page
router.get('/admin/manage-admins', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Debug the connection
        console.log('Fetching admin accounts...');

        // Fetch all admin accounts - fix query syntax
        let admins = [];
        try {
            // Use proper query structure
            admins = await sequelize.query(
                'SELECT a.*, v.vaitro FROM admin a JOIN vaitro v ON a.vaitro_id = v.id ORDER BY a.id',
                {
                    type: sequelize.QueryTypes.SELECT
                }
            );

            console.log('Fetched admin data:', admins);
        } catch (queryError) {
            console.error('SQL query error:', queryError);
            return res.status(500).render('error', {
                message: 'Lỗi truy vấn dữ liệu admin',
                error: queryError
            });
        }

        res.render('admin/manage-admins', {
            title: 'Quản lý Quản trị viên',
            user: req.session.user,
            admins,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Fetch admins error:', error);
        res.status(500).send('Đã xảy ra lỗi khi tải trang: ' + error.message);
    }
});

// Add new admin - Update this route to include validation and more fields
router.post('/admin/add-admin', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { email, matkhau, xacnhan_matkhau } = req.body;

        // Enhanced validation (similar to original admin registration)
        if (!email || !matkhau || !xacnhan_matkhau) {
            return res.redirect('/taikhoan/admin/manage-admins?error=Vui lòng điền đầy đủ thông tin');
        }

        if (matkhau.length < 6) {
            return res.redirect('/taikhoan/admin/manage-admins?error=Mật khẩu phải có ít nhất 6 ký tự');
        }

        if (matkhau !== xacnhan_matkhau) {
            return res.redirect('/taikhoan/admin/manage-admins?error=Mật khẩu xác nhận không khớp');
        }

        // Check if email already exists
        const [existingAdmins] = await sequelize.query(
            'SELECT * FROM admin WHERE email = ?',
            {
                replacements: [email],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (existingAdmins && existingAdmins.length > 0) {
            return res.redirect('/taikhoan/admin/manage-admins?error=Email này đã được sử dụng');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(matkhau, salt);

        // Insert new admin
        await sequelize.query(
            'INSERT INTO admin (email, matkhau, vaitro_id) VALUES (?, ?, ?)',
            {
                replacements: [email, hashedPassword, 1], // 1 = admin role
                type: sequelize.QueryTypes.INSERT
            }
        );

        res.redirect('/taikhoan/admin/manage-admins?success=Thêm quản trị viên thành công');
    } catch (error) {
        console.error('Add admin error:', error);
        res.redirect('/taikhoan/admin/manage-admins?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Delete admin
router.post('/admin/delete-admin', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { adminId } = req.body;

        // Don't allow deleting your own account
        if (adminId == req.session.user.id) {
            return res.redirect('/taikhoan/admin/manage-admins?error=Không thể xóa tài khoản đang sử dụng');
        }

        // Delete the admin account
        await sequelize.query(
            'DELETE FROM admin WHERE id = ?',
            {
                replacements: [adminId],
                type: sequelize.QueryTypes.DELETE
            }
        );

        res.redirect('/taikhoan/admin/manage-admins?success=Xóa quản trị viên thành công');
    } catch (error) {
        console.error('Delete admin error:', error);
        res.redirect('/taikhoan/admin/manage-admins?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Student management page
router.get('/admin/manage-students', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        console.log('Fetching student accounts...');

        // Fetch all student accounts
        let students = [];
        try {
            students = await sequelize.query(
                'SELECT s.*, v.vaitro FROM sinhvien s JOIN vaitro v ON s.vaitro_id = v.id ORDER BY s.msv',
                {
                    type: sequelize.QueryTypes.SELECT
                }
            );

            console.log(`Fetched ${students.length} student records`);
        } catch (queryError) {
            console.error('SQL query error:', queryError);
            return res.status(500).render('error', {
                message: 'Lỗi truy vấn dữ liệu sinh viên',
                error: queryError
            });
        }

        res.render('admin/manage-students', {
            title: 'Quản lý Sinh viên',
            user: req.session.user,
            students,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Fetch students error:', error);
        res.status(500).send('Đã xảy ra lỗi khi tải trang: ' + error.message);
    }
});

// Add new student
router.post('/admin/add-student', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            email, matkhau, xacnhan_matkhau,
            msv, hovaten, sodienthoai, khoa, nienkhoa, gioitinh, ngaysinh
        } = req.body;

        // Basic validation
        if (!email || !matkhau || !xacnhan_matkhau || !msv || !hovaten || !khoa || !nienkhoa) {
            return res.redirect('/taikhoan/admin/manage-students?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        if (matkhau.length < 6) {
            return res.redirect('/taikhoan/admin/manage-students?error=Mật khẩu phải có ít nhất 6 ký tự');
        }

        if (matkhau !== xacnhan_matkhau) {
            return res.redirect('/taikhoan/admin/manage-students?error=Mật khẩu xác nhận không khớp');
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
            return res.redirect('/taikhoan/admin/manage-students?error=Email này đã được sử dụng');
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
            return res.redirect('/taikhoan/admin/manage-students?error=Mã sinh viên này đã được sử dụng');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(matkhau, salt);

        // Default avatar path
        let anhdaidien = '/images/default-avatar.png';

        // Insert new student
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
                    2, // 2 = student role
                    email,
                    hashedPassword
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        res.redirect('/taikhoan/admin/manage-students?success=Thêm sinh viên thành công');
    } catch (error) {
        console.error('Add student error:', error);
        res.redirect('/taikhoan/admin/manage-students?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Delete student
router.post('/admin/delete-student', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { studentMsv } = req.body;

        // Delete the student account
        await sequelize.query(
            'DELETE FROM sinhvien WHERE msv = ?',
            {
                replacements: [studentMsv],
                type: sequelize.QueryTypes.DELETE
            }
        );

        res.redirect('/taikhoan/admin/manage-students?success=Xóa sinh viên thành công');
    } catch (error) {
        console.error('Delete student error:', error);
        res.redirect('/taikhoan/admin/manage-students?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Edit student
router.post('/admin/edit-student', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            msv, hovaten, email, sodienthoai,
            khoa, nienkhoa, gioitinh, ngaysinh,
            matkhau, xacnhan_matkhau
        } = req.body;

        // Basic validation
        if (!msv || !hovaten || !email || !khoa || !nienkhoa) {
            return res.redirect('/taikhoan/admin/manage-students?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        // Check if email is already used by another student
        const [emailCheck] = await sequelize.query(
            'SELECT * FROM sinhvien WHERE email = ? AND msv != ?',
            {
                replacements: [email, msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (emailCheck && emailCheck.length > 0) {
            return res.redirect('/taikhoan/admin/manage-students?error=Email này đã được sử dụng bởi sinh viên khác');
        }

        // If password is provided, validate it
        if (matkhau) {
            if (matkhau.length < 6) {
                return res.redirect('/taikhoan/admin/manage-students?error=Mật khẩu phải có ít nhất 6 ký tự');
            }

            if (matkhau !== xacnhan_matkhau) {
                return res.redirect('/taikhoan/admin/manage-students?error=Mật khẩu xác nhận không khớp');
            }

            // Update student with new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(matkhau, salt);

            await sequelize.query(
                `UPDATE sinhvien SET 
                 hovaten = ?, email = ?, sodienthoai = ?, 
                 khoa = ?, nienkhoa = ?, gioitinh = ?, 
                 ngaysinh = ?, matkhau = ? 
                 WHERE msv = ?`,
                {
                    replacements: [
                        hovaten, email, sodienthoai || null,
                        khoa, nienkhoa, gioitinh || null,
                        ngaysinh || null, hashedPassword, msv
                    ],
                    type: sequelize.QueryTypes.UPDATE
                }
            );
        } else {
            // Update student without changing password
            await sequelize.query(
                `UPDATE sinhvien SET 
                 hovaten = ?, email = ?, sodienthoai = ?, 
                 khoa = ?, nienkhoa = ?, gioitinh = ?, 
                 ngaysinh = ? 
                 WHERE msv = ?`,
                {
                    replacements: [
                        hovaten, email, sodienthoai || null,
                        khoa, nienkhoa, gioitinh || null,
                        ngaysinh || null, msv
                    ],
                    type: sequelize.QueryTypes.UPDATE
                }
            );
        }

        res.redirect('/taikhoan/admin/manage-students?success=Cập nhật thông tin sinh viên thành công');
    } catch (error) {
        console.error('Edit student error:', error);
        res.redirect('/taikhoan/admin/manage-students?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Get student details for edit
router.get('/admin/get-student/:msv', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { msv } = req.params;

        const [student] = await sequelize.query(
            'SELECT * FROM sinhvien WHERE msv = ?',
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!student) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
        }

        // Don't send password
        delete student.matkhau;

        res.json({ success: true, student });
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// News management page
router.get('/admin/manage-news', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            console.log('Unauthorized access attempt to news management');
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        console.log('Fetching news for admin:', req.session.user.email);

        // Ensure the tintuc table exists in the database
        const news = await sequelize.query(
            'SELECT * FROM tintuc ORDER BY ngaydang DESC',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        console.log(`Fetched ${news.length} news articles`);

        return res.render('admin/manage-news', {
            title: 'Quản lý Tin tức',
            user: req.session.user,
            news: news || [],
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Fetch news error:', error);
        return res.status(500).send('Đã xảy ra lỗi khi tải trang: ' + error.message);
    }
});

// Add new news article
router.post('/admin/add-news', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { tieude, danhmuc, linkbaidang, anhminhhoa } = req.body;
        console.log('Adding news article:', { tieude, danhmuc });

        // Basic validation
        if (!tieude || !danhmuc || !linkbaidang) {
            return res.redirect('/taikhoan/admin/manage-news?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        // Set default image if none provided
        const imageUrl = anhminhhoa || '/images/default-news.jpg';

        // Insert new news article
        await sequelize.query(
            'INSERT INTO tintuc (tieude, danhmuc, anhminhhoa, linkbaidang) VALUES (?, ?, ?, ?)',
            {
                replacements: [tieude, danhmuc, imageUrl, linkbaidang],
                type: sequelize.QueryTypes.INSERT
            }
        );

        console.log('News article added successfully');
        res.redirect('/taikhoan/admin/manage-news?success=Thêm tin tức thành công');
    } catch (error) {
        console.error('Add news error:', error);
        res.redirect('/taikhoan/admin/manage-news?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Edit news article
router.post('/admin/edit-news', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { id, tieude, danhmuc, linkbaidang, anhminhhoa } = req.body;
        console.log('Editing news article:', { id, tieude, danhmuc });

        // Basic validation
        if (!id || !tieude || !danhmuc || !linkbaidang) {
            return res.redirect('/taikhoan/admin/manage-news?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        // Process image URL - use default if not provided
        const imageUrl = anhminhhoa && anhminhhoa.trim() !== '' ? anhminhhoa : '/images/default-news.jpg';

        // Update news article
        await sequelize.query(
            'UPDATE tintuc SET tieude = ?, danhmuc = ?, anhminhhoa = ?, linkbaidang = ? WHERE id = ?',
            {
                replacements: [tieude, danhmuc, imageUrl, linkbaidang, id],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        console.log('News article updated successfully:', id);
        res.redirect('/taikhoan/admin/manage-news?success=Cập nhật tin tức thành công');
    } catch (error) {
        console.error('Edit news error:', error);
        res.redirect('/taikhoan/admin/manage-news?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Delete news article
router.post('/admin/delete-news', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { newsId } = req.body;
        console.log('Deleting news article:', newsId);

        // Delete the news article
        await sequelize.query(
            'DELETE FROM tintuc WHERE id = ?',
            {
                replacements: [newsId],
                type: sequelize.QueryTypes.DELETE
            }
        );

        console.log('News article deleted successfully:', newsId);
        res.redirect('/taikhoan/admin/manage-news?success=Xóa tin tức thành công');
    } catch (error) {
        console.error('Delete news error:', error);
        res.redirect('/taikhoan/admin/manage-news?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Get news details for edit
router.get('/admin/get-news/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;
        console.log('Fetching news details for edit, ID:', id);

        const newsItems = await sequelize.query(
            'SELECT * FROM tintuc WHERE id = ?',
            {
                replacements: [id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!newsItems || newsItems.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
        }

        console.log('News article found:', newsItems[0].tieude);
        res.json({ success: true, news: newsItems[0] });
    } catch (error) {
        console.error('Get news error:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// Course management page - Fetch only basic data without extra joins
router.get('/admin/manage-courses', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        console.log('Fetching courses for admin:', req.session.user.email);

        // Fetch all courses
        const courses = await sequelize.query(
            'SELECT * FROM dangkyhocphan ORDER BY mahocphan',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        console.log(`Fetched ${courses.length} courses`);

        // Fetch only the basic data from dsdangkyhocphan without joins
        let registrations = [];
        try {
            // Check if the dsdangkyhocphan table exists
            const tableCheck = await sequelize.query(
                "SHOW TABLES LIKE 'dsdangkyhocphan'",
                { type: sequelize.QueryTypes.SELECT }
            );

            if (tableCheck && tableCheck.length > 0) {
                console.log("Table dsdangkyhocphan exists, fetching records...");

                // Get basic data only without joins
                registrations = await sequelize.query(
                    `SELECT id, msv, mahocphan, ngaydangky, trangthaidangky 
                     FROM dsdangkyhocphan
                     ORDER BY ngaydangky DESC`,
                    {
                        type: sequelize.QueryTypes.SELECT
                    }
                );

                console.log(`Fetched ${registrations.length} registrations`);
            } else {
                console.log("Table dsdangkyhocphan does not exist");
            }
        } catch (regError) {
            console.error('Error fetching registrations:', regError);
        }

        // Fetch all students for the student dropdown
        const students = await sequelize.query(
            'SELECT msv, hovaten FROM sinhvien ORDER BY hovaten',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Add debug information to the page
        const debugInfo = {
            courses: courses.length,
            registrations: registrations.length,
            students: students.length,
            timestamp: new Date().toISOString()
        };

        console.log('Debug info:', debugInfo);

        return res.render('admin/manage-courses', {
            title: 'Quản lý Đăng ký Học phần',
            user: req.session.user,
            courses: courses || [],
            registrations: registrations || [],
            students: students || [],
            error: req.query.error,
            success: req.query.success,
            debug: debugInfo
        });
    } catch (error) {
        console.error('Fetch courses error:', error);
        return res.status(500).send('Đã xảy ra lỗi khi tải trang: ' + error.message);
    }
});

// Add new course
router.post('/admin/add-course', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { mahocphan, tenhocphan, khoa, hocki, loaihocphan, sotinchi } = req.body;

        // Basic validation
        if (!mahocphan || !tenhocphan || !khoa || !hocki || !loaihocphan || !sotinchi) {
            return res.redirect('/taikhoan/admin/manage-courses?error=Vui lòng điền đầy đủ thông tin học phần');
        }

        // Check if mahocphan already exists
        const existingCourse = await sequelize.query(
            'SELECT * FROM dangkyhocphan WHERE mahocphan = ?',
            {
                replacements: [mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (existingCourse && existingCourse.length > 0) {
            return res.redirect('/taikhoan/admin/manage-courses?error=Mã học phần đã tồn tại');
        }

        // Insert new course
        await sequelize.query(
            'INSERT INTO dangkyhocphan (mahocphan, tenhocphan, khoa, hocki, loaihocphan, sotinchi) VALUES (?, ?, ?, ?, ?, ?)',
            {
                replacements: [mahocphan, tenhocphan, khoa, hocki, loaihocphan, sotinchi],
                type: sequelize.QueryTypes.INSERT
            }
        );

        return res.redirect('/taikhoan/admin/manage-courses?success=Thêm học phần thành công');
    } catch (error) {
        console.error('Add course error:', error);
        return res.redirect('/taikhoan/admin/manage-courses?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Edit course
router.post('/admin/edit-course', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { mahocphan, tenhocphan, khoa, hocki, loaihocphan, sotinchi } = req.body;

        // Basic validation
        if (!mahocphan || !tenhocphan || !khoa || !hocki || !loaihocphan || !sotinchi) {
            return res.redirect('/taikhoan/admin/manage-courses?error=Vui lòng điền đầy đủ thông tin học phần');
        }

        // Update course
        await sequelize.query(
            'UPDATE dangkyhocphan SET tenhocphan = ?, khoa = ?, hocki = ?, loaihocphan = ?, sotinchi = ? WHERE mahocphan = ?',
            {
                replacements: [tenhocphan, khoa, hocki, loaihocphan, sotinchi, mahocphan],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        return res.redirect('/taikhoan/admin/manage-courses?success=Cập nhật học phần thành công');
    } catch (error) {
        console.error('Edit course error:', error);
        return res.redirect('/taikhoan/admin/manage-courses?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Delete course
router.post('/admin/delete-course', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { mahocphan } = req.body;
        console.log(`Attempting to delete course: ${mahocphan}`);

        // Check if course has registrations
        const registrations = await sequelize.query(
            'SELECT * FROM dsdangkyhocphan WHERE mahocphan = ?',
            {
                replacements: [mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (registrations && registrations.length > 0) {
            console.log(`Cannot delete course ${mahocphan} - ${registrations.length} registrations found`);
            return res.redirect('/taikhoan/admin/manage-courses?error=Không thể xóa học phần đã có sinh viên đăng ký. Vui lòng hủy đăng ký của sinh viên trước.');
        }

        // Delete the course
        const result = await sequelize.query(
            'DELETE FROM dangkyhocphan WHERE mahocphan = ?',
            {
                replacements: [mahocphan],
                type: sequelize.QueryTypes.DELETE
            }
        );

        console.log('Delete result:', result);

        // Check if any rows were affected
        if (result && result[0] && result[0].affectedRows > 0) {
            return res.redirect('/taikhoan/admin/manage-courses?success=Xóa học phần thành công');
        } else {
            return res.redirect('/taikhoan/admin/manage-courses?error=Không tìm thấy học phần để xóa');
        }
    } catch (error) {
        console.error('Delete course error:', error);
        return res.redirect('/taikhoan/admin/manage-courses?error=Đã xảy ra lỗi khi xóa học phần: ' + error.message);
    }
});

// Force delete course
router.post('/admin/force-delete-course', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { mahocphan, confirmation } = req.body;

        if (confirmation !== 'DELETE') {
            return res.redirect('/taikhoan/admin/manage-courses?error=Xác nhận xóa không hợp lệ. Vui lòng nhập DELETE để xác nhận.');
        }

        console.log(`Force deleting course: ${mahocphan}`);

        // Start a transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete registrations first (to handle foreign key constraints)
            await sequelize.query(
                'DELETE FROM dsdangkyhocphan WHERE mahocphan = ?',
                {
                    replacements: [mahocphan],
                    type: sequelize.QueryTypes.DELETE,
                    transaction
                }
            );

            // Now delete the course
            const result = await sequelize.query(
                'DELETE FROM dangkyhocphan WHERE mahocphan = ?',
                {
                    replacements: [mahocphan],
                    type: sequelize.QueryTypes.DELETE,
                    transaction
                }
            );

            // Commit the transaction
            await transaction.commit();

            console.log('Force delete result:', result);

            if (result && result[0] && result[0].affectedRows > 0) {
                return res.redirect('/taikhoan/admin/manage-courses?success=Xóa học phần và các dữ liệu liên quan thành công');
            } else {
                return res.redirect('/taikhoan/admin/manage-courses?error=Không tìm thấy học phần để xóa');
            }
        } catch (err) {
            // If there's an error, rollback the transaction
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Force delete course error:', error);
        return res.redirect('/taikhoan/admin/manage-courses?error=Đã xảy ra lỗi khi xóa học phần: ' + error.message);
    }
});

// Register student for course (admin function)
router.post('/admin/register-student-course', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { mahocphan, msv } = req.body;
        console.log('Registering student for course:', { mahocphan, msv });

        // Basic validation
        if (!mahocphan || !msv) {
            return res.redirect('/taikhoan/admin/manage-courses?error=Vui lòng chọn sinh viên và học phần');
        }

        // Check if registration already exists
        const existingRegistration = await sequelize.query(
            'SELECT * FROM dsdangkyhocphan WHERE msv = ? AND mahocphan = ?',
            {
                replacements: [msv, mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (existingRegistration && existingRegistration.length > 0) {
            return res.redirect('/taikhoan/admin/manage-courses?error=Sinh viên đã được thêm vào học phần này');
        }

        // Insert new registration with default status "chưa đăng ký"
        await sequelize.query(
            "INSERT INTO dsdangkyhocphan (msv, mahocphan, trangthaidangky) VALUES (?, ?, 'chưa đăng ký')",
            {
                replacements: [msv, mahocphan],
                type: sequelize.QueryTypes.INSERT
            }
        );

        console.log('Successfully registered student for course');
        return res.redirect('/taikhoan/admin/manage-courses?success=Đã thêm sinh viên vào học phần thành công');
    } catch (error) {
        console.error('Register student error:', error);
        return res.redirect('/taikhoan/admin/manage-courses?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Cancel registration
router.post('/admin/cancel-registration', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { id, mahocphan } = req.body;

        // Update the registration status to 'đã hủy' instead of deleting
        await sequelize.query(
            "UPDATE dsdangkyhocphan SET trangthaidangky = 'đã hủy' WHERE id = ?",
            {
                replacements: [id],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        return res.redirect('/taikhoan/admin/manage-courses?success=Đã hủy đăng ký học phần thành công');
    } catch (error) {
        console.error('Cancel registration error:', error);
        return res.redirect('/taikhoan/admin/manage-courses?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Activate registration
router.post('/admin/activate-registration', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { id, mahocphan } = req.body;

        // Update registration status to "đã đăng ký"
        await sequelize.query(
            "UPDATE dsdangkyhocphan SET trangthaidangky = 'đã đăng ký' WHERE id = ?",
            {
                replacements: [id],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        return res.redirect('/taikhoan/admin/manage-courses?success=Đã kích hoạt đăng ký học phần thành công');
    } catch (error) {
        console.error('Activate registration error:', error);
        return res.redirect('/taikhoan/admin/manage-courses?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Get course for edit
router.get('/admin/get-course/:mahocphan', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { mahocphan } = req.params;

        const courses = await sequelize.query(
            'SELECT * FROM dangkyhocphan WHERE mahocphan = ?',
            {
                replacements: [mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!courses || courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy học phần' });
        }

        return res.json({ success: true, course: courses[0] });
    } catch (error) {
        console.error('Get course error:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// Add a route to get students registered for a specific course
router.get('/admin/get-course-students/:mahocphan', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { mahocphan } = req.params;

        // Get all students registered for this course
        const students = await sequelize.query(
            `SELECT d.*, s.hovaten, c.tenhocphan 
             FROM dsdangkyhocphan d
             JOIN sinhvien s ON d.msv = s.msv
             JOIN dangkyhocphan c ON d.mahocphan = c.mahocphan
             WHERE d.mahocphan = ?
             ORDER BY d.ngaydangky DESC`,
            {
                replacements: [mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        return res.json({
            success: true,
            students: students || []
        });
    } catch (error) {
        console.error('Get course students error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi tải danh sách sinh viên',
            error: error.message
        });
    }
});

// Testing route to create a sample registration (for development)
router.get('/admin/create-test-registration', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Get a student
        const students = await sequelize.query(
            'SELECT msv FROM sinhvien LIMIT 1',
            { type: sequelize.QueryTypes.SELECT }
        );

        if (!students || students.length === 0) {
            return res.send('No students found. Please create at least one student first.');
        }

        // Get a course
        const courses = await sequelize.query(
            'SELECT mahocphan FROM dangkyhocphan LIMIT 1',
            { type: sequelize.QueryTypes.SELECT }
        );

        if (!courses || courses.length === 0) {
            return res.send('No courses found. Please create at least one course first.');
        }

        const msv = students[0].msv;
        const mahocphan = courses[0].mahocphan;

        // Check if this registration already exists
        const existingReg = await sequelize.query(
            'SELECT * FROM dsdangkyhocphan WHERE msv = ? AND mahocphan = ?',
            {
                replacements: [msv, mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (existingReg && existingReg.length > 0) {
            return res.send(`Registration already exists for ${msv} and ${mahocphan}. 
                             <a href="/taikhoan/admin/manage-courses">Go back to course management</a>`);
        }

        // Insert the test registration
        await sequelize.query(
            "INSERT INTO dsdangkyhocphan (msv, mahocphan, trangthaidangky) VALUES (?, ?, 'chưa đăng ký')",
            {
                replacements: [msv, mahocphan],
                type: sequelize.QueryTypes.INSERT
            }
        );

        return res.send(`Successfully created test registration for student ${msv} in course ${mahocphan}. 
                         <a href="/taikhoan/admin/manage-courses">Go back to course management</a>`);
    } catch (error) {
        console.error('Create test registration error:', error);
        return res.status(500).send('Error: ' + error.message);
    }
});

// Placeholder routes for dashboards until they are implemented
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
