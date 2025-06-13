const Imagen = require('../models/imagenModel');
const Comentario = require('../models/comentarioModel');
const ImagenTag = require('../models/imagenTagModel');
const Notificacion = require('../models/notificacionModel');

exports.listByAlbum = async (req, res) => {
  try {
    const album_id = req.params.album_id;
    const imagenes = await Imagen.findAllByAlbum(album_id);
    res.render('imagen/list', { imagenes, album_id });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al listar imágenes del álbum');
  }
};

exports.showCreate = async (req, res) => {
  try {
    // si viene con query ?album_id=...,  pasa a la vista
    const album_id = req.query.album_id || null;
    // obtener lista de álbumes del usuario para elegir (en caso de no venir query)
    const Album = require('../models/albumModel');
    const albumes = await Album.findAllByUser(req.session.usuario_id);
    // obtener todos los tags disponibles
    const Tag = require('../models/tagModel');
    const tags = await Tag.findAll();
    res.render('imagen/create', { albumes, tags, album_id });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar formulario de subir imagen');
  }
};

exports.create = async (req, res) => {
  try {
    const { album_id, url, descripcion, tag_ids } = req.body;
    // verificar que el álbum pertenece a este usuario o es compartido adecuado:
    const album = await Album.findById(album_id);
    if (!album) return res.status(400).send('Álbum no válido');
    // Si es un álbum compartido (compartido_por_usuarioid != null), verificar que req.session.usuario_id === album.compartido_por_usuarioid
    if (album.compartido_por_usuarioid != null) {
      if (album.compartido_por_usuarioid !== req.session.usuario_id) {
        return res.status(403).send('No autorizado para subir en este álbum');
      }
    } else {
      // álbum propio: verificar propiedad
      if (album.usuario_id !== req.session.usuario_id) {
        return res.status(403).send('No autorizado para subir en este álbum');
      }
    }
    // Crear imagen
    const imagen_id = await Imagen.create({ album_id, url, descripcion });
    // Tags si aplica...
    res.redirect(`/imagen/list/${album_id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al subir imagen');
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
    const imagen_id = req.params.id;
    // Para redirigir de vuelta al álbum, primero obtenemos la imagen (antes de desactivar)
    const imagen = await Imagen.findById(imagen_id);
    await Imagen.delete(imagen_id);
    res.redirect(`/imagen/list/${imagen.album_id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar imagen');
  }
};

exports.showAddToSharedAlbum = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const albumId = parseInt(req.params.albumId, 10);
    const album = await Album.findById(albumId);
    if (!album || album.compartido_por_usuarioid !== usuario_id) {
      return res.status(403).send('No autorizado');
    }
    // Obtener imágenes propias de otros álbumes para permitir copiar
    const myAlbums = await Album.findAllByUser(usuario_id);
    const myImages = [];
    for (let alb of myAlbums) {
      // Solo álbumes propios (compartido_por_usuarioid NULL)
      if (alb.compartido_por_usuarioid == null) {
        const imgs = await Imagen.findAllByAlbum(alb.album_id);
        for (let img of imgs) {
          myImages.push(img);
        }
      }
    }
    // permitir subir nuevas imágenes directamente al álbum compartido
    res.render('imagen/addToShared', { album, myImages });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al preparar formulario de agregar imágenes');
  }
};

exports.postAddToSharedAlbum = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const albumId = parseInt(req.body.album_id, 10);
    const selectedImageIds = req.body.imageIds; // array o string
    const album = await Album.findById(albumId);
    if (!album || album.compartido_por_usuarioid !== usuario_id) {
      return res.status(403).send('No autorizado');
    }
    if (selectedImageIds) {
      const idsArray = Array.isArray(selectedImageIds) ? selectedImageIds : [selectedImageIds];
      for (let imgIdRaw of idsArray) {
        const imgId = parseInt(imgIdRaw, 10);
        const img = await Imagen.findById(imgId);
        if (!img) continue;
        // Verificar que la imagen original pertenece al usuario (usuario_id)
        const origAlbum = await Album.findById(img.album_id);
        if (origAlbum.usuario_id !== usuario_id) continue;
        // Copiar imagen al álbum compartido
        await Imagen.create({
          album_id: albumId,
          url: img.url,
          descripcion: img.descripcion
        });
      }
    }
    // (manejar subida de nuevas imágenes vía URL o archivo:
    res.redirect('/dashboard?tab=tab-share');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar imágenes al álbum compartido');
  }
};