const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { isLoggedIn } = require('../middlewares/auth');

// Listar todas las etiquetas
router.get('/list', isLoggedIn, tagController.list);

// Crear nueva etiqueta
router.post('/create', isLoggedIn, tagController.create);

module.exports = router;
