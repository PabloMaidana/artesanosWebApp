const express = require('express');
const router = express.Router();
const dashboardCtrl = require('../controllers/dashboardController');
const { isLoggedIn } = require('../middlewares/auth');

// Pantalla principal
router.get('/', isLoggedIn, dashboardCtrl.showDashboard);

// AJAX: obtener álbumes de un amigo
router.get('/friend-albums/:friendId', isLoggedIn, dashboardCtrl.getFriendAlbums);

// Compartir imágenes con solicitante (envía form desde pestaña Compartir)
router.post('/share', isLoggedIn, dashboardCtrl.shareImagesWithRequester);
// espera body: { solicitante_id, imageIds: [ ... ] }

// Búsqueda de usuarios
router.get('/search', isLoggedIn, dashboardCtrl.searchUsers);

module.exports = router;
