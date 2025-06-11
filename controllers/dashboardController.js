
const Usuario = require('../models/usuarioModel');
const Amistad = require('../models/amistadModel');
const Album = require('../models/albumModel');
const Imagen = require('../models/imagenModel');
const Notificacion = require('../models/notificacionModel');

exports.showDashboard = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    // Datos del usuario
    const user = await Usuario.findById(usuario_id);

    // Amigos aceptados
    const friends = await Amistad.findAmigosDe(usuario_id);
    // Mis álbumes
    const myAlbums = await Album.findAllByUser(usuario_id);
    // Solicitudes pendientes recibidas
    const pendingRequests = await Amistad.findSolicitudesRecibidas(usuario_id);
    // Mis imágenes (para pestaña "Compartir")
    const myImages = await Imagen.findAllByUser(usuario_id);
    // Notificaciones no leídas
    const notifs = await Notificacion.findUnreadByUser(usuario_id);

    res.render('dashboard', {
      user,
      friends,
      myAlbums,
      pendingRequests,
      myImages,
      notifCount: notifs.length,
      notifications: notifs,
      activeTab: 'tab-friends-albums'
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
exports.getFriendAlbums = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const friendId = parseInt(req.params.friendId, 10);
    // Opcional: verificar que friendId esté en tus amigos
    const friends = await Amistad.findAmigosDe(usuario_id);
    const isFriend = friends.some(f => f.usuario_id === friendId);
    if (!isFriend) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    // Obtener álbumes del amigo
    const friendAlbums = await Album.findAllByUser(friendId);
    
    const result = [];
    for (let alb of friendAlbums) {
      // Contar imágenes activas en el álbum
      const imgs = await Imagen.findAllByAlbum(alb.album_id);
      result.push({
        album_id: alb.album_id,
        titulo: alb.titulo,
        imageCount: imgs.length
      });
    }
    res.json({ albums: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener álbumes de amigo' });
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
    // Obtener datos de “yo” para título
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
        // Verificar que la imagen pertenece a mi usuario: buscamos en mi álbum
        
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
exports.searchUsers = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    // Tomar y recortar el término de búsqueda
    let term = req.query.term || '';
    term = term.trim();

    // Cargar datos base para renderizar dashboard
    const user = await Usuario.findById(usuario_id);
    const friends = await Amistad.findAmigosDe(usuario_id);
    const myAlbums = await Album.findAllByUser(usuario_id);
    const pendingRequests = await Amistad.findSolicitudesRecibidas(usuario_id);
    const myImages = await Imagen.findAllByUser(usuario_id);
    const notifs = await Notificacion.findUnreadByUser(usuario_id);

    // Si el término está vacío tras trim, renderizar dashboard en pestaña búsqueda con mensaje
    if (!term) {

      return res.render('dashboard', {
        user,
        friends,
        myAlbums,
        pendingRequests,
        myImages,
        notifCount: notifs.length,
        notifications: notifs,
        searchResults: [],       // sin resultados
        searchTerm: '',          // término vacío
        emptySearch: true,       // indicador de búsqueda vacía
        activeTab: 'tab-search'
      });
    }

    // Búsqueda real: llamar al modelo
    const results = await Usuario.searchByName(term, usuario_id);
    // Obtener solicitudes enviadas si existe ese método
    let sentRequests = [];
    if (typeof Amistad.findSolicitudesEnviadas === 'function') {
      sentRequests = await Amistad.findSolicitudesEnviadas(usuario_id);
    }
    // Mapear estados
    const resultsWithState = results.map(u => {
      const isFriend = friends.some(f => f.usuario_id === u.usuario_id);
      const pendingReceived = pendingRequests.some(p => p.solicitante_id === u.usuario_id);
      const pendingSent = sentRequests.some(p => p.destinatario_id === u.usuario_id);
      return {
        ...u,
        isFriend,
        pendingReceived,
        pendingSent
      };
    });

    // Renderizar con resultados (puede ser vacío array si no coincide nadie)
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


