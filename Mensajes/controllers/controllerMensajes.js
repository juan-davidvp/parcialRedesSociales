// -- Imports
const MensajeModel = require('../models/modelMensajes.js');
const axios = require('axios');

// URLs Microservicios
const USUARIOS_API_URL = process.env.USUARIOS_API_URL || 'http://localhost:3310/redesSocial/usuarios';
const RELACIONES_API_URL = process.env.RELACIONES_API_URL || 'http://localhost:3312/redesSocial/relaciones';

const MensajeController = {};

/**
 * (Funcionalidad POST /mensajes/:username)
 * Permite a un usuario autenticado crear un nuevo mensaje.
 */
MensajeController.crearMensaje = async (req, res) => {

    const { username } = req.params;
    const { contenido } = req.body;
    const authHeader = req.headers['authorization'];

    console.log(`[controllerMensajes] INFO: Inicia POST /mensajes/${username}`);

    try {
        // 1. Validación de Lógica de Negocio
        if (!contenido) {
            console.warn('[controllerMensajes] WARN: Intento de crear mensaje sin "contenido".');
            return res.status(400).json({
                status: 'error',
                mensaje: 'Se requiere "contenido" en el body.'
            });
        }

        // 2. Verificamos que el usuario esté logueado y exista.
        try {
            console.log(`[controllerMensajes] INFO: Verificando autenticación de ${username} en Microservicio Usuarios...`);
            await axios.get(`${USUARIOS_API_URL}/${username}`, {
                headers: { 'Authorization': authHeader }
            });
            console.log(`[controllerMensajes] INFO: Usuario ${username} verificado.`);
        } catch (error) {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                console.warn(`[controllerMensajes] AUTH_FAIL: Token inválido o no autorizado para ${username}.`);
                return res.status(401).json({
                    status: 'error',
                    mensaje: 'No te encuentras logueado en el sistema o tu token es inválido.'
                });
            }
            if (error.response && error.response.status === 404) {
                console.warn(`[controllerMensajes] NOT_FOUND: El usuario ${username} no existe.`);
                return res.status(404).json({
                    status: 'error',
                    mensaje: 'El usuario autor del mensaje no existe.'
                });
            }
            // Otro error (ej. servicio de Usuarios caído)
            console.error('[controllerMensajes] ERROR: Falló la comunicación con el microservicio de Usuarios.', error.message);
            return res.status(503).json({
                status: 'error',
                mensaje: 'El servicio de usuarios no está disponible en este momento.'
            });
        }
        
        // 3. Llamada al Modelo (Crear el Mensaje)
        await MensajeModel.crear(username, contenido);

        // 4. Respuesta Exitosa
        console.log(`[controllerMensajes] SUCCESS: Mensaje creado por ${username}.`);
        res.status(201).json({
            status: 'success',
            mensaje: 'Mensaje creado exitosamente.',
            data: {
                username_autor: username,
                contenido: contenido
            }
        });

    } catch (error) {
        console.error('[controllerMensajes] ERROR: Error interno en crearMensaje:', error.message);
        res.status(500).json({
            status: 'error',
            mensaje: 'Error interno del servidor al crear el mensaje.'
        });
    }
};

/**
 * (NUEVA FUNCIONALIDAD GET /mensajes/:username)
 * Devuelve todos los mensajes de un solo usuario.
 * Esta ruta será llamada por el microservicio de Relaciones.
 */
MensajeController.getMensajesPorUsuario = async (req, res) => {
    const { username } = req.params;
    const authHeader = req.headers['authorization'];
    console.log(`[controllerMensajes] INFO: Inicia GET /mensajes/${username}`);

    try {
        // 1. AUTENTICACIÓN MANUAL
        // (Requerido para que solo servicios autenticados puedan consumir esta ruta)
        try {
            console.log(`[controllerMensajes] INFO: Verificando autenticación de ${username}...`);
            // Nota: Podríamos verificar solo el token, pero verificar el usuario
            // asegura que no pidamos mensajes de usuarios inexistentes.
            await axios.get(`${USUARIOS_API_URL}/${username}`, {
                headers: { 'Authorization': authHeader }
            });
            console.log(`[controllerMensajes] INFO: Usuario ${username} verificado.`);
        } catch (error) {
            console.warn(`[controllerMensajes] AUTH_FAIL: Token inválido para GET /mensajes/${username}.`);
            return res.status(401).json({
                status: 'error',
                mensaje: 'No te encuentras logueado en el sistema.'
            });
        }
        
        // 2. Llamada al Modelo
        const mensajes = await MensajeModel.obtenerPorUnUsuario(username);

        // 3. Respuesta Exitosa
        console.log(`[controllerMensajes] SUCCESS: Mensajes de ${username} devueltos (${mensajes.length}).`);
        res.status(200).json({
            status: 'success',
            data: mensajes
        });

    } catch (error) {
        console.error(`[controllerMensajes] ERROR: Error interno en getMensajesPorUsuario (user: ${username}):`, error.message);
        res.status(500).json({
            status: 'error',
            mensaje: 'Error interno del servidor al consultar los mensajes.'
        });
    }
};
module.exports = MensajeController;