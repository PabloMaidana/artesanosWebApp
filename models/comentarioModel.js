
const db = require('../config/db');

const Comentario = {
  // Listar comentarios activos de una imagen (con nombre y apellido del autor)
  findByImage: async (imagen_id) => {
    const [rows] = await db.query(
      `SELECT c.comentario_id, c.usuario_id, u.nombre, u.apellido, c.texto, c.fecha
         FROM comentario c
         JOIN usuario u ON c.usuario_id = u.usuario_id
        WHERE c.imagen_id = ?
          AND c.estado = 1
        ORDER BY c.fecha DESC`,
      [imagen_id]
    );
    return rows;
  },

  // Crear un nuevo comentario
  create: async ({ usuario_id, imagen_id, texto }) => {
    const [result] = await db.query(
      `INSERT INTO comentario (usuario_id, imagen_id, texto, fecha, estado)
       VALUES (?, ?, ?, NOW(), 1)`,
      [usuario_id, imagen_id, texto]
    );
    return result.insertId;
  },

  // “Eliminar” un comentario (marcar estado = 0)
  delete: async (comentario_id) => {
    await db.query(
      `UPDATE comentario
          SET estado = 0
        WHERE comentario_id = ?`,
      [comentario_id]
    );
  }
};

module.exports = Comentario;
