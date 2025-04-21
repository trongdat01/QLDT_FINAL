'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class VaiTro extends Model {
        static associate(models) {
            // Define associations here if needed
        }
    }

    VaiTro.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        vaitro: { // Changed from vaiTro to vaitro to match DB column name
            type: DataTypes.ENUM('admin', 'sinhvien'), // Changed to match DB ENUM values
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'VaiTro',
        tableName: 'vaitro',
        timestamps: true
    });

    return VaiTro;
};
