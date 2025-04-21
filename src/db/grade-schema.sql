-- Grade table schema
CREATE TABLE
IF NOT EXISTS diem
(
    id INT AUTO_INCREMENT PRIMARY KEY,
    msv VARCHAR
(20) NOT NULL,
    hocphan VARCHAR
(20) NOT NULL,
    hocki INT NOT NULL,
    diemquatrinh FLOAT,
    diemthi FLOAT,
    diemtongket FLOAT,
    trangthai ENUM
('đạt', 'học lại'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY
(msv) REFERENCES sinhvien
(msv),
    FOREIGN KEY
(hocphan) REFERENCES dangkyhocphan
(mahocphan),
    UNIQUE KEY
(msv, hocphan, hocki)
);
