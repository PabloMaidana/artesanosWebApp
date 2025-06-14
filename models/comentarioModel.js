
const db = require('../config/db');

const Comentario = {
  /**
   * Obtener comentarios de una imagen, uniendo datos de usuario para mostrar nombre/apellido.
   * Retorna array de objetos: { comentario_id, usuario_id, texto, fecha, nombre, apellido }.
   * Solo comentarios con estado = 1.
   */
  findByImageWithUser: async (imagen_id) => {
    const [rows] = await db.query(
      `SELECT c.comentario_id, c.usuario_id, c.texto, c.fecha, u.nombre, u.apellido
         FROM comentario c
         JOIN usuario u ON c.usuario_id = u.usuario_id
        WHERE c.imagen_id = ? AND c.estado = 1
        ORDER BY c.fecha ASC`,
      [imagen_id]
    );
    return rows;
  },

  /**
   * Crear un comentario nuevo.
   * Parámetros: objeto con usuario_id, imagen_id, texto.
   * Asigna fecha actual y estado = 1.
   * Retorna el insertId.
   */
  create: async ({ usuario_id, imagen_id, texto }) => {
    const fecha = new Date();
    const [result] = await db.query(
      `INSERT INTO comentario (usuario_id, imagen_id, texto, fecha, estado)
         VALUES (?, ?, ?, ?, 1)`,
      [usuario_id, imagen_id, texto, fecha]
    );
    return result.insertId;
  },

};

module.exports = Comentario;
