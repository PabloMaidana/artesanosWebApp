const Album = require('../models/albumModel');

exports.listByUser = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const albumes = await Album.findAllByUser(usuario_id);
    res.render('album/list', { albumes });
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