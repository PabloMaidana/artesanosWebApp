const express = require('express');
const router = express.Router();
const amistadController = require('../controllers/amistadController');
const { isLoggedIn } = require('../middlewares/auth');

// Ver solicitudes recibidas
router.get('/solicitudes', isLoggedIn, amistadController.listReceived);

// Enviar nueva solicitud
router.post('/solicitud/send', isLoggedIn, amistadController.sendRequest);

// Responder (aceptar/rechazar) solicitud
router.post('/solicitud/respond', isLoggedIn, amistadController.respondRequest);

module.exports = router;