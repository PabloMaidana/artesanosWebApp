
const db = require('../config/db');

const Album = {
  // Listar todos los álbumes activos de un usuario
  findAllByUser: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT album_id, titulo, compartido_por_usuarioid
         FROM album
        WHERE usuario_id = ? `,
      [usuario_id]
    );
    return rows; // cada fila: { album_id, titulo, compartido_por_usuarioid }
  },

  findById: async (album_id) => {
    const [rows] = await db.query(
      `SELECT album_id, usuario_id, titulo, compartido_por_usuarioid
         FROM album
        WHERE album_id = ?`,
      [album_id]
    );
    return rows[0];
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

  createSharedAlbum: async ({ solicitanteId, aceptador }) => {
    const titulo = `${aceptador.nombre} ${aceptador.apellido}`;
    const [result] = await db.query(
      `INSERT INTO album (usuario_id, titulo, compartido_por_usuarioid) VALUES (?, ?, ?)`,
      [solicitanteId, titulo, aceptador.usuario_id]
    );
    return result.insertId;
  },

  findSharedAlbumsByAceptor: async (aceptadorId) => {
    // Devuelve álbumes donde compartido_por_usuarioid = aceptadorId
    const [rows] = await db.query(
      `SELECT album_id, usuario_id AS solicitante_id, titulo
         FROM album
        WHERE compartido_por_usuarioid = ?`,
      [aceptadorId]
    );
    return rows; // array de { album_id, solicitante_id, titulo }
  },

  findSharedAlbumsToUser: async (usuarioId, compartidoPorId) => {
    const [rows] = await db.query(
      `SELECT album_id, titulo, compartido_por_usuarioid
         FROM album
        WHERE usuario_id = ? AND compartido_por_usuarioid = ?`,
      [usuarioId, compartidoPorId]
    );
    return rows;
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
