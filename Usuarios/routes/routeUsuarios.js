// 1. --- IMPORTACIONES ---
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const controllerUsuario = require('../controllers/controllerUsuarios.js');
const JWT_SECRET = process.env.JWT_SECRET || 'mi-clave-secreta-para-el-proyecto';

const verificarAutenticacion = (req, res, next) => {
    console.log('[Middleware Auth] Verificando token...');

    try {
        // 1. Obtener el token del 'Authorization header'
        // El formato esperado es: "Bearer <token>"
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        // 2. Si no hay token, denegar acceso (401 Unauthorized)
        if (token == null) {
            console.warn('[Middleware Auth] FORBIDDEN: No se proporcionó token.');
            return res.status(401).json({
                status: 'error',
                mensaje: 'Acceso denegado. Se requiere token de autenticación.'
            });
        }

        // 3. Verificar el token
        // jwt.verify() decodifica el token. Si es inválido (expirado, firma incorrecta),
        // lanzará un error que será capturado por el 'catch'.
        jwt.verify(token, JWT_SECRET, (err, usuarioPayload) => {
            if (err) {
                console.warn(`[Middleware Auth] INVALID_TOKEN: ${err.message}`);
                return res.status(401).json({
                    status: 'error',
                    mensaje: 'Token inválido o expirado.'
                });
            }

            // 4. ¡Éxito! El token es válido.
            // Añadimos el payload del token (que contiene username y rol)
            // al objeto 'req' para que los controladores puedan usarlo.
            req.user = usuarioPayload;
            console.log(`[Middleware Auth] SUCCESS: Usuario autenticado: ${req.user.username}`);
            next();
        });

    } catch (error) {
        console.error('[Middleware Auth] ERROR:', error.message);
        res.status(500).json({
            status: 'error',
            mensaje: 'Error interno al validar la autenticación.'
        });
    }
};


// 3. --- DEFINICIÓN DE RUTAS ---

// La ruta base es "/redesSocial/usuarios" (definida en app.js)

// --- Rutas Públicas (No requieren autenticación) ---

/**
 * @route   POST /redesSocial/usuarios/login
 * @desc    Inicia sesión y obtiene un token JWT.
 * @access  Público
 */
router.post('/login', controllerUsuario.ingresarUsuario);


// --- Rutas Protegidas (Requieren autenticación) ---


/**
 * @route   POST /redesSocial/usuarios/
 * @desc    Crea un nuevo usuario (solo Admins).
 * @access  Protegido (Requiere token)
 */
// Nota: La *autorización* (si es Admin) la valida el controlador.
// El middleware aquí solo *autentica* (si está logueado).
router.post('/', verificarAutenticacion, controllerUsuario.crearUsuario);

/**
 * @route   GET /redesSocial/usuarios/
 * @desc    Obtiene todos los usuarios.
 * @access  Protegido (Requiere token)
 */
router.get('/', verificarAutenticacion, controllerUsuario.getTodosLosUsuarios);

/**
 * @route   GET /redesSocial/usuarios/:username
 * @desc    Obtiene un usuario específico por su username.
 * @access  Protegido (Requiere token)
 */
// Usamos ':username' porque es nuestra PK, como en tu V2.
router.get('/:username', verificarAutenticacion, controllerUsuario.getUsuarioPorUsername);

/**
 * @route   POST /redesSocial/usuarios/logout
 * @desc    Cierra la sesión (invalida el token en el cliente).
 * @access  Protegido (Requiere token)
 */
router.post('/logout', verificarAutenticacion, controllerUsuario.logout);

module.exports = router;