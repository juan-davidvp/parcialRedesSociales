// 1. --- IMPORTACIONES ---
// Importamos el Modelo para poder interactuar con la Base de Datos.
const UsuarioModel = require('../models/modelUsuario.js');
// Importamos JWT para crear los tokens de sesión.
const jwt = require('jsonwebtoken');

// El "secreto" para firmar los JWT. En producción, ESTO DEBE ESTAR en variables de entorno (.env).
const JWT_SECRET = process.env.JWT_SECRET || 'mi-clave-secreta-para-el-proyecto';


/**
 * (Funcionalidad POST /login)
 * Valida las credenciales y, si son correctas, genera un token JWT.
 * Este es el único endpoint (junto con crearUsuario) que NO requiere
 * estar logueado.
 */
exports.ingresarUsuario = async (req, res) => {
    // Log de inicio de la operación
    console.log('[controllerUsuario] INFO: Inicia POST /login');

    try {
        const { username, contrasenaPlana } = req.body;

        // 1. Validación de entrada
        if (!username || !contrasenaPlana) {
            console.warn('[controllerUsuario] WARN: Intento de login con datos incompletos.');
            return res.status(400).json({
                status: 'error',
                mensaje: 'Se requiere "username" y "contrasenaPlana".'
            });
        }

        // 2. Llamada al Modelo para validar
        const usuario = await UsuarioModel.validarCredenciales(username, contrasenaPlana);

        // 3. Verificación y creación de Token
        if (!usuario) {
            console.warn(`[controllerUsuario] WARN: Credenciales inválidas para el usuario: ${username}`);
            return res.status(401).json({
                status: 'error',
                mensaje: 'Credenciales inválidas. Verifique el usuario o la contraseña.'
            });
        }

        // 4. ¡Éxito! Crear el payload y el token
        // El payload es la información que guardamos DENTRO del token.
        // NUNCA guardes contraseñas o información sensible aquí.
        const payload = {
            username: usuario.username,
            rol: usuario.rol
        };

        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: '8h' // El token expirará en 8 horas
        });

        console.log(`[controllerUsuario] SUCCESS: Login exitoso para el usuario: ${username}`);
        res.status(200).json({
            status: 'success',
            mensaje: 'Inicio de sesión exitoso.',
            data: {
                token,
                usuario: payload
            }
        });

    } catch (error) {
        console.error('[controllerUsuario] ERROR: Error interno en ingresarUsuario:', error.message);
        res.status(500).json({
            status: 'error',
            mensaje: 'Error interno del servidor al intentar iniciar sesión.'
        });
    }
};

/**
 * (Funcionalidad POST /usuarios)
 * Crea un nuevo usuario.
 * RESTRICCIÓN: Solo usuarios 'Administrador' autenticados.
 */
exports.crearUsuario = async (req, res) => {
    // req.user es insertado por el middleware de autenticación
    const usuarioSolicitante = req.user;
    console.log(`[controllerUsuario] INFO: Inicia POST /usuarios (Solicitante: ${usuarioSolicitante.username})`);

    try {
        // 1. RESTRICCIÓN DE AUTORIZACIÓN (ROL)
        if (usuarioSolicitante.rol !== 'Administrador') {
            console.warn(`[controllerUsuario] FORBIDDEN: El usuario ${usuarioSolicitante.username} (Rol: ${usuarioSolicitante.rol}) intentó crear un usuario sin permisos.`);
            return res.status(403).json({
                status: 'error',
                mensaje: 'Acceso denegado. Solo los administradores pueden crear usuarios.'
            });
        }

        // 2. Validación de entrada de datos
        const { username, nombre, contrasena_plana, rol } = req.body;
        if (!username || !nombre || !contrasena_plana) {
            console.warn('[controllerUsuario] WARN: Intento de crear usuario con datos incompletos.');
            return res.status(400).json({
                status: 'error',
                mensaje: 'Datos incompletos. Se requiere "username", "nombre" y "contrasena_plana".'
            });
        }

        // 3. Llamada al Modelo
        const nuevoUsuario = { username, nombre, contrasena_plana, rol };
        await UsuarioModel.crear(nuevoUsuario);

        // 4. Respuesta exitosa
        // No devolvemos la contraseña, solo los datos de confirmación.
        const datosRespuesta = { username, nombre, rol };
        console.log(`[controllerUsuario] SUCCESS: Usuario ${username} creado exitosamente por ${usuarioSolicitante.username}.`);
        res.status(201).json({
            status: 'success',
            mensaje: 'Usuario creado exitosamente.',
            data: datosRespuesta
        });

    } catch (error) {
        // Manejo de errores específicos (ej. usuario duplicado)
        if (error.code === 'ER_DUP_ENTRY') {
            console.warn(`[controllerUsuario] CONFLICT: Intento de crear un usuario que ya existe: ${req.body.username}`);
            res.status(409).json({
                status: 'error',
                mensaje: 'Conflicto: El "username" ya está en uso.'
            });
        } else {
            console.error('[controllerUsuario] ERROR: Error interno en crearUsuario:', error.message);
            res.status(500).json({
                status: 'error',
                mensaje: 'Error interno del servidor al crear el usuario.'
            });
        }
    }
};

/**
 * (Funcionalidad GET /usuarios)
 * Consulta todos los usuarios.
 * RESTRICCIÓN: Solo usuarios logueados (cualquier rol).
 */
exports.getTodosLosUsuarios = async (req, res) => {
    console.log(`[controllerUsuario] INFO: Inicia GET /usuarios (Solicitante: ${req.user.username})`);

    try {
        // 1. Llamada al Modelo
        // El middleware ya validó que el usuario está logueado.
        const usuarios = await UsuarioModel.obtenerTodos();

        // 2. Respuesta exitosa
        console.log(`[controllerUsuario] SUCCESS: Se devolvieron ${usuarios.length} usuarios.`);
        res.status(200).json({
            status: 'success',
            data: usuarios
        });

    } catch (error) {
        console.error('[controllerUsuario] ERROR: Error interno en getTodosLosUsuarios:', error.message);
        res.status(500).json({
            status: 'error',
            mensaje: 'Error interno del servidor al consultar los usuarios.'
        });
    }
};

/**
 * (Funcionalidad GET /usuarios/:username)
 * Consulta un usuario específico por su username.
 * RESTRICCIÓN: Solo usuarios logueados (cualquier rol).
 */
exports.getUsuarioPorUsername = async (req, res) => {
    const usernameBuscado = req.params.username;
    console.log(`[controllerUsuario] INFO: Inicia GET /usuarios/${usernameBuscado} (Solicitante: ${req.user.username})`);

    try {
        // 1. Llamada al Modelo
        const usuario = await UsuarioModel.buscarPorUsername(usernameBuscado);

        // 2. Verificación de existencia
        if (!usuario) {
            console.log(`[controllerUsuario] NOT_FOUND: No se encontró el usuario: ${usernameBuscado}`);
            return res.status(404).json({
                status: 'error',
                mensaje: 'Usuario no encontrado.'
            });
        }

        // 3. Respuesta exitosa
        console.log(`[controllerUsuario] SUCCESS: Se encontró el usuario: ${usernameBuscado}`);
        res.status(200).json({
            status: 'success',
            data: usuario
        });

    } catch (error) {
        console.error('[controllerUsuario] ERROR: Error interno en getUsuarioPorUsername:', error.message);
        res.status(500).json({
            status: 'error',
            mensaje: 'Error interno del servidor al buscar el usuario.'
        });
    }
};

/**
 * (Funcionalidad POST /logout)
 * Cierra la sesión.
 * Con JWT, el "logout" real ocurre en el cliente (borrando el token).
 * Este endpoint es útil para que el cliente confirme la acción.
 * RESTRICCIÓN: Solo usuarios logueados.
 */
exports.logout = (req, res) => {
    console.log(`[controllerUsuario] INFO: Inicia POST /logout (Solicitante: ${req.user.username})`);

    // No hay lógica de servidor necesaria para JWT stateless.
    // El cliente debe eliminar el token de su 'localStorage' o 'cookies'.
    res.status(200).json({
        status: 'success',
        mensaje: 'Cierre de sesión exitoso. El cliente debe destruir el token.'
    });
};