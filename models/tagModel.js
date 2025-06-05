
const db = require('../config/db');

const Tag = {
  // Listar todas las etiquetas
  findAll: async () => {
    const [rows] = await db.query(`SELECT * FROM tag`);
    return rows;
  },

  // Crear una nueva etiqueta
  create: async (nombre) => {
    const [result] = await db.query(
      `INSERT INTO tag (nombre)
       VALUES (?)`,
      [nombre]
    );
    return result.insertId;
  }
};

module.exports = Tag;
