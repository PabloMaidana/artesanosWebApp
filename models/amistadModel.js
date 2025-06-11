
const db = require('../config/db');

const Amistad = {
  // Crear nueva solicitud de amistad (estado = 'pendiente')
  create: async ({ solicitante_id, destinatario_id }) => {
    await db.query(
      `INSERT INTO amistad (solicitante_id, destinatario_id, estado, fecha)
       VALUES (?, ?, 'pendiente', NOW())`,
      [solicitante_id, destinatario_id]
    );
  },

  // Aceptar solicitud: cambiar estado a 'aceptado'
  aceptarSolicitud: async (solicitanteId, destinatarioId) => {
    await db.query(
      `UPDATE amistad
         SET estado = 'aceptado'
       WHERE solicitante_id = ? AND destinatario_id = ?`,
      [solicitanteId, destinatarioId]
    );
  },

  // Rechazar solicitud: eliminar o marcar como 'rechazado'
  rechazarSolicitud: async (solicitanteId, destinatarioId) => {
    // Puedes eliminar o actualizar estado = 'rechazado'
    await db.query(
      `DELETE FROM amistad
       WHERE solicitante_id = ? AND destinatario_id = ?`,
      [solicitanteId, destinatarioId]
    );
  },

  // Listar solicitudes pendientes que he recibido
  findSolicitudesRecibidas: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT a.solicitante_id, a.fecha, u.nombre, u.apellido
         FROM amistad a
         JOIN usuario u ON a.solicitante_id = u.usuario_id
        WHERE a.destinatario_id = ?
          AND a.estado = 'pendiente'`,
      [usuario_id]
    );
    return rows;
  },

  // listar amigos (estado = 'aceptado') de un usuario
  findAmigosDe: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT u.usuario_id, u.nombre, u.apellido
         FROM amistad a
         JOIN usuario u
           ON ( (a.solicitante_id = u.usuario_id AND a.destinatario_id = ?)
              OR (a.destinatario_id = u.usuario_id AND a.solicitante_id = ?) )
        WHERE a.estado = 'aceptado'`,
      [usuario_id, usuario_id]
    );
    return rows;
  },

  findSolicitudesEnviadas: async (usuario_id) => {
  const [rows] = await db.query(
    `SELECT destinatario_id, fecha
       FROM amistad
      WHERE solicitante_id = ? AND estado = 'pendiente'`,
    [usuario_id]
  );
  return rows; // { destinatario_id, fecha }
  }
  

  
};

module.exports = Amistad;
