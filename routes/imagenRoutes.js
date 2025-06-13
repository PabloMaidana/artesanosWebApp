const express = require('express');
const router = express.Router();
const imagenController = require('../controllers/imagenController');
const { isLoggedIn } = require('../middlewares/auth');

// Listar imágenes de un álbum
router.get('/list/:album_id', isLoggedIn, imagenController.listByAlbum);

// Mostrar formulario para subir imagen
router.get('/create', isLoggedIn, imagenController.showCreate);

// procesar subida de imagen
router.post('/create', isLoggedIn, imagenController.create);

// ver detalle de imagen
router.get('/detail/:id', isLoggedIn, imagenController.detail);

// Eliminar imagen
router.post('/delete/:id', isLoggedIn, imagenController.delete);

router.get('/imagen/add-to-shared/:albumId', isLoggedIn, imagenController.showAddToSharedAlbum);

router.post('/imagen/add-to-shared', isLoggedIn, imagenController.postAddToSharedAlbum);

module.exports = router;