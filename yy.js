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
