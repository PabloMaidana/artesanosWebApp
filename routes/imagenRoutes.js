const express = require('express');
const router = express.Router();
const imagenController = require('../controllers/imagenController');
const upload = require('../middlewares/uploadMiddleware'); // multer memoryStorage
const { isLoggedIn } = require('../middlewares/auth');

// Listar imágenes de un álbum
router.get('/list/:album_id', isLoggedIn, imagenController.listByAlbum);

// Mostrar formulario para subir imagen
router.get('/create', isLoggedIn, imagenController.showCreateForm);

router.get('/create/:albumId', isLoggedIn, imagenController.showCreateForm);

// ver detalle de imagen
router.get('/detail/:id', isLoggedIn, imagenController.detail);

// Eliminar imagen
router.post('/delete/:id', isLoggedIn, imagenController.delete);

router.post('/create', isLoggedIn, upload.single('imagen'), imagenController.create);

router.post('/comment/:imagenId', isLoggedIn, imagenController.comment);


// Mostrar lista de mis álbumes propios para elegir desde dónde compartir:

router.get('/add-to-shared/:sharedAlbumId', isLoggedIn, imagenController.showAddToSharedAlbum);

// Mostrar imágenes de un álbum propio seleccionado, con checkboxes:

router.get('/add-to-shared/:sharedAlbumId/from/:sourceAlbumId', isLoggedIn, imagenController.showImagesFromOwnAlbumForSharing);

// Procesar selección de imágenes para compartir:

router.post('/add-to-shared/:sharedAlbumId/share', isLoggedIn, imagenController.postShareImagesToSharedAlbum);

module.exports = router;