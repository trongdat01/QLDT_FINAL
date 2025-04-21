const db = require('../models');
const bcrypt = require('bcryptjs');

// Get all accounts
const getAllTaiKhoan = async (req, res) => {
    try {
        const accounts = await db.TaiKhoan.findAll({
            attributes: ['id', 'ten_dang_nhap', 'loai_tai_khoan', 'email', 'ngay_tao']
        });
        return res.render('taikhoan/index', {
            accounts,
            success: req.query.success
        });
    } catch (error) {
        console.log(error);
        return res.render('taikhoan/index', {
            accounts: [],
            error: 'Không thể lấy danh sách tài khoản'
        });
    }
};

// Show create account form
const getCreateTaiKhoan = (req, res) => {
    return res.render('taikhoan/create');
};

// Create a new account
const createTaiKhoan = async (req, res) => {
    try {
        const { ten_dang_nhap, mat_khau, loai_tai_khoan, email } = req.body;

        // Hash password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(mat_khau, salt);

        await db.TaiKhoan.create({
            ten_dang_nhap,
            mat_khau: hashedPassword,
            loai_tai_khoan,
            email
        });

        return res.redirect('/taikhoan?success=Tạo tài khoản thành công');
    } catch (error) {
        console.log(error);
        return res.render('taikhoan/create', {
            error: 'Không thể tạo tài khoản',
            inputData: req.body
        });
    }
};

// Show edit account form
const getEditTaiKhoan = async (req, res) => {
    try {
        const account = await db.TaiKhoan.findByPk(req.params.id, {
            attributes: ['id', 'ten_dang_nhap', 'loai_tai_khoan', 'email']
        });

        if (!account) {
            return res.redirect('/taikhoan?error=Không tìm thấy tài khoản');
        }

        return res.render('taikhoan/edit', { account });
    } catch (error) {
        console.log(error);
        return res.redirect('/taikhoan?error=Lỗi khi tìm tài khoản');
    }
};

// Update account
const updateTaiKhoan = async (req, res) => {
    try {
        const { ten_dang_nhap, loai_tai_khoan, email, mat_khau } = req.body;
        const accountId = req.params.id;

        const account = await db.TaiKhoan.findByPk(accountId);

        if (!account) {
            return res.redirect('/taikhoan?error=Không tìm thấy tài khoản');
        }

        const updateData = {
            ten_dang_nhap,
            loai_tai_khoan,
            email
        };

        // Only update password if provided
        if (mat_khau && mat_khau.trim() !== '') {
            const salt = bcrypt.genSaltSync(10);
            updateData.mat_khau = bcrypt.hashSync(mat_khau, salt);
        }

        await db.TaiKhoan.update(updateData, {
            where: { id: accountId }
        });

        return res.redirect('/taikhoan?success=Cập nhật tài khoản thành công');
    } catch (error) {
        console.log(error);
        return res.render('taikhoan/edit', {
            account: { ...req.body, id: req.params.id },
            error: 'Không thể cập nhật tài khoản'
        });
    }
};

// Delete account
const deleteTaiKhoan = async (req, res) => {
    try {
        const accountId = req.params.id;
        await db.TaiKhoan.destroy({
            where: { id: accountId }
        });

        return res.redirect('/taikhoan?success=Xóa tài khoản thành công');
    } catch (error) {
        console.log(error);
        return res.redirect('/taikhoan?error=Không thể xóa tài khoản');
    }
};

module.exports = {
    getAllTaiKhoan,
    getCreateTaiKhoan,
    createTaiKhoan,
    getEditTaiKhoan,
    updateTaiKhoan,
    deleteTaiKhoan
};
