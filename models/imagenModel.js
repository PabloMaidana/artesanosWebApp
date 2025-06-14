
const db = require('../config/db');

const Imagen = {
  // Listar todas las imágenes activas de un álbum
  findAllByAlbum: async (album_id) => {
    const [rows] = await db.query(
      `SELECT * 
         FROM imagen 
        WHERE album_id = ? 
          AND estado = 1`,
      [album_id]
    );
    return rows;
  },

  // Listar todas las imágenes activas de un usuario (útil para copiar al aceptar amistad)
  findAllByUser: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT i.*
         FROM imagen i
         JOIN album a ON i.album_id = a.album_id
        WHERE a.usuario_id = ?
          AND i.estado = 1
          AND a.estado = 1`,
      [usuario_id]
    );
    return rows;
  },

  // Crear (subir) una imagen
 create: async ({ album_id, url, descripcion, public_id }) => {
  const [result] = await db.query(
    `INSERT INTO imagen (album_id, url, descripcion, public_id, estado, fecha) VALUES (?, ?, ?, ?, 1, NOW())`,
    [album_id, url, descripcion, public_id]
  );
  return result.insertId;
},

  // Obtener una imagen por su ID
  findById: async (imagen_id) => {
    const [rows] = await db.query(
      `SELECT * 
         FROM imagen 
        WHERE imagen_id = ? 
          AND estado = 1`,
      [imagen_id]
    );
    return rows[0];
  },

  // “Eliminar” una imagen (marcar estado = 0)
  delete: async (imagen_id) => {
    await db.query(
      `UPDATE imagen 
          SET estado = 0 
        WHERE imagen_id = ?`,
      [imagen_id]
    );
  }
};

module.exports = Imagen;
