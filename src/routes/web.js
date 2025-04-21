const express = require('express')
const homeController = require('../controllers/homeController')
const router = express.Router()

// Check if methods exist before using them
if (homeController.getHomePage) {
    router.get('/', homeController.getHomePage)
} else {
    router.get('/', (req, res) => {
        res.send('Home page controller not found. Please check your implementation.')
    })
}

if (homeController.getABC) {
    router.get('/abc', homeController.getABC)
} else {
    router.get('/abc', (req, res) => {
        res.send('ABC page controller not found. Please check your implementation.')
    })
}

module.exports = router