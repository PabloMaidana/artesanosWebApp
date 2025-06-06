const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const { isLoggedIn } = require('../middlewares/auth');

// Listar álbumes del usuario
router.get('/list', isLoggedIn, albumController.listByUser);

// Mostrar formulario para crear álbum
router.get('/create', isLoggedIn, albumController.showCreate);

// Procesar creación de álbum
router.post('/create', isLoggedIn, albumController.create);

// Eliminar (marcar estado=0) álbum por ID
router.post('/delete/:id', isLoggedIn, albumController.delete);

module.exports = router;