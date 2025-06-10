
const Usuario = require('../models/usuarioModel');
const Amistad = require('../models/amistadModel');
const Publicacion = require('../models/publicacionModel'); // asume que existe
const Notificacion = require('../models/notificacionModel');

exports.showDashboard = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const user = await Usuario.findById(usuario_id);
    // Amigos
    const friends = await Amistad.findAmigosDe(usuario_id);
    // IDs de amigos
    const friendIds = friends.map(f => f.usuario_id);
    // Publicaciones de amigos (ejemplo simple)
    const posts = await Publicacion.findByUsers(friendIds);
    // Notificaciones no leídas
    const notifs = await Notificacion.findUnreadByUser(usuario_id);
    res.render('dashboard', {
      user,
      friends,
      posts,
      notifications: notifs,
      notifCount: notifs.length
    });
  } catch(err) {
    console.error(err);
    res.status(500).send('Error al cargar dashboard');
  }
};
