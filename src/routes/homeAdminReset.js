const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/connectDB');
const bcrypt = require('bcryptjs');

// A temporary route to reset admin password for testing
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

// Add debug route to list admins
router.get('/list-admins', async (req, res) => {
    try {
        console.log('Testing database connection...');
        await sequelize.authenticate();
        console.log('Database connection is OK');

        // Query admins
        const admins = await sequelize.query(
            'SELECT a.*, v.vaitro FROM admin a JOIN vaitro v ON a.vaitro_id = v.id',
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Return results as JSON
        res.json({
            success: true,
            message: `Found ${admins.length} admin accounts`,
            data: admins
        });
    } catch (error) {
        console.error('Error checking admins:', error);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message
        });
    }
});

// Add route to force create a test admin account
router.get('/force-create-admin', async (req, res) => {
    try {
        // Check if vaitro table has data
        const roles = await sequelize.query(
            'SELECT * FROM vaitro WHERE id = 1',
            { type: sequelize.QueryTypes.SELECT }
        );

        if (!roles || roles.length === 0) {
            await sequelize.query(
                "INSERT INTO vaitro (id, vaitro) VALUES (1, 'admin')",
                { type: sequelize.QueryTypes.INSERT }
            );
            console.log('Created admin role');
        }

        // Create admin account
        const email = 'admin@example.com';
        const plainPassword = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        try {
            await sequelize.query(
                'INSERT INTO admin (email, matkhau, vaitro_id) VALUES (?, ?, ?)',
                {
                    replacements: [email, hashedPassword, 1],
                    type: sequelize.QueryTypes.INSERT
                }
            );
            res.send(`Force created new admin. Email: ${email}, Password: ${plainPassword}`);
        } catch (insertError) {
            // If duplicate, try update
            if (insertError.name === 'SequelizeUniqueConstraintError') {
                await sequelize.query(
                    'UPDATE admin SET matkhau = ? WHERE email = ?',
                    {
                        replacements: [hashedPassword, email],
                        type: sequelize.QueryTypes.UPDATE
                    }
                );
                res.send(`Updated existing admin. Email: ${email}, Password: ${plainPassword}`);
            } else {
                throw insertError;
            }
        }
    } catch (error) {
        console.error('Force create admin error:', error);
        res.status(500).send('Error: ' + error.message);
    }
});

// Add route to create sample news articles
router.get('/create-sample-news', async (req, res) => {
    try {
        // Create tintuc table if it doesn't exist yet
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS tintuc (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tieude VARCHAR(255) NOT NULL,
                    danhmuc ENUM('thông báo', 'sự kiện', 'học thuật', 'tuyển sinh') NOT NULL,
                    ngaydang TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    anhminhhoa VARCHAR(255),
                    linkbaidang TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
        } catch (tableError) {
            console.error('Error creating table:', tableError);
        }

        // Add sample news articles
        const sampleNews = [
            {
                tieude: 'Thông báo về lịch khai giảng năm học mới 2023-2024',
                danhmuc: 'thông báo',
                anhminhhoa: 'https://example.com/images/khai-giang.jpg',
                linkbaidang: 'https://example.com/thong-bao/khai-giang-2023-2024'
            },
            {
                tieude: 'Hội thảo "Kỹ năng mềm cho sinh viên thời đại 4.0"',
                danhmuc: 'sự kiện',
                anhminhhoa: 'https://example.com/images/hoi-thao.jpg',
                linkbaidang: 'https://example.com/su-kien/hoi-thao-ky-nang-mem'
            },
            {
                tieude: 'Thông báo về kỳ thi cuối kỳ học kỳ 1 năm học 2023-2024',
                danhmuc: 'thông báo',
                anhminhhoa: 'https://example.com/images/thi-cuoi-ky.jpg',
                linkbaidang: 'https://example.com/thong-bao/ky-thi-cuoi-ky-1-2023-2024'
            },
            {
                tieude: 'Chương trình trao đổi sinh viên với Đại học Quốc tế',
                danhmuc: 'học thuật',
                anhminhhoa: 'https://example.com/images/trao-doi-sv.jpg',
                linkbaidang: 'https://example.com/hoc-thuat/chuong-trinh-trao-doi-sinh-vien'
            },
            {
                tieude: 'Thông tin tuyển sinh đại học năm 2024',
                danhmuc: 'tuyển sinh',
                anhminhhoa: 'https://example.com/images/tuyen-sinh.jpg',
                linkbaidang: 'https://example.com/tuyen-sinh/thong-tin-tuyen-sinh-2024'
            }
        ];

        // Insert each news article
        for (const news of sampleNews) {
            await sequelize.query(
                'INSERT INTO tintuc (tieude, danhmuc, anhminhhoa, linkbaidang) VALUES (?, ?, ?, ?)',
                {
                    replacements: [news.tieude, news.danhmuc, news.anhminhhoa, news.linkbaidang],
                    type: sequelize.QueryTypes.INSERT
                }
            );
        }

        res.send(`Created ${sampleNews.length} sample news articles successfully.`);
    } catch (error) {
        console.error('Error creating sample news:', error);
        res.status(500).send('Error: ' + error.message);
    }
});

// Add route to create sample courses with proper table creation
router.get('/create-sample-courses', async (req, res) => {
    try {
        // Create or check dangkyhocphan table - UPDATED to remove trangthaidangky column
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS dangkyhocphan (
                    mahocphan VARCHAR(20) PRIMARY KEY,
                    tenhocphan VARCHAR(255) NOT NULL,
                    khoa VARCHAR(100) NOT NULL,
                    hocki VARCHAR(20) NOT NULL,
                    loaihocphan ENUM('bắt buộc', 'tự chọn', 'đồ án', 'thực tập') NOT NULL,
                    sotinchi INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log("Verified dangkyhocphan table exists");

            // Also check dsdangkyhocphan table with trangthaidangky field
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS dsdangkyhocphan (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    msv VARCHAR(20) NOT NULL,
                    mahocphan VARCHAR(20) NOT NULL,
                    trangthaidangky ENUM('đã đăng ký', 'đã hủy') DEFAULT 'đã đăng ký',
                    ngaydangky TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (msv) REFERENCES sinhvien(msv) ON DELETE CASCADE,
                    FOREIGN KEY (mahocphan) REFERENCES dangkyhocphan(mahocphan) ON DELETE CASCADE,
                    UNIQUE KEY (msv, mahocphan)
                )
            `);
            console.log("Verified dsdangkyhocphan table exists");
        } catch (tableError) {
            console.error('Error creating table:', tableError);
        }

        // Create sample courses
        const sampleCourses = [
            {
                mahocphan: 'CNTT001',
                tenhocphan: 'Lập trình cơ bản',
                khoa: 'Công nghệ thông tin',
                hocki: 'Học kỳ 1',
                loaihocphan: 'bắt buộc',
                sotinchi: 3
            },
            {
                mahocphan: 'CNTT002',
                tenhocphan: 'Cấu trúc dữ liệu và giải thuật',
                khoa: 'Công nghệ thông tin',
                hocki: 'Học kỳ 1',
                loaihocphan: 'bắt buộc',
                sotinchi: 4
            },
            {
                mahocphan: 'CNTT003',
                tenhocphan: 'Cơ sở dữ liệu',
                khoa: 'Công nghệ thông tin',
                hocki: 'Học kỳ 2',
                loaihocphan: 'bắt buộc',
                sotinchi: 4
            },
            {
                mahocphan: 'CNTT004',
                tenhocphan: 'Lập trình web',
                khoa: 'Công nghệ thông tin',
                hocki: 'Học kỳ 2',
                loaihocphan: 'tự chọn',
                sotinchi: 3
            },
            {
                mahocphan: 'CNTT005',
                tenhocphan: 'Trí tuệ nhân tạo',
                khoa: 'Công nghệ thông tin',
                hocki: 'Học kỳ 2',
                loaihocphan: 'tự chọn',
                sotinchi: 3
            }
        ];

        // Insert each course
        for (const course of sampleCourses) {
            try {
                await sequelize.query(
                    'INSERT INTO dangkyhocphan (mahocphan, tenhocphan, khoa, hocki, loaihocphan, sotinchi) VALUES (?, ?, ?, ?, ?, ?)',
                    {
                        replacements: [
                            course.mahocphan,
                            course.tenhocphan,
                            course.khoa,
                            course.hocki,
                            course.loaihocphan,
                            course.sotinchi
                        ],
                        type: sequelize.QueryTypes.INSERT
                    }
                );
            } catch (err) {
                if (!err.message.includes('Duplicate entry')) {
                    throw err;
                }
                console.log(`Course ${course.mahocphan} already exists, skipping`);
            }
        }

        res.send(`Created sample courses successfully.`);
    } catch (error) {
        console.error('Error creating sample courses:', error);
        res.status(500).send('Error: ' + error.message);
    }
});

// Add route to create sample course registrations
router.get('/create-sample-registrations', async (req, res) => {
    try {
        // First, ensure we have at least one student and one course
        const students = await sequelize.query(
            'SELECT msv FROM sinhvien LIMIT 1',
            { type: sequelize.QueryTypes.SELECT }
        );

        const courses = await sequelize.query(
            'SELECT mahocphan FROM dangkyhocphan LIMIT 1',
            { type: sequelize.QueryTypes.SELECT }
        );

        if (students.length === 0) {
            return res.status(400).send('No students found. Please create at least one student first.');
        }

        if (courses.length === 0) {
            return res.status(400).send('No courses found. Please create at least one course first.');
        }

        const msv = students[0].msv;
        const mahocphan = courses[0].mahocphan;

        // Check if registration already exists
        const existingRegistration = await sequelize.query(
            'SELECT * FROM dsdangkyhocphan WHERE msv = ? AND mahocphan = ?',
            {
                replacements: [msv, mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (existingRegistration.length > 0) {
            return res.send(`Registration already exists for student ${msv} and course ${mahocphan}`);
        }

        // Create a registration with default status "chưa đăng ký"
        await sequelize.query(
            "INSERT INTO dsdangkyhocphan (msv, mahocphan, trangthaidangky) VALUES (?, ?, 'chưa đăng ký')",
            {
                replacements: [msv, mahocphan],
                type: sequelize.QueryTypes.INSERT
            }
        );

        // Create another registration with status "đã đăng ký" if there are more courses
        const moreCourses = await sequelize.query(
            'SELECT mahocphan FROM dangkyhocphan WHERE mahocphan != ? LIMIT 1',
            {
                replacements: [mahocphan],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (moreCourses.length > 0) {
            const secondCourse = moreCourses[0].mahocphan;

            // Check if this registration already exists
            const existingSecondReg = await sequelize.query(
                'SELECT * FROM dsdangkyhocphan WHERE msv = ? AND mahocphan = ?',
                {
                    replacements: [msv, secondCourse],
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (existingSecondReg.length === 0) {
                await sequelize.query(
                    "INSERT INTO dsdangkyhocphan (msv, mahocphan, trangthaidangky) VALUES (?, ?, 'đã đăng ký')",
                    {
                        replacements: [msv, secondCourse],
                        type: sequelize.QueryTypes.INSERT
                    }
                );
            }
        }

        res.send('Created sample course registrations successfully!');
    } catch (error) {
        console.error('Error creating sample registrations:', error);
        res.status(500).send('Error: ' + error.message);
    }
});

// Add route to list all database tables - useful for debugging
router.get('/list-tables', async (req, res) => {
    try {
        const [tables] = await sequelize.query(
            'SHOW TABLES'
        );

        res.json({
            success: true,
            message: `Found ${tables.length} tables in database`,
            tables: tables
        });
    } catch (error) {
        console.error('Error listing tables:', error);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message
        });
    }
});

module.exports = router;
