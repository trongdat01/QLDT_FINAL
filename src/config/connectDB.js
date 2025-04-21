const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Read config directly from file instead of using require
const configPath = path.join(__dirname, 'config.json');
const configContent = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configContent).development;

console.log('Config file path:', configPath);
console.log('Using database from config:', config.database);

// Directly create connection with the database name we want
const sequelize = new Sequelize(
    'qldt', // Hardcode the database name to ensure it works
    config.username || 'root',
    config.password || '',
    {
        host: config.host || 'localhost',
        dialect: config.dialect || 'mysql',
        logging: false
    }
);

let connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`Connection has been established successfully to qldt database.`);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

module.exports = { connectDB, sequelize };