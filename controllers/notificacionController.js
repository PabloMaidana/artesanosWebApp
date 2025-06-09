const Notificacion = require('../models/notificacionModel');

exports.unreadCount = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const notifs = await Notificacion.findUnreadByUser(usuario_id);
    res.json({ count: notifs.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ count: 0 });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { notificacion_id } = req.body;
    await Notificacion.markAsRead(notificacion_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

exports.listAll = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const notifs = await Notificacion.findUnreadByUser(usuario_id);
    res.render('notificacion/dropdown', { notifs });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar notificaciones');
  }
};
