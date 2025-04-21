'use strict';
module.exports = (sequelize, DataTypes) => {
    const TaiKhoan = sequelize.define('TaiKhoan', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ten_dang_nhap: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        mat_khau: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        loai_tai_khoan: {
            type: DataTypes.STRING(10),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(100),
            unique: true
        },
        ngay_tao: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'TaiKhoan',
        timestamps: false
    });

    return TaiKhoan;
};
