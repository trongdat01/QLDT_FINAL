-- Create database if not exists
CREATE DATABASE
IF NOT EXISTS qldt;
USE qldt;

-- Table vaitro
CREATE TABLE vaitro
(
    id INT
    AUTO_INCREMENT PRIMARY KEY,
    vaitro ENUM
    ('admin', 'sinhvien') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
    UPDATE CURRENT_TIMESTAMP
    );

    -- Table admin
    CREATE TABLE admin
    (
        id INT
        AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR
        (100) NOT NULL UNIQUE,
    matkhau VARCHAR
        (255) NOT NULL,
    vaitro_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
        UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
        (vaitro_id) REFERENCES vaitro
        (id)
);

        -- Table sinhvien
        CREATE TABLE sinhvien (
    msv VARCHAR(20) PRIMARY KEY,
    hovaten VARCHAR(100) NOT NULL,
    sodienthoai VARCHAR(15),
    khoa VARCHAR(100) NOT NULL,
    nienkhoa VARCHAR(20) NOT NULL,
    gioitinh ENUM('Nam', 'Nữ', 'Khác'),
    ngaysinh DATE,
    anhdaidien VARCHAR
        (255),
    vaitro_id INT NOT NULL,
    email VARCHAR
        (100) UNIQUE,
    matkhau VARCHAR
        (255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
        UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
        (vaitro_id) REFERENCES vaitro
        (id)
);

        -- Table tintuc
        CREATE TABLE tintuc
        (
            id INT
            AUTO_INCREMENT PRIMARY KEY,
    tieude VARCHAR
            (255) NOT NULL,
    danhmuc ENUM
            ('thông báo', 'sự kiện', 'học thuật', 'tuyển sinh') NOT NULL,
    ngaydang TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    anhminhhoa VARCHAR
            (255),
    linkbaidang TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
            UPDATE CURRENT_TIMESTAMP
            );

            -- Table dangkyhocphan
            CREATE TABLE dangkyhocphan (
    mahocphan VARCHAR(20) PRIMARY KEY,
    tenhocphan VARCHAR(255) NOT NULL,
    khoa VARCHAR(100) NOT NULL,
    hocki VARCHAR(20) NOT NULL,
    loaihocphan ENUM('bắt buộc', 'tự chọn', 'đồ án', 'thực tập') NOT NULL,
    sotinchi INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
            UPDATE CURRENT_TIMESTAMP
            );

            -- Table dsdangkyhocphan
            CREATE TABLE dsdangkyhocphan
            (
                id INT
                AUTO_INCREMENT PRIMARY KEY,
    msv VARCHAR
                (20) NOT NULL,
    mahocphan VARCHAR
                (20) NOT NULL,
    ngaydangky TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trangthaidangky ENUM
                ('đã đăng ký', 'chưa đăng ký') DEFAULT 'chưa đăng ký',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
                UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
                (msv) REFERENCES sinhvien
                (msv),
    FOREIGN KEY
                (mahocphan) REFERENCES dangkyhocphan
                (mahocphan),
    UNIQUE KEY
                (msv, mahocphan)
);

                -- Table diem
                CREATE TABLE
                IF NOT EXISTS diem
                (
                    id INT
                    AUTO_INCREMENT PRIMARY KEY,
    hocphan VARCHAR
                (20) NOT NULL,
    hocki VARCHAR
                (20) NOT NULL,
    msv VARCHAR
                (20) NOT NULL,
    diemquatrinh FLOAT,
    diemthi FLOAT,
    diemtongket FLOAT,
    trangthai ENUM
                ('đạt', 'học lại'),
    diemtrungbinh FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
                UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
                (msv) REFERENCES sinhvien
                (msv),
    FOREIGN KEY
                (hocphan) REFERENCES dangkyhocphan
                (mahocphan)
);

                -- Table lichhoc
                CREATE TABLE lichhoc
                (
                    id INT
                    AUTO_INCREMENT PRIMARY KEY,
    mahocphan VARCHAR
                    (20) NOT NULL,
    namhoc VARCHAR
                    (20) NOT NULL,
    hocky VARCHAR
                    (20) NOT NULL,
    giangvien VARCHAR
                    (100) NOT NULL,
    phonghoclythuyet VARCHAR
                    (50),
    thu_lythuyet VARCHAR
                    (20),
    cahoc_lythuyet VARCHAR
                    (50),
    phonghocthuchanh VARCHAR
                    (50),
    thu_thuchanh VARCHAR
                    (20),
    cahoc_thuchanh VARCHAR
                    (50),
    ngaybatdau DATE NOT NULL,
    ngayketthuc DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
                    UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
                    (mahocphan) REFERENCES dangkyhocphan
                    (mahocphan)
);

                    -- Table lichthi
                    CREATE TABLE lichthi
                    (
                        id INT
                        AUTO_INCREMENT PRIMARY KEY,
    mahocphan VARCHAR
                        (20) NOT NULL,
    namhoc VARCHAR
                        (20) NOT NULL,
    kihoc VARCHAR
                        (20) NOT NULL,
    giangviencoithi VARCHAR
                        (100) NOT NULL,
    phongthi VARCHAR
                        (50) NOT NULL,
    thu VARCHAR
                        (20) NOT NULL,
    thoigianthi DATETIME NOT NULL,
    hinhthuathi VARCHAR
                        (50) NOT NULL,
    trangthai ENUM
                        ('đã lên lịch', 'đã hoàn thành', 'hoãn thi') DEFAULT 'đã lên lịch',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
                        UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
                        (mahocphan) REFERENCES dangkyhocphan
                        (mahocphan)
);

                        -- Table taichinh
                        CREATE TABLE taichinh
                        (
                            id INT
                            AUTO_INCREMENT PRIMARY KEY,
    msv VARCHAR
                            (20) NOT NULL,
    trangthai ENUM
                            ('đã hoàn thành', 'chưa hoàn thành') DEFAULT 'chưa hoàn thành',
    khoanphainop DECIMAL
                            (10, 2) NOT NULL,
    khoandanop DECIMAL
                            (10, 2) DEFAULT 0,
    khoandocmien DECIMAL
                            (10, 2) DEFAULT 0,
    qr_nganhang VARCHAR
                            (100),
    qr_sotaikhoan VARCHAR
                            (50),
    qr_tennguoinhan VARCHAR
                            (100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
                            UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
                            (msv) REFERENCES sinhvien
                            (msv)
);

                            -- Table phieuthu
                            CREATE TABLE phieuthu
                            (
                                id VARCHAR(50) PRIMARY KEY,
                                taichinh_id INT NOT NULL,
                                tiendathu DECIMAL(10, 2) NOT NULL,
                                thoigian DATETIME DEFAULT CURRENT_TIMESTAMP,
                                nganhangchuyen VARCHAR(100),
                                nganhangnhan VARCHAR(100),
                                nguoilaphieu VARCHAR(100) NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                ON
                                UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
                                (taichinh_id) REFERENCES taichinh
                                (id)
);

                                -- Insert initial data to vaitro table
                                INSERT INTO vaitro
                                    (vaitro)
                                VALUES
                                    ('admin'),
                                    ('sinhvien');

                                -- Optional: Add some sample data for testing
                                -- Example admin account
                                INSERT INTO admin
                                    (email, matkhau, vaitro_id)
                                VALUES
                                    ('admin@example.com', '$2a$10$XFCLdWhDIUZY2YuQPkgVVuh4mZMPvGX9hIAA2m3rn7rJ8JWq8vTOi', 1);
                                -- Password: admin123

                                -- Example student account
                                INSERT INTO sinhvien
                                    (msv, hovaten, sodienthoai, khoa, nienkhoa, gioitinh, ngaysinh, vaitro_id, email, matkhau)
                                VALUES
                                    ('SV001', 'Nguyễn Văn A', '0901234567', 'Công nghệ thông tin', '2022-2026', 'Nam', '2004-05-15', 2, 'nguyenvana@example.com', '$2a$10$XFCLdWhDIUZY2YuQPkgVVuh4mZMPvGX9hIAA2m3rn7rJ8JWq8vTOi');

                                -- Example course
                                INSERT INTO dangkyhocphan
                                    (mahocphan, tenhocphan, khoa, hocki, loaihocphan, sotinchi)
                                VALUES
                                    ('CNTT001', 'Lập trình cơ bản', 'Công nghệ thông tin', 'Học kỳ 1', 'bắt buộc', 3);
