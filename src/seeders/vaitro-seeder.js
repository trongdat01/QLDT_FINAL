'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('vaitro', [
            {
                vaiTro: 'admin',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                vaiTro: 'sinh viên',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('vaitro', null, {});
    }
};
