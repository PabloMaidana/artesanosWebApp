const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { isLoggedIn, isLoggedOut } = require('../middlewares/auth');

// Mostrar formulario de login
router.get('/login', isLoggedOut, usuarioController.showLogin);

// Procesar login
router.post('/login', isLoggedOut, usuarioController.login);

// Logout
router.get('/logout', isLoggedIn, usuarioController.logout);

// Mostrar perfil
router.get('/perfil', isLoggedIn, usuarioController.showProfile);

// Mostrar formulario de cambio de contraseña
router.get('/change-password', isLoggedIn, usuarioController.showChangePassword);

// Procesar cambio de contraseña
router.post('/change-password', isLoggedIn, usuarioController.changePassword);

module.exports = router;