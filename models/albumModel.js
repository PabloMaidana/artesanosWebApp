
const db = require('../config/db');

const Album = {
  // Listar todos los álbumes activos de un usuario
  findAllByUser: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT * 
         FROM album 
        WHERE usuario_id = ? 
          AND estado = 1`,
      [usuario_id]
    );
    return rows;
  },

  // Crear un nuevo álbum
  create: async ({ usuario_id, titulo }) => {
    const [result] = await db.query(
      `INSERT INTO album (usuario_id, titulo, estado)
       VALUES (?, ?, 1)`,
      [usuario_id, titulo]
    );
    return result.insertId;
  },

  // “Eliminar” un álbum (marcar estado = 0)
  delete: async (album_id) => {
    await db.query(
      `UPDATE album 
          SET estado = 0 
        WHERE album_id = ?`,
      [album_id]
    );
  }
};

module.exports = Album;
