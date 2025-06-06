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

    res.redirect('/amistad/solicitudes');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al enviar solicitud de amistad');
  }
};

exports.listReceived = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const solicitudes = await Amistad.findSolicitudesRecibidas(usuario_id);
    res.render('amistad/solicitudes', { solicitudes });
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

      // Crear álbum en perfil del solicitante
      const album_id = await Album.create({ usuario_id: solicitante_id, titulo: nuevoTitulo });

      // Copiar imágenes del usuario que aceptó
      const imagenesUsuarioAcepta = await Imagen.findAllByUser(destinatario_id);
      for (let img of imagenesUsuarioAcepta) {
        const newImgId = await Imagen.create({
          album_id,
          url: img.url,
          descripcion: img.descripcion
        });
        // Copiar tags de la imagen original
        const tags = await ImagenTag.findByImage(img.imagen_id);
        for (let t of tags) {
          await ImagenTag.create({ imagen_id: newImgId, tag_id: t.tag_id });
        }
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