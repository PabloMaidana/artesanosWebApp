const Album = require('../models/albumModel');

exports.listByUser = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    // Obtener todos los álbumes donde usuario_id = usuario_id
    const todosAlbumes = await Album.findAllByUser(usuario_id);
    // Separar
    const albumesPropios = todosAlbumes.filter(a => a.compartido_por_usuarioid == null);
    const albumesCompartidos = todosAlbumes.filter(a => a.compartido_por_usuarioid != null);

    
    // mapea albumesCompartidos para agregar esos datos
    const albumesCompartidosConInfo = [];
    for (let alb of albumesCompartidos) {
      // alb tiene { album_id, titulo, compartido_por_usuarioid }
      const usuarioQueComparte = await Usuario.findById(alb.compartido_por_usuarioid);
      albumesCompartidosConInfo.push({
        album_id: alb.album_id,
        titulo: alb.titulo,
        compartido_por_usuarioid: alb.compartido_por_usuarioid,
        compartido_por_nombre: usuarioQueComparte ? usuarioQueComparte.nombre : '',
        compartido_por_apellido: usuarioQueComparte ? usuarioQueComparte.apellido : ''
      });
    }

    res.render('album/list', {
      albumesPropios,
      albumesCompartidos: albumesCompartidosConInfo
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al listar álbumes');
  }
};

exports.showCreate = (req, res) => {
  res.render('album/create');
};

exports.create = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const { titulo } = req.body;
    await Album.create({ usuario_id, titulo });
    res.redirect('/album/list');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear álbum');
  }
};

exports.delete = async (req, res) => {
  try {
    const album_id = req.params.id;
    await Album.delete(album_id);
    res.redirect('/album/list');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar álbum');
  }
};