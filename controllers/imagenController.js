const Imagen = require('../models/imagenModel');
const Comentario = require('../models/comentarioModel');
const ImagenTag = require('../models/imagenTagModel');
const Notificacion = require('../models/notificacionModel');
const Album = require('../models/albumModel');
const Tag = require('../models/tagModel');
const SharedImage = require('../models/imagenCompartidaModel');
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
    // Verificar permiso de visualización:
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
      return res.status(403).send('No autorizado para ver este álbum');
    }

    let images = [];
    if (album.compartido_por_usuarioid != null) {
      // Álbum compartido: obtener imágenes desde SharedImage
      images = await SharedImage.findBySharedAlbum(album_id);
    } else {
      // Álbum propio: imágenes originales
      images = await Imagen.findAllByAlbum(album_id);
    }

    // Obtener comentarios como antes, etc.
    for (let img of images) {
      const comentarios = await require('../models/comentarioModel').findByImageWithUser(img.imagen_id);
      img.comentarios = comentarios;
    }

    // Determinar canUpload: solo si es álbum propio (propietario) o álbum compartido donde el usuario es aceptador:
    let canUpload = false;
    if (album.compartido_por_usuarioid == null) {
      if (album.usuario_id === usuario_id) canUpload = true;
    } else {
      if (album.compartido_por_usuarioid === usuario_id) canUpload = true;
    }
    const canComment = allowedToView;

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
    const sharedAlbumId = parseInt(req.params.sharedAlbumId, 10);
    if (isNaN(sharedAlbumId)) {
      return res.status(400).send('ID de álbum compartido inválido');
    }
    // Verificar que el álbum compartido existe y pertenece al usuario como aceptador:
    const albumCompartido = await Album.findById(sharedAlbumId);
    if (!albumCompartido) {
      return res.status(404).send('Álbum compartido no encontrado');
    }
    if (albumCompartido.compartido_por_usuarioid !== usuario_id) {
      return res.status(403).send('No autorizado para compartir en este álbum');
    }

    // Obtener solo mis álbumes propios (compartido_por_usuarioid == null)
    const todosAlbumes = await Album.findAllByUser(usuario_id);
    const albumesPropios = todosAlbumes.filter(a => a.compartido_por_usuarioid == null);

    // Renderizar vista: lista de mis álbumes con enlace a ver imágenes
    res.render('imagen/add-to-shared-albums', {
      sharedAlbum: { album_id: sharedAlbumId, titulo: albumCompartido.titulo },
      albumesPropios
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al mostrar álbumes propios para compartir');
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
    // Imagen original:
    const imagen_id = parseInt(req.params.imagenId, 10);
    if (isNaN(imagen_id)) {
      return res.status(400).send('ID de imagen inválido');
    }
    // Álbum desde el cual se comentaba:
    const albumIdContext = parseInt(req.body.album_id, 10);
    if (isNaN(albumIdContext)) {
      // Si no se envía álbum, no podemos verificar permiso correctamente
      return res.status(400).send('Falta información de álbum');
    }
    const texto = req.body.texto;
    if (!texto || texto.trim() === '') {
      // Redirigir de vuelta al listado del álbum compartido/propio:
      return res.redirect(`/imagen/list/${albumIdContext}`);
    }

    // Verificar que la imagen existe
    const img = await Imagen.findById(imagen_id);
    if (!img) {
      return res.status(404).send('Imagen no encontrada');
    }

    // Verificar que el álbum de contexto existe y que el usuario puede verlo/comentar
    const album = await Album.findById(albumIdContext);
    if (!album) {
      return res.status(404).send('Álbum no válido');
    }
    // Verificar permiso de vista/comentario en el álbum de contexto:
    let allowedToView = false;
    if (album.usuario_id === usuario_id) {
      // Álbum propio
      allowedToView = true;
    } else if (
      album.compartido_por_usuarioid != null &&
      album.compartido_por_usuarioid === usuario_id
    ) {
      // Álbum compartido creado para este usuario
      allowedToView = true;
    } else {
      allowedToView = false;
    }
    if (!allowedToView) {
      return res.status(403).send('No autorizado para comentar esta imagen');
    }

    // Ahora crear comentario apuntando a la imagen original
    await Comentario.create({
      usuario_id,
      imagen_id,
      texto: texto.trim()
    });

    // (Opcional) notificar al autor de la imagen original

    // Redirigir de vuelta al listado de ese álbum de contexto
    return res.redirect(`/imagen/list/${albumIdContext}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al comentar la imagen');
  }
};

exports.showImagesFromOwnAlbumForSharing = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const sharedAlbumId = parseInt(req.params.sharedAlbumId, 10);
    const sourceAlbumId = parseInt(req.params.sourceAlbumId, 10);
    if (isNaN(sharedAlbumId) || isNaN(sourceAlbumId)) {
      return res.status(400).send('IDs inválidos');
    }
    // Verificar álbum compartido pertenece al usuario:
    const albumCompartido = await Album.findById(sharedAlbumId);
    if (!albumCompartido || albumCompartido.compartido_por_usuarioid !== usuario_id) {
      return res.status(403).send('No autorizado para compartir en este álbum');
    }
    // Verificar que sourceAlbum pertenece al usuario y es propio:
    const sourceAlbum = await Album.findById(sourceAlbumId);
    if (!sourceAlbum || sourceAlbum.usuario_id !== usuario_id || sourceAlbum.compartido_por_usuarioid != null) {
      return res.status(403).send('No autorizado para seleccionar imágenes de este álbum');
    }

    // Obtener todas las imágenes de sourceAlbum
    const images = await Imagen.findAllByAlbum(sourceAlbumId);

    // Obtener imágenes ya compartidas previamente en este sharedAlbumId, para marcar checkbox
    const sharedImgs = await SharedImage.findBySharedAlbum(sharedAlbumId);
    const sharedIdsSet = new Set(sharedImgs.map(i => i.imagen_id));

    // Renderizar vista: lista de imágenes con checkbox, indicando las ya compartidas
    res.render('imagen/select-images-to-share', {
      sharedAlbum: { album_id: sharedAlbumId, titulo: albumCompartido.titulo },
      sourceAlbum: { album_id: sourceAlbumId, titulo: sourceAlbum.titulo },
      images,            // array de { imagen_id, url, descripcion, ... }
      sharedIdsSet       // Set para saber cuáles checkear
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al mostrar imágenes para compartir');
  }
};

exports.postShareImagesToSharedAlbum = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const sharedAlbumId = parseInt(req.params.sharedAlbumId, 10);
    const sourceAlbumId = parseInt(req.body.sourceAlbumId, 10);
    let selectedImageIds = req.body.imageIds; // puede ser string o array
    if (isNaN(sharedAlbumId) || isNaN(sourceAlbumId)) {
      return res.status(400).send('IDs inválidos');
    }
    // Verificar álbum compartido:
    const albumCompartido = await Album.findById(sharedAlbumId);
    if (!albumCompartido || albumCompartido.compartido_por_usuarioid !== usuario_id) {
      return res.status(403).send('No autorizado para compartir en este álbum');
    }
    // Verificar álbum origen:
    const sourceAlbum = await Album.findById(sourceAlbumId);
    if (!sourceAlbum || sourceAlbum.usuario_id !== usuario_id || sourceAlbum.compartido_por_usuarioid != null) {
      return res.status(403).send('No autorizado para compartir desde este álbum');
    }

    // Normalizar selectedImageIds en array de ints
    let idsArray = [];
    if (selectedImageIds) {
      if (Array.isArray(selectedImageIds)) {
        idsArray = selectedImageIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      } else {
        const id = parseInt(selectedImageIds, 10);
        if (!isNaN(id)) idsArray = [id];
      }
    }
    if (idsArray.length === 0) {
      // Ninguna seleccionada: redirigir de vuelta sin hacer nada
      return res.redirect(`/imagen/add-to-shared/${sharedAlbumId}/from/${sourceAlbumId}`);
    }

    // Preparar entradas para SharedImage.createMultiple
    const entries = idsArray.map(imagen_id => ({
      shared_album_id: sharedAlbumId,
      imagen_id
    }));
    // Insertar ignorando duplicados
    await SharedImage.createMultiple(entries);

    // Después de compartir, redirigir a la lista de álbumes propios para compartir, o permanecer en mismo sourceAlbum
    // Según UX, podrías:
    // - Volver a listado de álbumes propios: /imagen/add-to-shared/:sharedAlbumId
    // - O quedar en la misma sourceAlbum para permitir seguir compartiendo de ahí
    // Usaremos volver a lista de álbumes propios:
    return res.redirect(`/imagen/add-to-shared/${sharedAlbumId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al compartir imágenes');
  }
};