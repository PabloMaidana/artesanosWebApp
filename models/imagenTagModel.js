
const db = require('../config/db');

const ImagenTag = {
  // Insertar relación imagen–tag
  create: async ({ imagen_id, tag_id }) => {
    await db.query(
      `INSERT INTO imagen_tag (imagen_id, tag_id)
       VALUES (?, ?)`,
      [imagen_id, tag_id]
    );
  },

  // Listar tags asociados a una imagen
  findByImage: async (imagen_id) => {
    const [rows] = await db.query(
      `SELECT t.tag_id, t.nombre
         FROM tag t
         JOIN imagen_tag it ON t.tag_id = it.tag_id
        WHERE it.imagen_id = ?`,
      [imagen_id]
    );
    return rows;
  }
};

module.exports = ImagenTag;
