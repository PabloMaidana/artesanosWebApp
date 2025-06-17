
const db = require('../config/db');

const SharedImage = {

  createMultiple: async (entries) => {
    if (!entries || entries.length === 0) return;

    const values = [];
    const placeholders = entries.map(e => {
      values.push(e.shared_album_id, e.imagen_id);
      return '(?, ?)';
    }).join(', ');
    const sql = `INSERT IGNORE INTO imagen_compartida (shared_album_id, imagen_id) VALUES ${placeholders}`;
    await db.query(sql, values);
  },

  findBySharedAlbum: async (shared_album_id) => {
    const [rows] = await db.query(
      `SELECT i.imagen_id, i.album_id AS original_album_id, i.url, i.descripcion, i.public_id
         FROM imagen_compartida ic
         JOIN imagen i ON ic.imagen_id = i.imagen_id
        WHERE ic.shared_album_id = ?`,
      [shared_album_id]
    );
    return rows; // array de objetos con propiedades de imagen original
  },

  /**
   * Verificar si ya existe la asociación (opcional)
   */
  exists: async (shared_album_id, imagen_id) => {
    const [rows] = await db.query(
      `SELECT 1 FROM imagen_compartida WHERE shared_album_id = ? AND imagen_id = ?`,
      [shared_album_id, imagen_id]
    );
    return rows.length > 0;
  },


  delete: async (shared_album_id, imagen_id) => {
    await db.query(
      `DELETE FROM imagen_compartida WHERE shared_album_id = ? AND imagen_id = ?`,
      [shared_album_id, imagen_id]
    );
  }
};

module.exports = SharedImage;
