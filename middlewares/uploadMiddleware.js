const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024  // límite 5MB
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo archivos de imagen
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  }
});

module.exports = upload;
