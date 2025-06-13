const Amistad = require('../models/amistadModel');
const Notificacion = require('../models/notificacionModel');
const Album = require('../models/albumModel');
const Imagen = require('../models/imagenModel');
const ImagenTag = require('../models/imagenTagModel');
const Usuario = require('../models/usuarioModel');

exports.sendRequest = async (req, res) => {
  try {
    const solicitante_id = req.session.usuario_id;
    const destinatario_id = parseInt(req.body.destinatario_id, 10);

    // Obtener término de búsqueda enviado en el form
    const term = (req.body.term || '').trim();

    // 1) Insertar la solicitud
    await Amistad.create({ solicitante_id, destinatario_id });

    // 2) Notificar al destinatario
    await Notificacion.create({
      usuario_id: destinatario_id,
      tipo: 'solicitud_amistad',
      mensaje: `Nueva solicitud de amistad de ${req.session.usuario_nombre}`
    });

    // 3) Emitir evento en tiempo real
    req.io.to(`user_${destinatario_id}`).emit('nueva_solicitud', {
      solicitante_id,
      mensaje: `Tienes una nueva solicitud de ${req.session.usuario_nombre}`
    });

    // 4) Redirigir a la ruta de búsqueda con el mismo término para mantener la pestaña activa y resultados
    if (term) {
      // Redirige a la ruta GET de búsqueda
      return res.redirect(`/dashboard/search?term=${encodeURIComponent(term)}`);
    } else {
      
      return res.redirect('/dashboard?tab=tab-search');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al enviar solicitud de amistad');
  }
};

exports.listReceived = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const solicitudes = await Amistad.findSolicitudesRecibidas(usuario_id);
    res.render('/dashboard?tab=tab-search', { solicitudes });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al listar solicitudes de amistad');
  }
};

exports.respondRequest = async (req, res) => {
  try {
    const destinatario_id = req.session.usuario_id;
    const solicitante_id = parseInt(req.body.solicitante_id, 10);
    const respuesta = req.body.respuesta; // 'aceptado' o 'rechazado'

    // 1) Actualizar estado en la tabla amistad
    await Amistad.updateEstado({ solicitante_id, destinatario_id, estado: respuesta });

    // 2) Si se aceptó, crear álbum automático y copiar imágenes
    if (respuesta === 'aceptado') {
      const userAcepta = await Usuario.findById(destinatario_id);
      const nuevoTitulo = `${userAcepta.nombre} ${userAcepta.apellido}`;
      // Solo creamos álbum en solicitante:
      if (typeof Album.createSharedAlbum === 'function') {
        await Album.createSharedAlbum({
          solicitanteId: solicitante_id,
          aceptador: userAcepta
        });
      } else {
      }
    }

    // 3) Crear notificación para el solicitante
    await Notificacion.create({
      usuario_id: solicitante_id,
      tipo: respuesta === 'aceptado' ? 'amistad_aceptada' : 'amistad_rechazada',
      mensaje: respuesta === 'aceptado'
        ? `${req.session.usuario_nombre} aceptó tu solicitud de amistad.`
        : `${req.session.usuario_nombre} rechazó tu solicitud de amistad.`
    });

    // 4) Emitir evento en tiempo real al solicitante
    req.io.to(`user_${solicitante_id}`).emit('respuesta_solicitud', {
      respuesta,
      destinatario_id
    });

    res.redirect('/amistad/solicitudes');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al responder solicitud de amistad');
  }
};