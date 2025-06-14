require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// configuración de la base de datos para sesiones
const dbConfig = require('./config/db');
const sessionStore = new MySQLStore({}, dbConfig);

// middleware de sesión
app.use(
  session({
    key: 'artesanos_session',
    secret: 'un-super-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 día
    },
  })
);

// Middleware para exponer io en cada req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Configurar Pug como motor de plantillas
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Para poder leer JSON y datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Carpeta de archivos estáticos (CSS, JS, imágenes)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rutas
const usuarioRoutes = require('./routes/usuarioRoutes');
const amistadRoutes = require('./routes/amistadRoutes');
const albumRoutes = require('./routes/albumRoutes');
const imagenRoutes = require('./routes/imagenRoutes');
const comentarioRoutes = require('./routes/comentarioRoutes');
const tagRoutes = require('./routes/tagRoutes');
const notificacionRoutes = require('./routes/notificacionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// armar rutas en sus prefijos
app.use('/usuario', usuarioRoutes);
app.use('/amistad', amistadRoutes);
app.use('/album', albumRoutes);
app.use('/imagen', imagenRoutes);
app.use('/comentario', comentarioRoutes);
app.use('/tag', tagRoutes);
app.use('/notificacion', notificacionRoutes);
app.use('/dashboard', dashboardRoutes);

// ruta raíz, redirige según sesión
app.get('/', (req, res) => {
  if (req.session.usuario_id) {
    return res.redirect('/dashboard');
  }
  res.redirect('/usuario/login');
});

app.get('/', (req, res) => {
  if (req.session.usuario_id) return res.redirect('/dashboard');
  res.redirect('/usuario/login');
});

// Configuración de Socket.io
io.on('connection', (socket) => {
  // El cliente debe emitir 'register_user' después de iniciar sesión
  socket.on('register_user', (usuario_id) => {
    socket.join(`user_${usuario_id}`);
  });

});

// iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});