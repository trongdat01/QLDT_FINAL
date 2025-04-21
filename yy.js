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
            // Format ISO string to be compatible with datetime-local input
            const date = new Date(examSchedule.thoigianthi);
            examSchedule.formattedDateTime = date.toISOString().slice(0, 16);
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

        // Format dates for display
        examSchedules.forEach(schedule => {
            if (schedule.thoigianthi) {
                const date = new Date(schedule.thoigianthi);
                schedule.formattedDate = date.toLocaleDateString('vi-VN');
                schedule.formattedTime = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            }
        });

        res.render('sinhvien/lichthi', {
            title: 'Lịch Thi Của Tôi',
            user: req.session.user,
            examSchedules: examSchedules || [],
            courses: registeredCourses || []
        });
    } catch (error) {
        console.error('Lỗi tải lịch thi sinh viên:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải lịch thi của bạn',
            error
        });
    }
});
