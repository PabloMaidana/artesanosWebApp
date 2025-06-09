
const Comentario = require('../models/comentarioModel');
const Notificacion = require('../models/notificacionModel');
const Imagen = require('../models/imagenModel');

exports.create = async (req, res) => {
  try {
    const { imagen_id, texto } = req.body;
    const usuario_id = req.session.usuario_id;

    // Insertar comentario
    const comentario_id = await Comentario.create({ usuario_id, imagen_id, texto });

    // Notificar al autor de la imagen
    const imagen = await Imagen.findById(imagen_id);

    const autor = imagen.usuario_id; 
    const snippet = texto.length > 20 ? texto.substr(0, 20) + '...' : texto;

    await Notificacion.create({
      usuario_id: autor,
      tipo: 'comentario',
      mensaje: `Nuevo comentario de ${req.session.usuario_nombre}: "${snippet}"`
    });

    // Evento real-time al autor
    req.io.to(`user_${autor}`).emit('nuevo_comentario', {
      imagen_id,
      comentario_id,
      snippet,
      usuario_nombre: req.session.usuario_nombre
    });

    res.redirect(`/imagen/detail/${imagen_id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear comentario');
  }
};
