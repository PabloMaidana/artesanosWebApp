
const Tag = require('../models/tagModel');

exports.list = async (req, res) => {
  try {
    const tags = await Tag.findAll();
    res.render('tag/list', { tags });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al listar tags');
  }
};

exports.create = async (req, res) => {
  try {
    const { nombre } = req.body;
    await Tag.create(nombre);
    res.redirect('/tag/list');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear tag');
  }
};
