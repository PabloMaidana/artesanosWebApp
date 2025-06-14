
const Usuario = require('../models/usuarioModel');
const Amistad = require('../models/amistadModel');
const Album = require('../models/albumModel');
const Imagen = require('../models/imagenModel');
const Notificacion = require('../models/notificacionModel');

exports.showDashboard = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const user = await Usuario.findById(usuario_id);

    // Datos base
    const friends = await Amistad.findAmigosQueMeComparten(usuario_id);
    const myAlbums = await Album.findAllByUser(usuario_id);
    const pendingRequests = await Amistad.findSolicitudesRecibidas(usuario_id);
    const myImages = await require('../models/imagenModel').findAllByUser(usuario_id);
    const notifs = await Notificacion.findUnreadByUser(usuario_id);

    // Álbumes compartidos creados por este usuario al aceptar solicitudes previas
    const sharedAlbumsForAceptorRaw = await Album.findSharedAlbumsByAceptor(usuario_id);
    const sharedAlbumsForAceptor = [];
    for (let alb of sharedAlbumsForAceptorRaw) {
      const solicitante = await Usuario.findById(alb.solicitante_id);
      sharedAlbumsForAceptor.push({
        album_id: alb.album_id,
        titulo: alb.titulo,
        solicitante_id: alb.solicitante_id,
        solicitante_nombre: solicitante.nombre,
        solicitante_apellido: solicitante.apellido
      });
    }
    
    // Cada elemento: { album_id, solicitante_id, titulo }

    // Renderizar dashboard, pasando sharedAlbumsForAceptor y pendingRequests
    const activeTab = req.query.tab || 'tab-friends-albums';
    res.render('dashboard', {
      user,
      friends,
      myAlbums,
      pendingRequests,
      myImages,
      notifCount: notifs.length,
      notifications: notifs,
      sharedAlbumsForAceptor,
      activeTab
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar el dashboard');
  }
};

/**
  Endpoint para obtener álbumes de un amigo vía AJAX.
  Devuelve JSON con los álbumes de friendId.
 */
exports.getSharedContentFromFriend = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const friendId = parseInt(req.params.friendId, 10);
    if (isNaN(friendId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Verificar que friendId realmente me comparte (es decir: existe relación aceptada A→B)
    // Para el solicitante A: hay una fila en amistad con solicitante_id = A y destinatario_id = friendId y estado = 'aceptado'.
    const amigosQueMeComparten = await Amistad.findAmigosQueMeComparten(usuario_id);
    const compartidoresIds = amigosQueMeComparten.map(f => f.usuario_id);
    if (!compartidoresIds.includes(friendId)) {
      return res.status(403).json({ error: 'No autorizado: no existe compartición de ese usuario hacia ti' });
    }

    // Buscar el/los álbum(es) creados para mí por friendId
    const sharedAlbums = await Album.findSharedAlbumsToUser(usuario_id, friendId);
    if (sharedAlbums.length === 0) {
      return res.json({ albums: [] });
    }

    // Para cada álbum compartido, obtener sus imágenes
    const result = [];
    for (let alb of sharedAlbums) {
      // alb: { album_id, titulo, compartido_por_usuarioid }
      const images = await Imagen.findAllByAlbum(alb.album_id);

      result.push({
        album_id: alb.album_id,
        titulo: alb.titulo,
        images: images.map(img => ({
          imagen_id: img.imagen_id,
          url: img.url,
          descripcion: img.descripcion
        }))
      });
    }

    return res.json({ albums: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener contenido compartido' });
  }
};

/**
  Endpoint para compartir imágenes con quien envió solicitud.
  Recibe en el body: { solicitante_id, imageIds: [..] }
  Crea un álbum en el perfil del solicitante con las imágenes seleccionadas.
 */
exports.shareImagesWithRequester = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id; // actual
    const { solicitante_id, imageIds } = req.body;
    const solId = parseInt(solicitante_id, 10);

    // Verificar que exista una solicitud pendiente de ese solicitante a mí
    const pending = await Amistad.findSolicitudesRecibidas(usuario_id);
    const match = pending.some(p => p.solicitante_id === solId);
    if (!match) {
      return res.status(403).send('No hay solicitud pendiente de este usuario');
    }
    // Obtener datos de usuario para título
    const me = await Usuario.findById(usuario_id);
    const tituloAlbum = `${me.nombre} ${me.apellido}`;
    // Crear álbum en perfil del solicitante
    const newAlbumId = await Album.create({ usuario_id: solId, titulo: tituloAlbum });
    // Copiar cada imagen seleccionada al álbum nuevo
    if (Array.isArray(imageIds)) {
      for (let imgIdRaw of imageIds) {
        const imgId = parseInt(imgIdRaw, 10);
        // Asegurar que la imagen pertenece a mí
        const img = await Imagen.findById(imgId);
        if (!img) continue;
        // Verificar que la imagen pertenece a mi usuario
        const albumOfImg = img.album_id;
        // Obtenemos todos mis álbumes:
        const myAlbums = await Album.findAllByUser(usuario_id);
        const owns = myAlbums.some(a => a.album_id === albumOfImg);
        if (!owns) continue;
        // Crear la copia en el álbum del solicitante
        const newImgId = await Imagen.create({
          album_id: newAlbumId,
          url: img.url,
          descripcion: img.descripcion
        });
        // Copiar tags
        const ImagenTag = require('../models/imagenTagModel');
        const tags = await ImagenTag.findByImage(imgId);
        for (let t of tags) {
          await ImagenTag.create({ imagen_id: newImgId, tag_id: t.tag_id });
        }
      }
    }
    // await Amistad.updateEstado({ solicitante_id: solId, destinatario_id: usuario_id, estado: 'aceptado' });
    // Crear notificación para el solicitante
    await Notificacion.create({
      usuario_id: solId,
      tipo: 'compartir_imagenes',
      mensaje: `${me.nombre} compartió imágenes contigo.`
    });
    // Emitir evento real-time
    req.io.to(`user_${solId}`).emit('imagenes_compartidas', {
      from: usuario_id,
      mensaje: `${me.nombre} te compartió imágenes.`
    });
    res.redirect('/dashboard'); // o enviar JSON de éxito si es AJAX
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al compartir imágenes');
  }
};

// controllers/dashboardController.js (añadir o modificar)
// controllers/dashboardController.js
exports.searchUsers = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    let term = (req.query.term || '').trim();

    // Obtener datos del dashboard: user, friends, myAlbums, pendingRequests, etc.
    const user = await Usuario.findById(usuario_id);
    const friends = await Amistad.findAmigosQueMeComparten(usuario_id);
    const myAlbums = await Album.findAllByUser(usuario_id);
    const pendingRequests = await Amistad.findSolicitudesRecibidas(usuario_id);
    const myImages = await Imagen.findAllByUser(usuario_id);
    const notifs = await Notificacion.findUnreadByUser(usuario_id);

    if (!term) {
      // Si query string vino vacío, renderizar dashboard con tab-search y mensaje de término vacío
      return res.render('dashboard', {
        user,
        friends,
        myAlbums,
        pendingRequests,
        myImages,
        notifCount: notifs.length,
        notifications: notifs,
        searchResults: [],
        searchTerm: '',
        emptySearch: true,
        activeTab: 'tab-search'
      });
    }

    // Realizar búsqueda con term
    const results = await Usuario.searchByNameFlexible(term, usuario_id);
    // Mapear estados de amistad, etc.
    let sentRequests = [];
    if (typeof Amistad.findSolicitudesEnviadas === 'function') {
      sentRequests = await Amistad.findSolicitudesEnviadas(usuario_id);
    }
    const resultsWithState = results.map(u => {
      const isFriend = friends.some(f => f.usuario_id === u.usuario_id);
      const pendingReceived = pendingRequests.some(p => p.solicitante_id === u.usuario_id);
      const pendingSent = sentRequests.some(p => p.destinatario_id === u.usuario_id);
      return { ...u, isFriend, pendingReceived, pendingSent };
    });

    // Renderizar con resultados y pestaña activa
    res.render('dashboard', {
      user,
      friends,
      myAlbums,
      pendingRequests,
      myImages,
      notifCount: notifs.length,
      notifications: notifs,
      searchResults: resultsWithState,
      searchTerm: term,
      emptySearch: false,
      activeTab: 'tab-search'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en búsqueda');
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const destinatarioId = req.session.usuario_id; // quien acepta
    const solicitanteId = parseInt(req.body.solicitante_id, 10);

    // 1. Aceptar la solicitud en la tabla amistad
    await Amistad.aceptarSolicitud(solicitanteId, destinatarioId);

    // 2. Crear álbum compartido vacío para el solicitante
    const usuarioAceptador = await Usuario.findById(destinatarioId);
    const albumId = await Album.createSharedAlbum({
      solicitanteId,
      aceptador: usuarioAceptador
    });

    // 3. Notificar al solicitante que hay un álbum para compartir
    if (Notificacion && typeof Notificacion.create === 'function') {
      await Notificacion.create({
        usuario_id: solicitanteId,
        tipo: 'amistad_aceptada',
        mensaje: `${usuarioAceptador.nombre} ha aceptado tu solicitud y se ha creado un álbum para compartir contenido.`
      });
      // Emitir evento real-time si usas socket.io:
      if (req.io) {
        req.io.to(`user_${solicitanteId}`).emit('amistad_aceptada', {
          mensaje: `Se ha creado un álbum para compartir contenido desde ${usuarioAceptador.nombre}.`
        });
      }
    }

    // 4. Redirigir de nuevo al dashboard (pestaña compartir)
    res.redirect('/dashboard?tab=tab-share');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al aceptar solicitud');
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const destinatarioId = req.session.usuario_id;
    const solicitanteId = parseInt(req.body.solicitante_id, 10);

    await Amistad.rechazarSolicitud(solicitanteId, destinatarioId);

    // Notificar al solicitante que fue rechazada
    if (Notificacion && typeof Notificacion.create === 'function') {
      await Notificacion.create({
        usuario_id: solicitanteId,
        tipo: 'amistad_rechazada',
        mensaje: `${req.session.usuario_nombre} ha rechazado tu solicitud de amistad.`
      });
      if (req.io) {
        req.io.to(`user_${solicitanteId}`).emit('amistad_rechazada', {
          mensaje: `${req.session.usuario_nombre} rechazó tu solicitud.`
        });
      }
    }

    res.redirect('/dashboard?tab=tab-share');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al rechazar solicitud');
  }
};


