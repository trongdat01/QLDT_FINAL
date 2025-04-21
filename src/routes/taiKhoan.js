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

// ==================== ROUTES QUẢN LÝ LỊCH HỌC ====================

// Create lichhoc table if it doesn't exist
router.get('/admin/create-lichhoc-table', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if table exists
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'lichhoc'",
            { type: sequelize.QueryTypes.SELECT }
        );

        if (tableCheck && tableCheck.length > 0) {
            return res.send('Bảng lichhoc đã tồn tại. <a href="/taikhoan/admin/lichhoc">Quay lại quản lý lịch học</a>');
        }

        // Create the table with structure matching the SQL file
        await sequelize.query(`
            CREATE TABLE lichhoc (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mahocphan VARCHAR(20) NOT NULL,
                namhoc VARCHAR(20) NOT NULL,
                hocky VARCHAR(20) NOT NULL,
                giangvien VARCHAR(100) NOT NULL,
                phonghoclythuyet VARCHAR(50),
                thu_lythuyet VARCHAR(20),
                cahoc_lythuyet VARCHAR(50),
                phonghocthuchanh VARCHAR(50),
                thu_thuchanh VARCHAR(20),
                cahoc_thuchanh VARCHAR(50),
                ngaybatdau DATE NOT NULL,
                ngayketthuc DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (mahocphan) REFERENCES dangkyhocphan(mahocphan)
            )
        `);

        return res.send('Tạo bảng lichhoc thành công. <a href="/taikhoan/admin/lichhoc">Đến trang quản lý lịch học</a>');
    } catch (error) {
        console.error('Lỗi tạo bảng lichhoc:', error);
        return res.status(500).send('Lỗi: ' + error.message);
    }
});

// List all schedules - Admin view
router.get('/admin/lichhoc', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if the lichhoc table exists first
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'lichhoc'",
            { type: sequelize.QueryTypes.SELECT }
        );

        let schedules = [];
        let courses = [];
        let rooms = [];

        if (tableCheck && tableCheck.length > 0) {
            // Table exists, proceed with queries
            try {
                // Fetch all schedules with course info, getting all fields directly
                schedules = await sequelize.query(
                    `SELECT l.*, c.tenhocphan 
                     FROM lichhoc l
                     JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
                     ORDER BY l.ngaybatdau ASC, l.thu_lythuyet ASC`,
                    {
                        type: sequelize.QueryTypes.SELECT
                    }
                );

                // Get unique rooms for filter dropdown (both theory and practice rooms)
                const theoryRooms = await sequelize.query(
                    'SELECT DISTINCT phonghoclythuyet AS phonghoc FROM lichhoc WHERE phonghoclythuyet IS NOT NULL ORDER BY phonghoclythuyet',
                    {
                        type: sequelize.QueryTypes.SELECT
                    }
                );

                const practiceRooms = await sequelize.query(
                    'SELECT DISTINCT phonghocthuchanh AS phonghoc FROM lichhoc WHERE phonghocthuchanh IS NOT NULL ORDER BY phonghocthuchanh',
                    {
                        type: sequelize.QueryTypes.SELECT
                    }
                );

                // Combine and deduplicate rooms
                const allRooms = [...theoryRooms, ...practiceRooms];
                const roomSet = new Set();
                rooms = allRooms.filter(room => {
                    if (!room.phonghoc) return false;
                    if (roomSet.has(room.phonghoc)) return false;
                    roomSet.add(room.phonghoc);
                    return true;
                });

            } catch (queryError) {
                console.error('Query error:', queryError);
                // Continue with empty arrays
            }
        } else {
            // Table doesn't exist, we'll show a message in the UI
            console.log('The lichhoc table does not exist yet');
        }

        // Fetch all courses for dropdown (this should work even if lichhoc doesn't exist)
        try {
            courses = await sequelize.query(
                'SELECT mahocphan, tenhocphan FROM dangkyhocphan ORDER BY tenhocphan',
                {
                    type: sequelize.QueryTypes.SELECT
                }
            );
        } catch (courseError) {
            console.error('Course query error:', courseError);
            // Continue with empty array
        }

        res.render('admin/lichhoc', {
            title: 'Quản lý Lịch Học',
            user: req.session.user,
            schedules: schedules || [],
            courses: courses || [],
            rooms: rooms || [],
            tableExists: tableCheck && tableCheck.length > 0,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi tải danh sách lịch học:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải danh sách lịch học',
            error
        });
    }
});

// Add new schedule
router.post('/admin/lichhoc/them', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            mahocphan,
            namhoc,
            hocky,
            ngaybatdau,
            ngayketthuc,
            giangvien,
            thu_lythuyet,
            cahoc_lythuyet,
            phonghoclythuyet,
            thu_thuchanh,
            cahoc_thuchanh,
            phonghocthuchanh
        } = req.body;

        // Basic validation
        if (!mahocphan || !namhoc || !hocky || !ngaybatdau || !ngayketthuc ||
            !giangvien || !thu_lythuyet || !cahoc_lythuyet || !phonghoclythuyet) {
            return res.redirect('/taikhoan/admin/lichhoc?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        // Check for schedule conflicts in the same room for theory class
        const theoryConflicts = await sequelize.query(
            `SELECT * FROM lichhoc 
             WHERE phonghoclythuyet = ? 
             AND thu_lythuyet = ?
             AND ngaybatdau <= ? 
             AND ngayketthuc >= ?
             AND (
                 (SUBSTRING_INDEX(cahoc_lythuyet, '-', 1) <= ? AND SUBSTRING_INDEX(cahoc_lythuyet, '-', -1) > ?) OR 
                 (SUBSTRING_INDEX(cahoc_lythuyet, '-', 1) < ? AND SUBSTRING_INDEX(cahoc_lythuyet, '-', -1) >= ?) OR
                 (SUBSTRING_INDEX(cahoc_lythuyet, '-', 1) >= ? AND SUBSTRING_INDEX(cahoc_lythuyet, '-', -1) <= ?)
             )`,
            {
                replacements: [
                    phonghoclythuyet,
                    thu_lythuyet,
                    ngayketthuc,
                    ngaybatdau,
                    cahoc_lythuyet.split('-')[1], cahoc_lythuyet.split('-')[0],
                    cahoc_lythuyet.split('-')[0], cahoc_lythuyet.split('-')[1],
                    cahoc_lythuyet.split('-')[0], cahoc_lythuyet.split('-')[1]
                ],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (theoryConflicts && theoryConflicts.length > 0) {
            return res.redirect('/taikhoan/admin/lichhoc?error=Phòng học lý thuyết đã được sử dụng trong khoảng thời gian này');
        }

        // Check for conflicts with practice room if practice details are provided
        if (thu_thuchanh && cahoc_thuchanh && phonghocthuchanh) {
            const practiceConflicts = await sequelize.query(
                `SELECT * FROM lichhoc 
                 WHERE phonghocthuchanh = ? 
                 AND thu_thuchanh = ?
                 AND ngaybatdau <= ? 
                 AND ngayketthuc >= ?
                 AND (
                     (SUBSTRING_INDEX(cahoc_thuchanh, '-', 1) <= ? AND SUBSTRING_INDEX(cahoc_thuchanh, '-', -1) > ?) OR 
                     (SUBSTRING_INDEX(cahoc_thuchanh, '-', 1) < ? AND SUBSTRING_INDEX(cahoc_thuchanh, '-', -1) >= ?) OR
                     (SUBSTRING_INDEX(cahoc_thuchanh, '-', 1) >= ? AND SUBSTRING_INDEX(cahoc_thuchanh, '-', -1) <= ?)
                 )`,
                {
                    replacements: [
                        phonghocthuchanh,
                        thu_thuchanh,
                        ngayketthuc,
                        ngaybatdau,
                        cahoc_thuchanh.split('-')[1], cahoc_thuchanh.split('-')[0],
                        cahoc_thuchanh.split('-')[0], cahoc_thuchanh.split('-')[1],
                        cahoc_thuchanh.split('-')[0], cahoc_thuchanh.split('-')[1]
                    ],
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (practiceConflicts && practiceConflicts.length > 0) {
                return res.redirect('/taikhoan/admin/lichhoc?error=Phòng học thực hành đã được sử dụng trong khoảng thời gian này');
            }
        }

        // Insert new schedule with all fields from the SQL file structure
        await sequelize.query(
            `INSERT INTO lichhoc 
             (mahocphan, namhoc, hocky, giangvien, 
              phonghoclythuyet, thu_lythuyet, cahoc_lythuyet, 
              phonghocthuchanh, thu_thuchanh, cahoc_thuchanh, 
              ngaybatdau, ngayketthuc) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    mahocphan,
                    namhoc,
                    hocky,
                    giangvien,
                    phonghoclythuyet,
                    thu_lythuyet,
                    cahoc_lythuyet,
                    phonghocthuchanh || null,
                    thu_thuchanh || null,
                    cahoc_thuchanh || null,
                    ngaybatdau,
                    ngayketthuc
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        res.redirect('/taikhoan/admin/lichhoc?success=Thêm lịch học thành công');
    } catch (error) {
        console.error('Lỗi thêm lịch học:', error);
        res.redirect('/taikhoan/admin/lichhoc?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Edit schedule
router.post('/admin/lichhoc/sua', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            id,
            mahocphan,
            namhoc,
            hocky,
            ngaybatdau,
            ngayketthuc,
            giangvien,
            thu_lythuyet,
            cahoc_lythuyet,
            phonghoclythuyet,
            thu_thuchanh,
            cahoc_thuchanh,
            phonghocthuchanh
        } = req.body;

        // Basic validation
        if (!id || !mahocphan || !namhoc || !hocky || !ngaybatdau || !ngayketthuc ||
            !giangvien || !thu_lythuyet || !cahoc_lythuyet || !phonghoclythuyet) {
            return res.redirect('/taikhoan/admin/lichhoc?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        // Check for schedule conflicts in the same room for theory class (excluding this schedule)
        const theoryConflicts = await sequelize.query(
            `SELECT * FROM lichhoc 
             WHERE phonghoclythuyet = ? 
             AND thu_lythuyet = ?
             AND ngaybatdau <= ? 
             AND ngayketthuc >= ?
             AND id != ?
             AND (
                 (SUBSTRING_INDEX(cahoc_lythuyet, '-', 1) <= ? AND SUBSTRING_INDEX(cahoc_lythuyet, '-', -1) > ?) OR 
                 (SUBSTRING_INDEX(cahoc_lythuyet, '-', 1) < ? AND SUBSTRING_INDEX(cahoc_lythuyet, '-', -1) >= ?) OR
                 (SUBSTRING_INDEX(cahoc_lythuyet, '-', 1) >= ? AND SUBSTRING_INDEX(cahoc_lythuyet, '-', -1) <= ?)
             )`,
            {
                replacements: [
                    phonghoclythuyet,
                    thu_lythuyet,
                    ngayketthuc,
                    ngaybatdau,
                    id,
                    cahoc_lythuyet.split('-')[1], cahoc_lythuyet.split('-')[0],
                    cahoc_lythuyet.split('-')[0], cahoc_lythuyet.split('-')[1],
                    cahoc_lythuyet.split('-')[0], cahoc_lythuyet.split('-')[1]
                ],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (theoryConflicts && theoryConflicts.length > 0) {
            return res.redirect('/taikhoan/admin/lichhoc?error=Phòng học lý thuyết đã được sử dụng trong khoảng thời gian này');
        }

        // Check for conflicts with practice room if practice details are provided
        if (thu_thuchanh && cahoc_thuchanh && phonghocthuchanh) {
            const practiceConflicts = await sequelize.query(
                `SELECT * FROM lichhoc 
                 WHERE phonghocthuchanh = ? 
                 AND thu_thuchanh = ?
                 AND ngaybatdau <= ? 
                 AND ngayketthuc >= ?
                 AND id != ?
                 AND (
                     (SUBSTRING_INDEX(cahoc_thuchanh, '-', 1) <= ? AND SUBSTRING_INDEX(cahoc_thuchanh, '-', -1) > ?) OR 
                     (SUBSTRING_INDEX(cahoc_thuchanh, '-', 1) < ? AND SUBSTRING_INDEX(cahoc_thuchanh, '-', -1) >= ?) OR
                     (SUBSTRING_INDEX(cahoc_thuchanh, '-', 1) >= ? AND SUBSTRING_INDEX(cahoc_thuchanh, '-', -1) <= ?)
                 )`,
                {
                    replacements: [
                        phonghocthuchanh,
                        thu_thuchanh,
                        ngayketthuc,
                        ngaybatdau,
                        id,
                        cahoc_thuchanh.split('-')[1], cahoc_thuchanh.split('-')[0],
                        cahoc_thuchanh.split('-')[0], cahoc_thuchanh.split('-')[1],
                        cahoc_thuchanh.split('-')[0], cahoc_thuchanh.split('-')[1]
                    ],
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (practiceConflicts && practiceConflicts.length > 0) {
                return res.redirect('/taikhoan/admin/lichhoc?error=Phòng học thực hành đã được sử dụng trong khoảng thời gian này');
            }
        }

        // Update schedule with all fields from the SQL file structure
        await sequelize.query(
            `UPDATE lichhoc SET
             mahocphan = ?,
             namhoc = ?,
             hocky = ?,
             giangvien = ?,
             phonghoclythuyet = ?,
             thu_lythuyet = ?,
             cahoc_lythuyet = ?,
             phonghocthuchanh = ?,
             thu_thuchanh = ?,
             cahoc_thuchanh = ?,
             ngaybatdau = ?,
             ngayketthuc = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            {
                replacements: [
                    mahocphan,
                    namhoc,
                    hocky,
                    giangvien,
                    phonghoclythuyet,
                    thu_lythuyet,
                    cahoc_lythuyet,
                    phonghocthuchanh || null,
                    thu_thuchanh || null,
                    cahoc_thuchanh || null,
                    ngaybatdau,
                    ngayketthuc,
                    id
                ],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        res.redirect('/taikhoan/admin/lichhoc?success=Cập nhật lịch học thành công');
    } catch (error) {
        console.error('Lỗi cập nhật lịch học:', error);
        res.redirect('/taikhoan/admin/lichhoc?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Delete schedule route
router.post('/admin/lichhoc/xoa', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { id } = req.body;

        if (!id) {
            return res.redirect('/taikhoan/admin/lichhoc?error=ID lịch học không hợp lệ');
        }

        // Delete the schedule
        await sequelize.query(
            'DELETE FROM lichhoc WHERE id = ?',
            {
                replacements: [id],
                type: sequelize.QueryTypes.DELETE
            }
        );

        res.redirect('/taikhoan/admin/lichhoc?success=Xóa lịch học thành công');
    } catch (error) {
        console.error('Lỗi xóa lịch học:', error);
        res.redirect('/taikhoan/admin/lichhoc?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Get schedule details (JSON API)
router.get('/admin/lichhoc/chi-tiet/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;

        // Fetch schedule with course info and all fields
        const schedules = await sequelize.query(
            `SELECT l.*, c.tenhocphan 
             FROM lichhoc l
             JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
             WHERE l.id = ?`,
            {
                replacements: [id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!schedules || schedules.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lịch học' });
        }

        // Return the raw data as is, without transforming
        res.json({ success: true, schedule: schedules[0] });
    } catch (error) {
        console.error('Lỗi lấy chi tiết lịch học:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// View schedules for a specific course
router.get('/admin/lichhoc/hocphan/:mahocphan', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { mahocphan } = req.params;

        // Get course info
        const courses = await sequelize.query(
            'SELECT * FROM dangkyhocphan WHERE mahocphan = ?',
            {
                replacements: [mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!courses || courses.length === 0) {
            return res.redirect('/taikhoan/admin/lichhoc?error=Không tìm thấy học phần');
        }

        const course = courses[0];

        // Fetch schedules for this course
        const schedules = await sequelize.query(
            `SELECT l.*, c.tenhocphan 
             FROM lichhoc l
             JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
             WHERE l.mahocphan = ?
             ORDER BY l.ngaybatdau ASC, l.thu_lythuyet ASC`,
            {
                replacements: [mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Transform data from database schema to view model format
        const mappedSchedules = schedules.map(schedule => ({
            id: schedule.id,
            mahocphan: schedule.mahocphan,
            tenhocphan: schedule.tenhocphan,
            ngayhoc: schedule.ngaybatdau,
            giobatdau: schedule.cahoc_lythuyet ? schedule.cahoc_lythuyet.split('-')[0] : '07:00',
            gioketthuc: schedule.cahoc_lythuyet ? schedule.cahoc_lythuyet.split('-')[1] : '11:00',
            phonghoc: schedule.phonghoclythuyet || 'Chưa có',
            giangvien: schedule.giangvien,
            ghichu: `${schedule.namhoc}, Học kỳ: ${schedule.hocky}, Thứ: ${schedule.thu_lythuyet}, Từ ngày ${new Date(schedule.ngaybatdau).toLocaleDateString('vi-VN')} đến ngày ${new Date(schedule.ngayketthuc).toLocaleDateString('vi-VN')}`
        }));

        // Fetch all courses for dropdown
        const allCourses = await sequelize.query(
            'SELECT mahocphan, tenhocphan FROM dangkyhocphan ORDER BY tenhocphan',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        res.render('admin/lichhoc-course', {
            title: `Lịch học cho ${course.tenhocphan}`,
            user: req.session.user,
            course,
            schedules: mappedSchedules || [],
            courses: allCourses || [],
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi tải lịch học cho khóa học:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải lịch học cho khóa học',
            error
        });
    }
});

// Filter schedules
router.get('/admin/lichhoc/loc', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { mahocphan, ngayhoc, phonghoc } = req.query;

        // Build WHERE clause based on filters
        let whereClause = '';
        const replacements = [];

        if (mahocphan) {
            whereClause += ' AND l.mahocphan = ?';
            replacements.push(mahocphan);
        }

        if (ngayhoc) {
            whereClause += ' AND l.ngaybatdau <= ? AND l.ngayketthuc >= ?';
            replacements.push(ngayhoc, ngayhoc);
        }

        if (phonghoc) {
            whereClause += ' AND (l.phonghoclythuyet = ? OR l.phonghocthuchanh = ?)';
            replacements.push(phonghoc, phonghoc);
        }

        // Fetch filtered schedules
        const schedules = await sequelize.query(
            `SELECT l.*, c.tenhocphan 
             FROM lichhoc l
             JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
             WHERE 1=1 ${whereClause}
             ORDER BY l.ngaybatdau ASC, l.thu_lythuyet ASC`,
            {
                replacements,
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Transform data from database schema to view model format
        const mappedSchedules = schedules.map(schedule => ({
            id: schedule.id,
            mahocphan: schedule.mahocphan,
            tenhocphan: schedule.tenhocphan,
            ngayhoc: schedule.ngaybatdau,
            giobatdau: schedule.cahoc_lythuyet ? schedule.cahoc_lythuyet.split('-')[0] : '07:00',
            gioketthuc: schedule.cahoc_lythuyet ? schedule.cahoc_lythuyet.split('-')[1] : '11:00',
            phonghoc: schedule.phonghoclythuyet || 'Chưa có',
            giangvien: schedule.giangvien,
            ghichu: `${schedule.namhoc}, Học kỳ: ${schedule.hocky}, Thứ: ${schedule.thu_lythuyet}, Từ ngày ${new Date(schedule.ngaybatdau).toLocaleDateString('vi-VN')} đến ngày ${new Date(schedule.ngayketthuc).toLocaleDateString('vi-VN')}`
        }));

        // Fetch all courses for dropdown
        const courses = await sequelize.query(
            'SELECT mahocphan, tenhocphan FROM dangkyhocphan ORDER BY tenhocphan',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Get unique rooms for filter dropdown
        const theoryRooms = await sequelize.query(
            'SELECT DISTINCT phonghoclythuyet AS phonghoc FROM lichhoc WHERE phonghoclythuyet IS NOT NULL ORDER BY phonghoclythuyet',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        const practiceRooms = await sequelize.query(
            'SELECT DISTINCT phonghocthuchanh AS phonghoc FROM lichhoc WHERE phonghocthuchanh IS NOT NULL ORDER BY phonghocthuchanh',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Combine and deduplicate rooms
        const allRooms = [...theoryRooms, ...practiceRooms];
        const roomSet = new Set();
        const rooms = allRooms.filter(room => {
            if (!room.phonghoc) return false;
            if (roomSet.has(room.phonghoc)) return false;
            roomSet.add(room.phonghoc);
            return true;
        });

        res.render('admin/lichhoc', {
            title: 'Quản lý Lịch Học - Kết quả lọc',
            user: req.session.user,
            schedules: mappedSchedules || [],
            courses: courses || [],
            rooms: rooms || [],
            filters: { mahocphan, ngayhoc, phonghoc },
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi lọc lịch học:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi lọc danh sách lịch học',
            error
        });
    }
});

// View student's schedules
router.get('/sinhvien/lichhoc', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'sinhvien') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản sinh viên');
        }

        const msv = req.session.user.id;

        // Get student's registered courses with 'đã đăng ký' status
        const registeredCourses = await sequelize.query(
            `SELECT d.mahocphan, c.tenhocphan 
             FROM dsdangkyhocphan d
             JOIN dangkyhocphan c ON d.mahocphan = c.mahocphan
             WHERE d.msv = ? AND d.trangthaidangky = 'đã đăng ký'`,
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!registeredCourses || registeredCourses.length === 0) {
            return res.render('sinhvien/lichhoc', {
                title: 'Lịch Học Của Tôi',
                user: req.session.user,
                schedules: [],
                message: 'Bạn chưa đăng ký học phần nào hoặc các học phần đăng ký chưa được phê duyệt.'
            });
        }

        // Get the list of course IDs
        const courseIds = registeredCourses.map(course => course.mahocphan);

        // Get schedules for these courses
        const schedules = await sequelize.query(
            `SELECT l.*, c.tenhocphan 
             FROM lichhoc l
             JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
             WHERE l.mahocphan IN (?)
             ORDER BY l.ngaybatdau ASC, l.thu_lythuyet ASC`,
            {
                replacements: [courseIds],
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Group schedules by day for easier display
        const schedulesByDay = {};
        const weekdays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

        schedules.forEach(schedule => {
            const dayOfWeek = schedule.thu_lythuyet;

            if (!schedulesByDay[dayOfWeek]) {
                schedulesByDay[dayOfWeek] = [];
            }
            schedulesByDay[dayOfWeek].push(schedule);
        });

        res.render('sinhvien/lichhoc', {
            title: 'Lịch Học Của Tôi',
            user: req.session.user,
            schedules: schedules || [],
            schedulesByDay,
            weekdays,
            courses: registeredCourses || []
        });
    } catch (error) {
        console.error('Lỗi tải lịch học sinh viên:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải lịch học của bạn',
            error
        });
    }
});

// ==================== ROUTES QUẢN LÝ LỊCH THI ====================

// Create lichthi table if it doesn't exist
router.get('/admin/create-lichthi-table', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if table exists
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'lichthi'",
            { type: sequelize.QueryTypes.SELECT }
        );

        if (tableCheck && tableCheck.length > 0) {
            return res.send('Bảng lichthi đã tồn tại. <a href="/taikhoan/admin/lichthi">Quay lại quản lý lịch thi</a>');
        }

        // Create the table with structure matching the SQL file
        await sequelize.query(`
            CREATE TABLE lichthi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mahocphan VARCHAR(20) NOT NULL,
                namhoc VARCHAR(20) NOT NULL,
                kihoc VARCHAR(20) NOT NULL,
                giangviencoithi VARCHAR(100) NOT NULL,
                phongthi VARCHAR(50) NOT NULL,
                thu VARCHAR(20) NOT NULL,
                thoigianthi DATETIME NOT NULL,
                hinhthuathi VARCHAR(50) NOT NULL,
                trangthai ENUM('đã lên lịch', 'đã hoàn thành', 'hoãn thi') DEFAULT 'đã lên lịch',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (mahocphan) REFERENCES dangkyhocphan(mahocphan)
            )
        `);

        return res.send('Tạo bảng lichthi thành công. <a href="/taikhoan/admin/lichthi">Đến trang quản lý lịch thi</a>');
    } catch (error) {
        console.error('Lỗi tạo bảng lichthi:', error);
        return res.status(500).send('Lỗi: ' + error.message);
    }
});

// ==================== ROUTES QUẢN LÝ LỊCH THI ====================

// Create lichthi table if it doesn't exist
router.get('/admin/create-lichthi-table', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if table exists
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'lichthi'",
            { type: sequelize.QueryTypes.SELECT }
        );

        if (tableCheck && tableCheck.length > 0) {
            return res.send('Bảng lichthi đã tồn tại. <a href="/taikhoan/admin/lichthi">Quay lại quản lý lịch thi</a>');
        }

        // Create the table with structure matching the SQL file
        await sequelize.query(`
            CREATE TABLE lichthi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mahocphan VARCHAR(20) NOT NULL,
                namhoc VARCHAR(20) NOT NULL,
                kihoc VARCHAR(20) NOT NULL,
                giangviencoithi VARCHAR(100) NOT NULL,
                phongthi VARCHAR(50) NOT NULL,
                thu VARCHAR(20) NOT NULL,
                thoigianthi DATETIME NOT NULL,
                hinhthuathi VARCHAR(50) NOT NULL,
                trangthai ENUM('đã lên lịch', 'đã hoàn thành', 'hoãn thi') DEFAULT 'đã lên lịch',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (mahocphan) REFERENCES dangkyhocphan(mahocphan)
            )
        `);

        return res.send('Tạo bảng lichthi thành công. <a href="/taikhoan/admin/lichthi">Đến trang quản lý lịch thi</a>');
    } catch (error) {
        console.error('Lỗi tạo bảng lichthi:', error);
        return res.status(500).send('Lỗi: ' + error.message);
    }
});

// List all exam schedules - Admin view
router.get('/admin/lichthi', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if the lichthi table exists first
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'lichthi'",
            { type: sequelize.QueryTypes.SELECT }
        );

        let examSchedules = [];
        let courses = [];
        let rooms = [];

        if (tableCheck && tableCheck.length > 0) {
            // Table exists, proceed with queries
            try {
                // Fetch all exam schedules with course info
                examSchedules = await sequelize.query(
                    `SELECT l.*, c.tenhocphan 
                     FROM lichthi l
                     JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
                     ORDER BY l.thoigianthi ASC`,
                    {
                        type: sequelize.QueryTypes.SELECT
                    }
                );

                // Get unique exam rooms for filter dropdown
                rooms = await sequelize.query(
                    'SELECT DISTINCT phongthi FROM lichthi ORDER BY phongthi',
                    {
                        type: sequelize.QueryTypes.SELECT
                    }
                );
            } catch (queryError) {
                console.error('Query error:', queryError);
                // Continue with empty arrays
            }
        } else {
            // Table doesn't exist, we'll show a message in the UI
            console.log('The lichthi table does not exist yet');
        }

        // Fetch all courses for dropdown (this should work even if lichthi doesn't exist)
        try {
            courses = await sequelize.query(
                'SELECT mahocphan, tenhocphan FROM dangkyhocphan ORDER BY tenhocphan',
                {
                    type: sequelize.QueryTypes.SELECT
                }
            );
        } catch (courseError) {
            console.error('Course query error:', courseError);
            // Continue with empty array
        }

        res.render('admin/lichthi', {
            title: 'Quản lý Lịch Thi',
            user: req.session.user,
            examSchedules: examSchedules || [],
            courses: courses || [],
            rooms: rooms || [],
            tableExists: tableCheck && tableCheck.length > 0,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi tải danh sách lịch thi:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải danh sách lịch thi',
            error
        });
    }
});

// Add new exam schedule
router.post('/admin/lichthi/them', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            mahocphan,
            namhoc,
            kihoc,
            thoigianthi,
            giangviencoithi,
            phongthi,
            thu,
            hinhthuathi,
            trangthai
        } = req.body;

        // Basic validation
        if (!mahocphan || !namhoc || !kihoc || !thoigianthi || !giangviencoithi || !phongthi || !thu || !hinhthuathi) {
            return res.redirect('/taikhoan/admin/lichthi?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        // Format datetime
        const examDateTime = new Date(thoigianthi);
        if (isNaN(examDateTime.getTime())) {
            return res.redirect('/taikhoan/admin/lichthi?error=Thời gian thi không hợp lệ');
        }

        // Check for exam schedule conflicts in the same room
        const conflicts = await sequelize.query(
            `SELECT * FROM lichthi 
             WHERE phongthi = ? 
             AND DATE(thoigianthi) = DATE(?)
             AND ABS(TIMESTAMPDIFF(HOUR, thoigianthi, ?)) < 4`,
            {
                replacements: [
                    phongthi,
                    thoigianthi,
                    thoigianthi
                ],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (conflicts && conflicts.length > 0) {
            return res.redirect('/taikhoan/admin/lichthi?error=Phòng thi đã được sử dụng trong khoảng thời gian gần với lịch thi này');
        }

        // Default trangthai if not specified
        const examStatus = trangthai || 'đã lên lịch';

        // Insert new exam schedule
        await sequelize.query(
            `INSERT INTO lichthi 
             (mahocphan, namhoc, kihoc, giangviencoithi, phongthi, thu, thoigianthi, hinhthuathi, trangthai) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    mahocphan,
                    namhoc,
                    kihoc,
                    giangviencoithi,
                    phongthi,
                    thu,
                    thoigianthi,
                    hinhthuathi,
                    examStatus
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        res.redirect('/taikhoan/admin/lichthi?success=Thêm lịch thi thành công');
    } catch (error) {
        console.error('Lỗi thêm lịch thi:', error);
        res.redirect('/taikhoan/admin/lichthi?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Edit exam schedule
router.post('/admin/lichthi/sua', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            id,
            mahocphan,
            namhoc,
            kihoc,
            thoigianthi,
            giangviencoithi,
            phongthi,
            thu,
            hinhthuathi,
            trangthai
        } = req.body;

        // Basic validation
        if (!id || !mahocphan || !namhoc || !kihoc || !thoigianthi || !giangviencoithi || !phongthi || !thu || !hinhthuathi) {
            return res.redirect('/taikhoan/admin/lichthi?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        // Format datetime
        const examDateTime = new Date(thoigianthi);
        if (isNaN(examDateTime.getTime())) {
            return res.redirect('/taikhoan/admin/lichthi?error=Thời gian thi không hợp lệ');
        }

        // Check for exam schedule conflicts in the same room (excluding this schedule)
        const conflicts = await sequelize.query(
            `SELECT * FROM lichthi 
             WHERE phongthi = ? 
             AND DATE(thoigianthi) = DATE(?)
             AND ABS(TIMESTAMPDIFF(HOUR, thoigianthi, ?)) < 4
             AND id != ?`,
            {
                replacements: [
                    phongthi,
                    thoigianthi,
                    thoigianthi,
                    id
                ],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (conflicts && conflicts.length > 0) {
            return res.redirect('/taikhoan/admin/lichthi?error=Phòng thi đã được sử dụng trong khoảng thời gian gần với lịch thi này');
        }

        // Update exam schedule
        await sequelize.query(
            `UPDATE lichthi SET
             mahocphan = ?,
             namhoc = ?,
             kihoc = ?,
             giangviencoithi = ?,
             phongthi = ?,
             thu = ?,
             thoigianthi = ?,
             hinhthuathi = ?,
             trangthai = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            {
                replacements: [
                    mahocphan,
                    namhoc,
                    kihoc,
                    giangviencoithi,
                    phongthi,
                    thu,
                    thoigianthi,
                    hinhthuathi,
                    trangthai,
                    id
                ],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        res.redirect('/taikhoan/admin/lichthi?success=Cập nhật lịch thi thành công');
    } catch (error) {
        console.error('Lỗi cập nhật lịch thi:', error);
        res.redirect('/taikhoan/admin/lichthi?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Delete exam schedule
router.post('/admin/lichthi/xoa', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { id } = req.body;

        if (!id) {
            return res.redirect('/taikhoan/admin/lichthi?error=ID lịch thi không hợp lệ');
        }

        // Delete the exam schedule
        await sequelize.query(
            'DELETE FROM lichthi WHERE id = ?',
            {
                replacements: [id],
                type: sequelize.QueryTypes.DELETE
            }
        );

        res.redirect('/taikhoan/admin/lichthi?success=Xóa lịch thi thành công');
    } catch (error) {
        console.error('Lỗi xóa lịch thi:', error);
        res.redirect('/taikhoan/admin/lichthi?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Get exam schedule details (JSON API)
router.get('/admin/lichthi/chi-tiet/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;

        // Fetch exam schedule with course info
        const examSchedules = await sequelize.query(
            `SELECT l.*, c.tenhocphan 
             FROM lichthi l
             JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
             WHERE l.id = ?`,
            {
                replacements: [id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!examSchedules || examSchedules.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lịch thi' });
        }

        // Format datetime for the response
        const examSchedule = examSchedules[0];
        if (examSchedule.thoigianthi) {
            // Get the original datetime from DB without timezone adjustment
            const dbDate = new Date(examSchedule.thoigianthi);

            // Format ISO string without any timezone conversion for input fields
            // This preserves the original time stored in the database
            examSchedule.formattedDateTime = dbDate.toISOString().slice(0, 16);
        }

        res.json({ success: true, examSchedule });
    } catch (error) {
        console.error('Lỗi lấy chi tiết lịch thi:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// Filter exam schedules
router.get('/admin/lichthi/loc', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { mahocphan, ngaythi, phongthi, trangthai } = req.query;

        // Build WHERE clause based on filters
        let whereClause = '';
        const replacements = [];

        if (mahocphan) {
            whereClause += ' AND l.mahocphan = ?';
            replacements.push(mahocphan);
        }

        if (ngaythi) {
            whereClause += ' AND DATE(l.thoigianthi) = ?';
            replacements.push(ngaythi);
        }

        if (phongthi) {
            whereClause += ' AND l.phongthi = ?';
            replacements.push(phongthi);
        }

        if (trangthai) {
            whereClause += ' AND l.trangthai = ?';
            replacements.push(trangthai);
        }

        // Fetch filtered exam schedules
        const examSchedules = await sequelize.query(
            `SELECT l.*, c.tenhocphan 
             FROM lichthi l
             JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
             WHERE 1=1 ${whereClause}
             ORDER BY l.thoigianthi ASC`,
            {
                replacements,
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Fetch all courses for dropdown
        const courses = await sequelize.query(
            'SELECT mahocphan, tenhocphan FROM dangkyhocphan ORDER BY tenhocphan',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Get unique rooms for filter dropdown
        const rooms = await sequelize.query(
            'SELECT DISTINCT phongthi FROM lichthi ORDER BY phongthi',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        res.render('admin/lichthi', {
            title: 'Quản lý Lịch Thi - Kết quả lọc',
            user: req.session.user,
            examSchedules: examSchedules || [],
            courses: courses || [],
            rooms: rooms || [],
            filters: { mahocphan, ngaythi, phongthi, trangthai },
            tableExists: true,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi lọc lịch thi:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi lọc danh sách lịch thi',
            error
        });
    }
});

// View student's exam schedules
router.get('/sinhvien/lichthi', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'sinhvien') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản sinh viên');
        }

        const msv = req.session.user.id;

        // Get student's registered courses with 'đã đăng ký' status
        const registeredCourses = await sequelize.query(
            `SELECT d.mahocphan, c.tenhocphan 
             FROM dsdangkyhocphan d
             JOIN dangkyhocphan c ON d.mahocphan = c.mahocphan
             WHERE d.msv = ? AND d.trangthaidangky = 'đã đăng ký'`,
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!registeredCourses || registeredCourses.length === 0) {
            return res.render('sinhvien/lichthi', {
                title: 'Lịch Thi Của Tôi',
                user: req.session.user,
                examSchedules: [],
                message: 'Bạn chưa đăng ký học phần nào hoặc các học phần đăng ký chưa được phê duyệt.'
            });
        }

        // Get the list of course IDs
        const courseIds = registeredCourses.map(course => course.mahocphan);

        // Get exam schedules for these courses
        const examSchedules = await sequelize.query(
            `SELECT l.*, c.tenhocphan 
             FROM lichthi l
             JOIN dangkyhocphan c ON l.mahocphan = c.mahocphan
             WHERE l.mahocphan IN (?)
             ORDER BY l.thoigianthi ASC`,
            {
                replacements: [courseIds],
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Format dates for display - Ensure proper timezone handling
        examSchedules.forEach(schedule => {
            if (schedule.thoigianthi) {
                // Create a new Date object without timezone conversion
                const date = new Date(schedule.thoigianthi);

                // Format date and time in local format to display to the user
                schedule.formattedDate = date.toLocaleDateString('vi-VN');
                schedule.formattedTime = date.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // Store the raw date for calculations in the template if needed
                schedule.examDateTime = date;
            }
        });

        res.render('sinhvien/lichthi', {
            title: 'Lịch Thi Của Tôi',
            user: req.session.user,
            examSchedules: examSchedules || [],
            courses: registeredCourses || [],
            currentDate: new Date() // Send current date for comparison
        });
    } catch (error) {
        console.error('Lỗi tải lịch thi sinh viên:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải lịch thi của bạn',
            error
        });
    }
});

// ==================== ROUTES QUẢN LÝ TÀI CHÍNH ====================

// Create taichinh table if it doesn't exist (this might be redundant if you already have the table in your SQL file)
router.get('/admin/create-taichinh-table', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if table exists
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'taichinh'",
            { type: sequelize.QueryTypes.SELECT }
        );

        if (tableCheck && tableCheck.length > 0) {
            return res.send('Bảng taichinh đã tồn tại. <a href="/taikhoan/admin/taichinh">Quay lại quản lý tài chính</a>');
        }

        // Create the table with structure matching the SQL file
        await sequelize.query(`
            CREATE TABLE taichinh (
                id INT AUTO_INCREMENT PRIMARY KEY,
                msv VARCHAR(20) NOT NULL,
                trangthai ENUM('đã hoàn thành', 'chưa hoàn thành') DEFAULT 'chưa hoàn thành',
                khoanphainop DECIMAL(10, 2) NOT NULL,
                khoandanop DECIMAL(10, 2) DEFAULT 0,
                khoandocmien DECIMAL(10, 2) DEFAULT 0,
                qr_nganhang VARCHAR(100),
                qr_sotaikhoan VARCHAR(50),
                qr_tennguoinhan VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (msv) REFERENCES sinhvien(msv)
            )
        `);

        return res.send('Tạo bảng taichinh thành công. <a href="/taikhoan/admin/taichinh">Đến trang quản lý tài chính</a>');
    } catch (error) {
        console.error('Lỗi tạo bảng taichinh:', error);
        return res.status(500).send('Lỗi: ' + error.message);
    }
});

// List all financial records - Admin view
router.get('/admin/taichinh', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if the taichinh table exists first
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'taichinh'",
            { type: sequelize.QueryTypes.SELECT }
        );

        let financialRecords = [];
        let students = [];

        if (tableCheck && tableCheck.length > 0) {
            // Table exists, proceed with queries
            try {
                // Fetch all financial records with student info
                financialRecords = await sequelize.query(
                    `SELECT t.*, s.hovaten 
                     FROM taichinh t
                     JOIN sinhvien s ON t.msv = s.msv
                     ORDER BY t.trangthai ASC, t.created_at DESC`,
                    {
                        type: sequelize.QueryTypes.SELECT
                    }
                );

                // Calculate remaining amount for each record
                financialRecords.forEach(record => {
                    record.conlai = parseFloat(record.khoanphainop) - parseFloat(record.khoandanop) - parseFloat(record.khoandocmien);
                });
            } catch (queryError) {
                console.error('Query error:', queryError);
                // Continue with empty arrays
            }
        } else {
            // Table doesn't exist, we'll show a message in the UI
            console.log('The taichinh table does not exist yet');
        }

        // Fetch all students for dropdown (this should work even if taichinh doesn't exist)
        try {
            students = await sequelize.query(
                'SELECT msv, hovaten FROM sinhvien ORDER BY hovaten',
                {
                    type: sequelize.QueryTypes.SELECT
                }
            );
        } catch (studentError) {
            console.error('Student query error:', studentError);
            // Continue with empty array
        }

        res.render('admin/taichinh', {
            title: 'Quản lý Tài Chính',
            user: req.session.user,
            financialRecords: financialRecords || [],
            students: students || [],
            tableExists: tableCheck && tableCheck.length > 0,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi tải danh sách tài chính:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải danh sách tài chính',
            error
        });
    }
});

// Add new financial record
router.post('/admin/taichinh/them', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            msv,
            khoanphainop,
            khoandanop,
            khoandocmien,
            qr_nganhang,
            qr_sotaikhoan,
            qr_tennguoinhan,
            trangthai
        } = req.body;

        // Basic validation
        if (!msv || !khoanphainop) {
            return res.redirect('/taikhoan/admin/taichinh?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        if (isNaN(parseFloat(khoanphainop)) || parseFloat(khoanphainop) <= 0) {
            return res.redirect('/taikhoan/admin/taichinh?error=Khoản phải nộp không hợp lệ');
        }

        // Check if the student exists
        const student = await sequelize.query(
            'SELECT * FROM sinhvien WHERE msv = ?',
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!student || student.length === 0) {
            return res.redirect('/taikhoan/admin/taichinh?error=Sinh viên không tồn tại');
        }

        // Check if this student already has a financial record
        const existingRecord = await sequelize.query(
            'SELECT * FROM taichinh WHERE msv = ?',
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (existingRecord && existingRecord.length > 0) {
            return res.redirect('/taikhoan/admin/taichinh?error=Sinh viên này đã có thông tin tài chính, vui lòng cập nhật thay vì thêm mới');
        }

        // Parse and validate numeric values
        const parsedKhoanPhaiNop = parseFloat(khoanphainop);
        const parsedKhoanDaNop = khoandanop ? parseFloat(khoandanop) : 0;
        const parsedKhoanDocMien = khoandocmien ? parseFloat(khoandocmien) : 0;

        // Determine trangthai automatically based on payment status
        let paymentStatus = 'chưa hoàn thành';
        if (parsedKhoanDaNop + parsedKhoanDocMien >= parsedKhoanPhaiNop) {
            paymentStatus = 'đã hoàn thành';
        } else if (trangthai === 'đã hoàn thành') {
            // If admin specifically selects "đã hoàn thành", honor that choice
            paymentStatus = 'đã hoàn thành';
        }

        // Insert new financial record
        await sequelize.query(
            `INSERT INTO taichinh 
             (msv, trangthai, khoanphainop, khoandanop, khoandocmien, qr_nganhang, qr_sotaikhoan, qr_tennguoinhan) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    msv,
                    paymentStatus,
                    parsedKhoanPhaiNop,
                    parsedKhoanDaNop,
                    parsedKhoanDocMien,
                    qr_nganhang || null,
                    qr_sotaikhoan || null,
                    qr_tennguoinhan || null
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        res.redirect('/taikhoan/admin/taichinh?success=Thêm thông tin tài chính thành công');
    } catch (error) {
        console.error('Lỗi thêm thông tin tài chính:', error);
        res.redirect('/taikhoan/admin/taichinh?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Edit financial record
router.post('/admin/taichinh/sua', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            id,
            khoanphainop,
            khoandanop,
            khoandocmien,
            qr_nganhang,
            qr_sotaikhoan,
            qr_tennguoinhan,
            trangthai
        } = req.body;

        // Basic validation
        if (!id || !khoanphainop) {
            return res.redirect('/taikhoan/admin/taichinh?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        if (isNaN(parseFloat(khoanphainop)) || parseFloat(khoanphainop) <= 0) {
            return res.redirect('/taikhoan/admin/taichinh?error=Khoản phải nộp không hợp lệ');
        }

        // Parse and validate numeric values
        const parsedKhoanPhaiNop = parseFloat(khoanphainop);
        const parsedKhoanDaNop = khoandanop ? parseFloat(khoandanop) : 0;
        const parsedKhoanDocMien = khoandocmien ? parseFloat(khoandocmien) : 0;

        // Determine trangthai automatically based on payment status
        let paymentStatus = 'chưa hoàn thành';
        if (parsedKhoanDaNop + parsedKhoanDocMien >= parsedKhoanPhaiNop) {
            paymentStatus = 'đã hoàn thành';
        } else if (trangthai === 'đã hoàn thành') {
            // If admin specifically selects "đã hoàn thành", honor that choice
            paymentStatus = 'đã hoàn thành';
        }

        // Update financial record
        await sequelize.query(
            `UPDATE taichinh SET
             trangthai = ?,
             khoanphainop = ?,
             khoandanop = ?,
             khoandocmien = ?,
             qr_nganhang = ?,
             qr_sotaikhoan = ?,
             qr_tennguoinhan = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            {
                replacements: [
                    paymentStatus,
                    parsedKhoanPhaiNop,
                    parsedKhoanDaNop,
                    parsedKhoanDocMien,
                    qr_nganhang || null,
                    qr_sotaikhoan || null,
                    qr_tennguoinhan || null,
                    id
                ],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        res.redirect('/taikhoan/admin/taichinh?success=Cập nhật thông tin tài chính thành công');
    } catch (error) {
        console.error('Lỗi cập nhật thông tin tài chính:', error);
        res.redirect('/taikhoan/admin/taichinh?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Delete financial record
router.post('/admin/taichinh/xoa', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { id } = req.body;

        if (!id) {
            return res.redirect('/taikhoan/admin/taichinh?error=ID không hợp lệ');
        }

        // Check if there are any related payment receipts (phieuthu)
        const receipts = await sequelize.query(
            'SELECT * FROM phieuthu WHERE taichinh_id = ?',
            {
                replacements: [id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (receipts && receipts.length > 0) {
            return res.redirect('/taikhoan/admin/taichinh?error=Không thể xóa thông tin tài chính này vì đã có phiếu thu liên quan');
        }

        // Delete the financial record
        await sequelize.query(
            'DELETE FROM taichinh WHERE id = ?',
            {
                replacements: [id],
                type: sequelize.QueryTypes.DELETE
            }
        );

        res.redirect('/taikhoan/admin/taichinh?success=Xóa thông tin tài chính thành công');
    } catch (error) {
        console.error('Lỗi xóa thông tin tài chính:', error);
        res.redirect('/taikhoan/admin/taichinh?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Get financial record details (JSON API)
router.get('/admin/taichinh/chi-tiet/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;

        // Fetch financial record with student info
        const financialRecords = await sequelize.query(
            `SELECT t.*, s.hovaten 
             FROM taichinh t
             JOIN sinhvien s ON t.msv = s.msv
             WHERE t.id = ?`,
            {
                replacements: [id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!financialRecords || financialRecords.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài chính' });
        }

        const financialRecord = financialRecords[0];

        // Calculate remaining amount
        financialRecord.conlai = parseFloat(financialRecord.khoanphainop) -
            parseFloat(financialRecord.khoandanop) -
            parseFloat(financialRecord.khoandocmien);

        res.json({ success: true, financialRecord });
    } catch (error) {
        console.error('Lỗi lấy chi tiết tài chính:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// Filter financial records
router.get('/admin/taichinh/loc', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { msv, trangthai } = req.query;

        // Build WHERE clause based on filters
        let whereClause = '';
        const replacements = [];

        if (msv) {
            whereClause += ' AND t.msv = ?';
            replacements.push(msv);
        }

        if (trangthai) {
            whereClause += ' AND t.trangthai = ?';
            replacements.push(trangthai);
        }

        // Fetch filtered financial records
        const financialRecords = await sequelize.query(
            `SELECT t.*, s.hovaten 
             FROM taichinh t
             JOIN sinhvien s ON t.msv = s.msv
             WHERE 1=1 ${whereClause}
             ORDER BY t.trangthai ASC, t.created_at DESC`,
            {
                replacements,
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Calculate remaining amount for each record
        financialRecords.forEach(record => {
            record.conlai = parseFloat(record.khoanphainop) - parseFloat(record.khoandanop) - parseFloat(record.khoandocmien);
        });

        // Fetch all students for dropdown
        const students = await sequelize.query(
            'SELECT msv, hovaten FROM sinhvien ORDER BY hovaten',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        res.render('admin/taichinh', {
            title: 'Quản lý Tài Chính - Kết quả lọc',
            user: req.session.user,
            financialRecords: financialRecords || [],
            students: students || [],
            filters: { msv, trangthai },
            tableExists: true,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi lọc tài chính:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi lọc danh sách tài chính',
            error
        });
    }
});

// ============= STUDENT FINANCIAL MANAGEMENT =============

// View student's financial information
router.get('/sinhvien/taichinh', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'sinhvien') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản sinh viên');
        }

        const msv = req.session.user.id;

        // Get student's financial information
        const financialRecords = await sequelize.query(
            `SELECT t.* 
             FROM taichinh t
             WHERE t.msv = ?`,
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        let financialRecord = null;
        if (financialRecords && financialRecords.length > 0) {
            financialRecord = financialRecords[0];

            // Calculate remaining amount
            financialRecord.conlai = parseFloat(financialRecord.khoanphainop) -
                parseFloat(financialRecord.khoandanop) -
                parseFloat(financialRecord.khoandocmien);

            // Get payment receipts
            const receipts = await sequelize.query(
                `SELECT * 
                 FROM phieuthu
                 WHERE taichinh_id = ?
                 ORDER BY thoigian DESC`,
                {
                    replacements: [financialRecord.id],
                    type: sequelize.QueryTypes.SELECT
                }
            );

            financialRecord.receipts = receipts || [];
        }

        res.render('sinhvien/taichinh', {
            title: 'Thông Tin Tài Chính',
            user: req.session.user,
            financialRecord: financialRecord,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi tải thông tin tài chính sinh viên:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải thông tin tài chính của bạn',
            error
        });
    }
});

// ============= PAYMENT RECEIPT MANAGEMENT =============

// Create phieuthu table if it doesn't exist
router.get('/admin/create-phieuthu-table', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        // Check if table exists
        const tableCheck = await sequelize.query(
            "SHOW TABLES LIKE 'phieuthu'",
            { type: sequelize.QueryTypes.SELECT }
        );

        if (tableCheck && tableCheck.length > 0) {
            return res.send('Bảng phieuthu đã tồn tại. <a href="/taikhoan/admin/taichinh">Quay lại quản lý tài chính</a>');
        }

        // Create the table with structure matching the SQL file
        await sequelize.query(`
            CREATE TABLE phieuthu (
                id VARCHAR(50) PRIMARY KEY,
                taichinh_id INT NOT NULL,
                tiendathu DECIMAL(10, 2) NOT NULL,
                thoigian DATETIME DEFAULT CURRENT_TIMESTAMP,
                nganhangchuyen VARCHAR(100),
                nganhangnhan VARCHAR(100),
                nguoilaphieu VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (taichinh_id) REFERENCES taichinh(id)
            )
        `);

        return res.send('Tạo bảng phieuthu thành công. <a href="/taikhoan/admin/taichinh">Đến trang quản lý tài chính</a>');
    } catch (error) {
        console.error('Lỗi tạo bảng phieuthu:', error);
        return res.status(500).send('Lỗi: ' + error.message);
    }
});

// Add new payment receipt
router.post('/admin/phieuthu/them', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const {
            taichinh_id,
            tiendathu,
            thoigian,
            nganhangchuyen,
            nganhangnhan
        } = req.body;

        // Basic validation
        if (!taichinh_id || !tiendathu) {
            return res.redirect('/taikhoan/admin/taichinh?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        if (isNaN(parseFloat(tiendathu)) || parseFloat(tiendathu) <= 0) {
            return res.redirect('/taikhoan/admin/taichinh?error=Số tiền không hợp lệ');
        }

        // Check if financial record exists
        const financialRecords = await sequelize.query(
            'SELECT * FROM taichinh WHERE id = ?',
            {
                replacements: [taichinh_id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!financialRecords || financialRecords.length === 0) {
            return res.redirect('/taikhoan/admin/taichinh?error=Thông tin tài chính không tồn tại');
        }

        const financialRecord = financialRecords[0];

        // Generate a unique receipt ID (format: PT-yyyyMMdd-xxxx)
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
        const receiptId = `PT-${datePart}-${randomPart}`;

        // Parse amount
        const parsedAmount = parseFloat(tiendathu);

        // Use current timestamp if no time provided
        const paymentTime = thoigian ? new Date(thoigian) : now;

        // Insert new payment receipt
        await sequelize.query(
            `INSERT INTO phieuthu 
             (id, taichinh_id, tiendathu, thoigian, nganhangchuyen, nganhangnhan, nguoilaphieu) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    receiptId,
                    taichinh_id,
                    parsedAmount,
                    paymentTime,
                    nganhangchuyen || null,
                    nganhangnhan || null,
                    req.session.user.email // Current admin user
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        // Update the financial record's paid amount
        const newPaidAmount = parseFloat(financialRecord.khoandanop) + parsedAmount;

        // Determine new status
        let newStatus = 'chưa hoàn thành';
        if (newPaidAmount + parseFloat(financialRecord.khoandocmien) >= parseFloat(financialRecord.khoanphainop)) {
            newStatus = 'đã hoàn thành';
        }

        // Update the financial record
        await sequelize.query(
            `UPDATE taichinh SET
             khoandanop = ?,
             trangthai = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            {
                replacements: [
                    newPaidAmount,
                    newStatus,
                    taichinh_id
                ],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        res.redirect('/taikhoan/admin/taichinh?success=Thêm phiếu thu thành công');
    } catch (error) {
        console.error('Lỗi thêm phiếu thu:', error);
        res.redirect('/taikhoan/admin/taichinh?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// View all payment receipts for a financial record
router.get('/admin/phieuthu/:taichinh_id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { taichinh_id } = req.params;

        // Get financial record
        const financialRecords = await sequelize.query(
            `SELECT t.*, s.hovaten, s.msv 
             FROM taichinh t
             JOIN sinhvien s ON t.msv = s.msv
             WHERE t.id = ?`,
            {
                replacements: [taichinh_id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!financialRecords || financialRecords.length === 0) {
            return res.redirect('/taikhoan/admin/taichinh?error=Thông tin tài chính không tồn tại');
        }

        const financialRecord = financialRecords[0];

        // Calculate remaining amount
        financialRecord.conlai = parseFloat(financialRecord.khoanphainop) -
            parseFloat(financialRecord.khoandanop) -
            parseFloat(financialRecord.khoandocmien);

        // Get payment receipts
        const receipts = await sequelize.query(
            `SELECT * 
             FROM phieuthu
             WHERE taichinh_id = ?
             ORDER BY thoigian DESC`,
            {
                replacements: [taichinh_id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        res.render('admin/phieuthu', {
            title: 'Quản lý Phiếu Thu',
            user: req.session.user,
            financialRecord,
            receipts: receipts || [],
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Lỗi tải danh sách phiếu thu:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải danh sách phiếu thu',
            error
        });
    }
});

// Delete payment receipt
router.post('/admin/phieuthu/xoa', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { receiptId, taichinh_id } = req.body;

        if (!receiptId || !taichinh_id) {
            return res.redirect(`/taikhoan/admin/phieuthu/${taichinh_id}?error=ID phiếu thu không hợp lệ`);
        }

        // Get receipt info first to know the amount
        const receipts = await sequelize.query(
            'SELECT * FROM phieuthu WHERE id = ?',
            {
                replacements: [receiptId],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!receipts || receipts.length === 0) {
            return res.redirect(`/taikhoan/admin/phieuthu/${taichinh_id}?error=Phiếu thu không tồn tại`);
        }

        const receipt = receipts[0];
        const receiptAmount = parseFloat(receipt.tiendathu);

        // Begin a transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete the receipt
            await sequelize.query(
                'DELETE FROM phieuthu WHERE id = ?',
                {
                    replacements: [receiptId],
                    type: sequelize.QueryTypes.DELETE,
                    transaction
                }
            );

            // Get current financial record
            const financialRecords = await sequelize.query(
                'SELECT * FROM taichinh WHERE id = ?',
                {
                    replacements: [taichinh_id],
                    type: sequelize.QueryTypes.SELECT,
                    transaction
                }
            );

            if (!financialRecords || financialRecords.length === 0) {
                throw new Error('Thông tin tài chính không tồn tại');
            }

            const financialRecord = financialRecords[0];

            // Update the financial record's paid amount
            const newPaidAmount = Math.max(0, parseFloat(financialRecord.khoandanop) - receiptAmount);

            // Determine new status
            let newStatus = 'chưa hoàn thành';
            if (newPaidAmount + parseFloat(financialRecord.khoandocmien) >= parseFloat(financialRecord.khoanphainop)) {
                newStatus = 'đã hoàn thành';
            }

            // Update the financial record
            await sequelize.query(
                `UPDATE taichinh SET
                 khoandanop = ?,
                 trangthai = ?,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                {
                    replacements: [
                        newPaidAmount,
                        newStatus,
                        taichinh_id
                    ],
                    type: sequelize.QueryTypes.UPDATE,
                    transaction
                }
            );

            // Commit the transaction
            await transaction.commit();

            res.redirect(`/taikhoan/admin/phieuthu/${taichinh_id}?success=Xóa phiếu thu thành công`);
        } catch (error) {
            // Rollback the transaction in case of error
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Lỗi xóa phiếu thu:', error);
        res.redirect(`/taikhoan/admin/phieuthu/${req.body.taichinh_id}?error=Đã xảy ra lỗi: ${error.message}`);
    }
});

// Print payment receipt
router.get('/admin/phieuthu/in/:receiptId', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { receiptId } = req.params;

        // Get receipt with related financial and student info
        const receipts = await sequelize.query(
            `SELECT p.*, t.msv, s.hovaten, s.khoa, s.nienkhoa
             FROM phieuthu p
             JOIN taichinh t ON p.taichinh_id = t.id
             JOIN sinhvien s ON t.msv = s.msv
             WHERE p.id = ?`,
            {
                replacements: [receiptId],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!receipts || receipts.length === 0) {
            return res.status(404).render('error', {
                message: 'Không tìm thấy phiếu thu',
                error: { status: 404 }
            });
        }

        const receipt = receipts[0];

        // Format date for display
        receipt.formattedDate = new Date(receipt.thoigian).toLocaleDateString('vi-VN');
        receipt.formattedTime = new Date(receipt.thoigian).toLocaleTimeString('vi-VN');

        // Format amount in words (you might want to implement this function)
        receipt.amountInWords = numberToWords(receipt.tiendathu);

        res.render('admin/phieuthu-print', {
            title: `Phiếu Thu - ${receiptId}`,
            receipt,
            user: req.session.user
        });
    } catch (error) {
        console.error('Lỗi tải phiếu thu để in:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải phiếu thu để in',
            error
        });
    }
});

// Helper function to convert number to Vietnamese words
function numberToWords(num) {
    if (num === 0) return "không đồng";

    const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
    const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

    // Format the number with 2 decimal places and convert to string
    const numStr = num.toFixed(2);

    // Split into integer and decimal parts
    const parts = numStr.split('.');
    const integerPart = parseInt(parts[0]);
    const decimalPart = parseInt(parts[1]);

    function convertGroup(n) {
        let result = "";

        const hundreds = Math.floor(n / 100);
        const tensUnits = n % 100;

        if (hundreds > 0) {
            result += units[hundreds] + " trăm ";
            if (tensUnits > 0 && tensUnits < 10) {
                result += "lẻ ";
            }
        }

        if (tensUnits > 0) {
            if (tensUnits < 10) {
                result += units[tensUnits];
            } else {
                const ten = Math.floor(tensUnits / 10);
                const unit = tensUnits % 10;

                if (ten > 1) {
                    result += tens[ten] + " ";
                    if (unit === 1) {
                        result += "mốt";
                    } else if (unit === 5) {
                        result += "lăm";
                    } else if (unit > 0) {
                        result += units[unit];
                    }
                } else { // ten === 1
                    result += "mười ";
                    if (unit === 1) {
                        result += "một";
                    } else if (unit === 5) {
                        result += "lăm";
                    } else if (unit > 0) {
                        result += units[unit];
                    }
                }
            }
        }

        return result.trim();
    }

    function convertNumber(n) {
        if (n === 0) return "không";

        let result = "";
        let groupIndex = 0;

        while (n > 0) {
            const group = n % 1000;
            if (group > 0) {
                const groupText = convertGroup(group);
                if (groupIndex > 0 && groupText) {
                    result = groupText + " " + scales[groupIndex] + " " + result;
                } else if (groupText) {
                    result = groupText + result;
                }
            }

            n = Math.floor(n / 1000);
            groupIndex++;
        }

        return result.trim();
    }

    let result = convertNumber(integerPart) + " đồng";

    if (decimalPart > 0) {
        result += " và " + convertNumber(decimalPart) + " xu";
    }

    return result;
}


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

// Grade management page
router.get('/admin/manage-grades', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        console.log('Fetching grades for admin:', req.session.user.email);

        // Fetch all courses for dropdown
        const courses = await sequelize.query(
            'SELECT * FROM dangkyhocphan ORDER BY mahocphan',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Fetch all students for dropdown
        const students = await sequelize.query(
            'SELECT msv, hovaten FROM sinhvien ORDER BY hovaten',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Fetch grades with course and student details
        const grades = await sequelize.query(
            `SELECT d.*, s.hovaten, c.tenhocphan 
             FROM diem d
             JOIN sinhvien s ON d.msv = s.msv
             JOIN dangkyhocphan c ON d.hocphan = c.mahocphan
             ORDER BY d.hocki DESC, d.msv ASC`,
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        console.log(`Fetched ${grades.length} grade records`);

        return res.render('admin/manage-grades', {
            title: 'Quản lý Điểm',
            user: req.session.user,
            courses: courses || [],
            students: students || [],
            grades: grades || [],
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Fetch grades error:', error);
        return res.status(500).send('Đã xảy ra lỗi khi tải trang: ' + error.message);
    }
});

// Add new grade
router.post('/admin/add-grade', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { msv, hocphan, hocki, diemquatrinh, diemthi } = req.body;

        // Basic validation
        if (!msv || !hocphan || !hocki) {
            return res.redirect('/taikhoan/admin/manage-grades?error=Vui lòng điền đầy đủ thông tin bắt buộc');
        }

        // Check if grade already exists for this student and course
        const existingGrade = await sequelize.query(
            'SELECT * FROM diem WHERE msv = ? AND hocphan = ? AND hocki = ?',
            {
                replacements: [msv, hocphan, hocki],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (existingGrade && existingGrade.length > 0) {
            return res.redirect('/taikhoan/admin/manage-grades?error=Điểm cho sinh viên này và học phần này đã tồn tại');
        }

        // Convert string values to float
        const processedDiemQuaTrinh = diemquatrinh ? parseFloat(diemquatrinh) : null;
        const processedDiemThi = diemthi ? parseFloat(diemthi) : null;

        // Calculate final grade if both scores are available
        let diemtongket = null;
        let trangthai = null;

        if (processedDiemQuaTrinh !== null && processedDiemThi !== null) {
            diemtongket = processedDiemQuaTrinh * 0.3 + processedDiemThi * 0.7;
            trangthai = diemtongket >= 4.0 ? 'đạt' : 'học lại';
        }

        // Insert new grade
        await sequelize.query(
            `INSERT INTO diem (msv, hocphan, hocki, diemquatrinh, diemthi, diemtongket, trangthai) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    msv,
                    hocphan,
                    hocki,
                    processedDiemQuaTrinh,
                    processedDiemThi,
                    diemtongket,
                    trangthai
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        console.log('Grade added successfully');
        return res.redirect('/taikhoan/admin/manage-grades?success=Thêm điểm thành công');
    } catch (error) {
        console.error('Add grade error:', error);
        return res.redirect('/taikhoan/admin/manage-grades?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Edit grade
router.post('/admin/edit-grade', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { id, hocki, diemquatrinh, diemthi } = req.body;

        // Basic validation
        if (!id || !hocki) {
            return res.redirect('/taikhoan/admin/manage-grades?error=Thông tin không hợp lệ');
        }

        // Convert string values to float
        const processedDiemQuaTrinh = diemquatrinh ? parseFloat(diemquatrinh) : null;
        const processedDiemThi = diemthi ? parseFloat(diemthi) : null;

        // Calculate final grade if both scores are available
        let diemtongket = null;
        let trangthai = null;

        if (processedDiemQuaTrinh !== null && processedDiemThi !== null) {
            diemtongket = processedDiemQuaTrinh * 0.3 + processedDiemThi * 0.7;
            trangthai = diemtongket >= 4.0 ? 'đạt' : 'học lại';
        }

        // Update grade
        await sequelize.query(
            `UPDATE diem SET 
             hocki = ?, 
             diemquatrinh = ?, 
             diemthi = ?, 
             diemtongket = ?, 
             trangthai = ? 
             WHERE id = ?`,
            {
                replacements: [
                    hocki,
                    processedDiemQuaTrinh,
                    processedDiemThi,
                    diemtongket,
                    trangthai,
                    id
                ],
                type: sequelize.QueryTypes.UPDATE
            }
        );

        console.log('Grade updated successfully');
        return res.redirect('/taikhoan/admin/manage-grades?success=Cập nhật điểm thành công');
    } catch (error) {
        console.error('Edit grade error:', error);
        return res.redirect('/taikhoan/admin/manage-grades?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Delete grade
router.post('/admin/delete-grade', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        const { gradeId } = req.body;

        // Delete the grade
        await sequelize.query(
            'DELETE FROM diem WHERE id = ?',
            {
                replacements: [gradeId],
                type: sequelize.QueryTypes.DELETE
            }
        );

        console.log(`Grade ID ${gradeId} deleted successfully`);
        return res.redirect('/taikhoan/admin/manage-grades?success=Xóa điểm thành công');
    } catch (error) {
        console.error('Delete grade error:', error);
        return res.redirect('/taikhoan/admin/manage-grades?error=Đã xảy ra lỗi: ' + error.message);
    }
});

// Get grade details for edit
router.get('/admin/get-grade/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;

        // Fetch grade with related data
        const grades = await sequelize.query(
            `SELECT d.*, s.hovaten, c.tenhocphan 
             FROM diem d
             JOIN sinhvien s ON d.msv = s.msv
             JOIN dangkyhocphan c ON d.hocphan = c.mahocphan
             WHERE d.id = ?`,
            {
                replacements: [id],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!grades || grades.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy điểm' });
        }

        return res.json({ success: true, grade: grades[0] });
    } catch (error) {
        console.error('Get grade error:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// Get grades for a specific student
router.get('/admin/get-student-grades/:msv', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { msv } = req.params;

        // Fetch all grades for this student
        const grades = await sequelize.query(
            `SELECT d.*, s.hovaten, c.tenhocphan 
             FROM diem d
             JOIN sinhvien s ON d.msv = s.msv
             JOIN dangkyhocphan c ON d.hocphan = c.mahocphan
             WHERE d.msv = ?
             ORDER BY d.hocki DESC`,
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Get student info
        const students = await sequelize.query(
            'SELECT * FROM sinhvien WHERE msv = ?',
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        return res.json({
            success: true,
            grades: grades || [],
            student: students.length > 0 ? students[0] : null
        });
    } catch (error) {
        console.error('Get student grades error:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// Get grades for a specific course
router.get('/admin/get-course-grades/:hocphan', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { hocphan } = req.params;

        // Fetch all grades for this course
        const grades = await sequelize.query(
            `SELECT d.*, s.hovaten, c.tenhocphan 
             FROM diem d
             JOIN sinhvien s ON d.msv = s.msv
             JOIN dangkyhocphan c ON d.hocphan = c.mahocphan
             WHERE d.hocphan = ?
             ORDER BY s.hovaten ASC`,
            {
                replacements: [hocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Get course info
        const courses = await sequelize.query(
            'SELECT * FROM dangkyhocphan WHERE mahocphan = ?',
            {
                replacements: [hocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        return res.json({
            success: true,
            grades: grades || [],
            course: courses.length > 0 ? courses[0] : null
        });
    } catch (error) {
        console.error('Get course grades error:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// Calculate GPA for a student
router.get('/admin/calculate-gpa/:msv', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { msv } = req.params;

        // Get all passing grades for this student
        const grades = await sequelize.query(
            `SELECT d.*, c.sotinchi 
             FROM diem d
             JOIN dangkyhocphan c ON d.hocphan = c.mahocphan
             WHERE d.msv = ? AND d.trangthai = 'đạt'`,
            {
                replacements: [msv],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!grades || grades.length === 0) {
            return res.json({ success: true, gpa: null, message: 'Không có điểm để tính GPA' });
        }

        // Calculate GPA
        let totalPoints = 0;
        let totalCredits = 0;

        grades.forEach(grade => {
            if (grade.diemtongket !== null && grade.sotinchi !== null) {
                totalPoints += grade.diemtongket * grade.sotinchi;
                totalCredits += grade.sotinchi;
            }
        });

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : null;

        // Update student's GPA field if there is one, or return the calculated value
        return res.json({ success: true, gpa, totalCredits });
    } catch (error) {
        console.error('Calculate GPA error:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi', error: error.message });
    }
});

// Grade statistics page
router.get('/admin/grade-statistics', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.vaitro !== 'admin') {
            return res.redirect('/taikhoan/dang-nhap?error=Vui lòng đăng nhập với tài khoản admin');
        }

        res.render('admin/grade-statistics', {
            title: 'Thống kê Điểm',
            user: req.session.user
        });
    } catch (error) {
        console.error('Grade statistics error:', error);
        return res.status(500).send('Đã xảy ra lỗi khi tải trang: ' + error.message);
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
