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
    const imagen_id = await Imagen.create({ album_id, url, descripcion });

    // relacionar tags (si llegaron varios tag_ids)
    if (Array.isArray(tag_ids)) {
      for (let tag_id of tag_ids) {
        await ImagenTag.create({ imagen_id, tag_id });
      }
    } else if (tag_ids) {
      // Si sólo hay uno, viene como string
      await ImagenTag.create({ imagen_id, tag_id: tag_ids });
    }

    res.redirect(`/imagen/detail/${imagen_id}`);
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