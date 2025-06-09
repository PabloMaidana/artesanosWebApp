const express = require('express');
const router = express.Router();
const comentarioController = require('../controllers/comentarioController');
const { isLoggedIn } = require('../middlewares/auth');

// Procesar creación de comentario
router.post('/create', isLoggedIn, comentarioController.create);

module.exports = router;