const db = require('../models');

const getHomePage = async (req, res) => {
    try {
        return res.render('home.ejs');
    }
    catch (e) {
        console.log(e);
        return res.send('Error loading home page');
    }
};

const getABC = (req, res) => {
    return res.render('sample.ejs');
};

module.exports = {
    getHomePage,
    getABC
};