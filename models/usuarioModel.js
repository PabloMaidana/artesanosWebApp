
const db = require('../config/db');

const Usuario = {
  // Buscar usuario por email (para login)
  findByEmail: async (email) => {
    const [rows] = await db.query(
      `SELECT usuario_id, contrasena, nombre, apellido, intereses, url_imagen_perfil, email
       FROM usuario
       WHERE email = ? AND estado = 1`,
      [email]
    );
    return rows[0]; // Si no existe, devuelve undefined
  },

  // Obtener datos de perfil por ID
  findById: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT usuario_id, nombre, apellido, intereses, url_imagen_perfil, email, contrasena
       FROM usuario
       WHERE usuario_id = ? AND estado = 1`,
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
  }
};

module.exports = Usuario;
