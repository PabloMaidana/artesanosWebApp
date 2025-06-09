const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const { isLoggedIn } = require('../middlewares/auth');

// Obtener count de notificaciones no leídas (JSON)
router.get('/count', isLoggedIn, notificacionController.unreadCount);

// Marcar notificación como leída
router.post('/read', isLoggedIn, notificacionController.markRead);

// listar todas las notificaciones no leídas 
router.get('/list', isLoggedIn, notificacionController.listAll);

module.exports = router;
