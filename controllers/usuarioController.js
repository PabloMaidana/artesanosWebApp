const Usuario = require('../models/usuarioModel');

exports.showLogin = (req, res) => {
  res.render('usuario/login');
};

exports.login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;
    const user = await Usuario.findByEmail(email);

    if (!user || user.contrasena !== contrasena) {
      return res.status(400).render('usuario/login', { error: 'Email o contraseña incorrectos' });
    }

    // Guardar datos mínimos en sesión
    req.session.usuario_id = user.usuario_id;
    req.session.usuario_nombre = user.nombre;
    res.redirect('/usuario/perfil');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al iniciar sesión');
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/usuario/login');
};

exports.showProfile = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const user = await Usuario.findById(usuario_id);
    res.render('usuario/perfil', { user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar perfil');
  }
};

exports.showChangePassword = (req, res) => {
  res.render('usuario/change_password');
};

exports.changePassword = async (req, res) => {
  try {
    const usuario_id = req.session.usuario_id;
    const { actual, nueva, confirm } = req.body;

    // Verificar contraseña actual
    const user = await Usuario.findById(usuario_id);
    if (!user || user.contrasena !== actual) {
      return res.status(400).render('usuario/change_password', { error: 'Contraseña actual incorrecta' });
    }

    // Verificar que la nueva y la confirmación coincidan
    if (nueva !== confirm) {
      return res.status(400).render('usuario/change_password', { error: 'La nueva contraseña y su confirmación no coinciden' });
    }

    // Actualizar en BD
    await Usuario.changePassword(usuario_id, nueva);
    res.redirect('/usuario/perfil');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cambiar contraseña');
  }
};