const express = require('express');
const router = express.Router();
const dashboardCtrl = require('../controllers/dashboardController');
const { isLoggedIn } = require('../middlewares/auth');

// Pantalla principal
router.get('/', isLoggedIn, dashboardCtrl.showDashboard);

// AJAX: obtener álbumes de un amigo
router.get('/shared-from/:friendId', isLoggedIn, dashboardCtrl.getSharedContentFromFriend);

// Compartir imágenes con solicitante (envía form desde pestaña Compartir)
router.post('/share', isLoggedIn, dashboardCtrl.shareImagesWithRequester);
router.post('/accept-request', isLoggedIn, dashboardCtrl.acceptRequest);
router.post('/reject-request', isLoggedIn, dashboardCtrl.rejectRequest);
// espera body: { solicitante_id, imageIds: [ ... ] }

// Búsqueda de usuarios
router.get('/search', isLoggedIn, dashboardCtrl.searchUsers);

module.exports = router;
