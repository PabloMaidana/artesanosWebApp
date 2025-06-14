const Imagen = require('../models/imagenModel');
const Comentario = require('../models/comentarioModel');
const ImagenTag = require('../models/imagenTagModel');
const Notificacion = require('../models/notificacionModel');
const Album = require('../models/albumModel');
const Tag = require('../models/tagModel');
const cloudinary = require('../config/cloudinaryConfig');
const streamifier = require('streamifier');

exports.listByAlbum = async (req, res) => {
  try {
    const album_id = parseInt(req.params.album_id, 10);
    if (isNaN(album_id)) {
      return res.status(400).send('ID de álbum inválido');
    }

    const album = await Album.findById(album_id);
    if (!album) {
      return res.status(404).send('Álbum no encontrado');
    }
    const usuario_id = req.session.usuario_id;

    // Verificar permiso de visualización
    let allowedToView = false;
    if (album.usuario_id === usuario_id) {
      allowedToView = true;
    } else if (
      album.compartido_por_usuarioid != null &&
      album.compartido_por_usuarioid === usuario_id
    ) {
      allowedToView = true;
    } else {
      // No permitir ver directamente álbumes de otros fuera del flujo unidireccional
      allowedToView = false;
    }
    if (!allowedToView) {
      return res.status(403).send('No autorizado para ver este álbum');
    }

    // Obtener imágenes
    const images = await Imagen.findAllByAlbum(album_id);

    // Para cada imagen, obtener comentarios con datos de usuario
    for (let img of images) {
      const comentarios = await Comentario.findByImageWithUser(img.imagen_id);
      img.comentarios = comentarios; // añade propiedad comentarios al objeto imagen
    }

    // Determinar si puede subir (revisar tu lógica ya implementada)
    let canUpload = false;
    if (album.compartido_por_usuarioid == null) {
      // Álbum propio
      if (album.usuario_id === usuario_id) {
        canUpload = true;
      }
    } else {
      // Álbum compartido: solo aceptador
      if (album.compartido_por_usuarioid === usuario_id) {
        canUpload = true;
      }
    }

    // Determinar si puede comentar: aquí asumimos que si puede ver, puede comentar
    const canComment = allowedToView;

    // Renderizar, pasando:
    // - album: id, título, compartido_por_usuarioid si es necesario
    // - imagenes: array de objetos con propiedades incluidas .comentarios
    // - canUpload, canComment
    res.render('imagen/list', {
      album: {
        album_id,
        titulo: album.titulo,
        compartido_por_usuarioid: album.compartido_por_usuarioid
      },
      imagenes: images,
      canUpload,
      canComment
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al listar imágenes');
  }
};

exports.showCreateForm = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    // Parámetro opcional albumId
    const albumIdParam = req.params.albumId ? parseInt(req.params.albumId, 10) : null;

    // 1) Obtener álbumes propios donde el usuario puede subir
    const todosAlbumes = await Album.findAllByUser(usuario_id);
    const albumesPropios = todosAlbumes.filter(a => a.compartido_por_usuarioid == null);

    // 2) Obtener lista de tags disponibles
    const tags = await Tag.findAll(); // devuelve array, puede estar vacío si no hay tags

    // 3) Renderizar vista pasando albumes y tags
    res.render('imagen/create', {
      albumes: albumesPropios,
      album_id: albumIdParam,
      tags
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al mostrar formulario de imagen');
  }
};

exports.create = async (req, res) => {
  try {
    // multer habrá procesado el archivo, está en req.file
    if (!req.file) {
      return res.status(400).send('No se ha proporcionado ninguna imagen');
    }
    const usuario_id = req.session.usuario_id;
    const album_id = parseInt(req.body.album_id, 10);
    const descripcion = req.body.descripcion || null;

    // Verificar que el álbum existe y el usuario tenga permiso para subir a ese álbum
    const album = await Album.findById(album_id);
    if (!album) {
      return res.status(400).send('Álbum no válido');
    }
    // Si es álbum compartido, la lógica: solo el aceptador puede subir, etc.
    if (album.compartido_por_usuarioid != null) {
      // Permitir solo si req.session.usuario_id === album.compartido_por_usuarioid
      if (album.compartido_por_usuarioid !== usuario_id) {
        return res.status(403).send('No autorizado para subir en este álbum compartido');
      }
    } else {
      // Álbum propio: usuario_id del álbum debe coincidir
      if (album.usuario_id !== usuario_id) {
        return res.status(403).send('No autorizado para subir en este álbum');
      }
    }

    // Subir a Cloudinary desde el buffer de multer
    const buffer = req.file.buffer; // Buffer con los bytes de la imagen
    // Usar upload_stream:
    const uploadFromBuffer = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `artesanos/${usuario_id}`, 
            resource_type: 'image',
             transformation: [
              { width: 800, crop: "limit" }  // limita ancho a 800px, mantiene proporción
            ]
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const result = await uploadFromBuffer(buffer);

    // result has fields: public_id, secure_url, url, etc.
    const imageUrl = result.secure_url; // o result.url

    // Insertar en la base de datos
    const newImagenId = await Imagen.create({
      album_id,
      url: result.secure_url,
      descripcion,
      public_id: result.public_id
    });

    // Redirigir a la lista de imágenes del álbum, o dashboard, según tu flujo
    return res.redirect(`/imagen/list/${album_id}`);
  } catch (error) {
    console.error('Error al subir imagen a Cloudinary:', error);
    return res.status(500).send('Error al subir la imagen');
  }
};

exports.detail = async (req, res) => {
  try {
    const imagen_id = req.params.id;
    const imagen = await Imagen.findById(imagen_id);
    const comentarios = await Comentario.findByImage(imagen_id);
    const tags = await ImagenTag.findByImage(imagen_id);
    res.render('imagen/detail', { imagen, comentarios, tags });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar detalle de imagen');
  }
};

exports.delete = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const imagen_id = parseInt(req.params.imagenId, 10);
    const img = await Imagen.findById(imagen_id);
    if (!img) return res.status(404).send('Imagen no encontrada');
    // Verificar permiso: get album y comparar usuario_id
    const album = await Album.findById(img.album_id);
    // Lógica de permiso...
    // Primero eliminar en Cloudinary:
    if (img.public_id) {
      await cloudinary.uploader.destroy(img.public_id);
    }
    // Luego eliminar o marcar en tu DB:
    await Imagen.deleteById(imagen_id);
    res.redirect(`/imagen/list/${album.album_id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar imagen');
  }
};

exports.showAddToSharedAlbum = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const albumId = parseInt(req.params.albumId, 10);
    if (isNaN(albumId)) {
      return res.status(400).send('ID de álbum inválido');
    }
    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).send('Álbum no encontrado');
    }
    // Verificar que soy el aceptador: album.compartido_por_usuarioid === usuario_id
    if (album.compartido_por_usuarioid == null || album.compartido_por_usuarioid !== usuario_id) {
      return res.status(403).send('No autorizado para ver/agregar en este álbum compartido');
    }
    // Obtener imágenes actuales en este álbum compartido
    const imagenes = await Imagen.findAllByAlbum(albumId);
    // Obtener tags disponibles si aplica
    let tags = [];
    try {
      tags = await Tag.findAll();
    } catch (_) {}
    // Renderizar la vista sin extends (o con extends según tu layout)
    res.render('imagen/add-to-shared', {
      album: { album_id: albumId, titulo: album.titulo },
      imagenes,
      tags
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al preparar formulario de álbum compartido');
  }
};

/**
 * Procesar subida de nueva imagen a álbum compartido creado para mí.
 * Ruta: POST /imagen/add-to-shared/:albumId
 */
exports.postAddToSharedAlbum = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const albumId = parseInt(req.params.albumId, 10);
    if (isNaN(albumId)) {
      return res.status(400).send('ID de álbum inválido');
    }
    const album = await Album.findById(albumId);
    if (!album || album.compartido_por_usuarioid !== usuario_id) {
      return res.status(403).send('No autorizado para subir en este álbum compartido');
    }

    // Procesar subida de archivo si llega
    if (req.file) {
      // Subir a Cloudinary
      const buffer = req.file.buffer;
      const uploadFromBuffer = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: `artesanos/${usuario_id}`,
              resource_type: 'image',
              transformation: [
                { width: 800, crop: "limit" }
              ]
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };
      const result = await uploadFromBuffer(req.file.buffer);
      const imageUrl = result.secure_url;
      const publicId = result.public_id;
      const descripcion = req.body.descripcion || null;
      // Insertar en BD
      const newImagenId = await Imagen.create({
        album_id: albumId,
        url: imageUrl,
        descripcion,
        public_id: publicId
      });
      // Procesar tags seleccionados
      if (req.body.tag_ids) {
        let tagIds = req.body.tag_ids;
        if (!Array.isArray(tagIds)) tagIds = [tagIds];
        for (let tagIdRaw of tagIds) {
          const tagId = parseInt(tagIdRaw, 10);
          if (!isNaN(tagId)) {
            await ImagenTag.create({ imagen_id: newImagenId, tag_id: tagId });
          }
        }
      }
    }

    // Procesar copia de mis imágenes propias si tu flujo lo permite:
    // Si tu formulario incluye selección de own images (myImages), puedes copiar aquí,
    // similar a postAddToSharedAlbum anterior. Si no, omite esta parte.

    // Redirigir de nuevo al formulario de este álbum compartido
    return res.redirect(`/imagen/add-to-shared/${albumId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar imágenes al álbum compartido');
  }
};

exports.comment = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const imagen_id = parseInt(req.params.imagenId, 10);
    if (isNaN(imagen_id)) {
      return res.status(400).send('ID de imagen inválido');
    }
    const texto = req.body.texto;
    if (!texto || texto.trim() === '') {
      // Si no se proporcionó texto, redirigir de vuelta sin crear
      // Redirigir al listado del álbum; obtenemos referer o extraemos album_id:
      const referer = req.get('referer');
      return res.redirect(referer || '/dashboard');
    }

    // Verificar que la imagen existe y que el usuario puede verla (mismo permiso que en listByAlbum)
    const img = await Imagen.findById(imagen_id);
    if (!img) {
      return res.status(404).send('Imagen no encontrada');
    }
    const album = await Album.findById(img.album_id);
    if (!album) {
      return res.status(400).send('Álbum de la imagen no válido');
    }
    // Verificar permiso de vista antes de comentar:
    let allowedToView = false;
    if (album.usuario_id === usuario_id) {
      allowedToView = true;
    } else if (
      album.compartido_por_usuarioid != null &&
      album.compartido_por_usuarioid === usuario_id
    ) {
      allowedToView = true;
    }
    if (!allowedToView) {
      return res.status(403).send('No autorizado para comentar esta imagen');
    }

    // Crear el comentario
    await Comentario.create({
      usuario_id,
      imagen_id,
      texto: texto.trim()
    });

    // (Opcional) crear notificación al autor de la imagen si se desea:
    // if (img.usuario_id && img.usuario_id !== usuario_id) { ... }

    // Redirigir de vuelta al listado de imágenes del álbum
    return res.redirect(`/imagen/list/${album.album_id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al comentar la imagen');
  }
};