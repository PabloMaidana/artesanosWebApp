
const db = require('../config/db');

const Notificacion = {
  // Crear una nueva notificación
  create: async ({ usuario_id, tipo, mensaje }) => {
    const [result] = await db.query(
      `INSERT INTO notificacion (usuario_id, tipo, mensaje, fecha, leido)
       VALUES (?, ?, ?, NOW(), 0)`,
      [usuario_id, tipo, mensaje]
    );
    return result.insertId;
  },

  // Traer notificaciones no leídas de un usuario (para contar y listar)
  findUnreadByUser: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT *
         FROM notificacion
        WHERE usuario_id = ?
          AND leido = 0
        ORDER BY fecha DESC`,
      [usuario_id]
    );
    return rows;
  },

  // Marcar una notificación como leída
  markAsRead: async (notificacion_id) => {
    await db.query(
      `UPDATE notificacion
          SET leido = 1
        WHERE notificacion_id = ?`,
      [notificacion_id]
    );
  }
};

module.exports = Notificacion;
