
const db = require('../config/db');

const Usuario = {
  // Buscar usuario por email (para login)
  findByEmail: async (email) => {
    const [rows] = await db.query(
      `SELECT usuario_id, contrasena, nombre, apellido, intereses, url_imagen_perfil, email
       FROM usuario
       WHERE email = ?`,
      [email]
    );
    return rows[0]; // Si no existe, devuelve undefined
  },

  // Obtener datos de perfil por ID
  findById: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT usuario_id, nombre, apellido, intereses, url_imagen_perfil, email, contrasena
       FROM usuario
       WHERE usuario_id = ?`,
      [usuario_id]
    );
    return rows[0];
  },

  // Cambiar contraseña 
  changePassword: async (usuario_id, nuevaContrasena) => {
    await db.query(
      `UPDATE usuario
         SET contrasena = ?
       WHERE usuario_id = ?`,
      [nuevaContrasena, usuario_id]
    );
  },

  // Buscar usuarios por término en nombre o apellido, excluyendo al propio usuario
  searchByNameExact: async (term, excludeUsuarioId) => {
    const [rows] = await db.query(
      `SELECT usuario_id, nombre, apellido, url_imagen_perfil
         FROM usuario
        WHERE (LOWER(nombre) = LOWER(?) OR LOWER(apellido) = LOWER(?))
          AND usuario_id <> ?`,
      [term, term, excludeUsuarioId]
    );
    return rows;
  },

   searchByName: async (term, excludeUsuarioId) => {
    term = term.trim();
    if (!term) return [];

    const parts = term.split(/\s+/);
    let sql, params;
    if (parts.length >= 2) {
      sql = `
        SELECT usuario_id, nombre, apellido, url_imagen_perfil
          FROM usuario
         WHERE (
                 LOWER(CONCAT(nombre, ' ', apellido)) = LOWER(?)
                 OR LOWER(CONCAT(apellido, ' ', nombre)) = LOWER(?)
               )
           AND usuario_id <> ?
      `;
      params = [term, term, excludeUsuarioId];
    } else {
      sql = `
        SELECT usuario_id, nombre, apellido, url_imagen_perfil
          FROM usuario
         WHERE (LOWER(nombre) = LOWER(?) OR LOWER(apellido) = LOWER(?))
           AND usuario_id <> ?
      `;
      params = [term, term, excludeUsuarioId];
    }

    const [rows] = await db.query(sql, params);
    return rows;
  },

  searchByNameFlexible: async (term, excludeUsuarioId) => {
    term = term.trim();
    if (!term) return [];

    const parts = term.split(/\s+/);
    let sql, params;
    if (parts.length >= 2) {
      // Nombre completo exacto (o apellido+nombre)
      sql = `
        SELECT usuario_id, nombre, apellido, url_imagen_perfil
          FROM usuario
         WHERE (
                 LOWER(CONCAT(nombre, ' ', apellido)) = LOWER(?)
                 OR LOWER(CONCAT(apellido, ' ', nombre)) = LOWER(?)
               )
           AND usuario_id <> ?
      `;
      params = [term, term, excludeUsuarioId];
    } else {
      // Una sola palabra: nombre exacto o apellido exacto
      sql = `
        SELECT usuario_id, nombre, apellido, url_imagen_perfil
          FROM usuario
         WHERE (LOWER(nombre) = LOWER(?) OR LOWER(apellido) = LOWER(?))
           AND usuario_id <> ?
      `;
      params = [term, term, excludeUsuarioId];
    }

    const [rows] = await db.query(sql, params);
    return rows;
  }

};

module.exports = Usuario;
