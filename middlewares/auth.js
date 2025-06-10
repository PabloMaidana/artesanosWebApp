
// Si hay sesión activa, deja pasar; si no, redirige a login
exports.isLoggedIn = (req, res, next) => {
  if (req.session && req.session.usuario_id) {
    return next();
  }
  res.redirect('/usuario/login');
};

// Si no hay sesión, deja pasar. si hay sesión, redirige al perfil
exports.isLoggedOut = (req, res, next) => {
  if (!req.session || !req.session.usuario_id) {
    return next();
  }
  res.redirect('/usuario/perfil');
};
