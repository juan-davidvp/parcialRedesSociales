// Imports
const FollowModel = require('../models/modelRelaciones.js');
const axios = require('axios');

// URL base del microservicio de Usuarios (debe estar en .env)
const USUARIOS_API_URL = process.env.USUARIOS_API_URL || 'http://localhost:3310/redesSocial/usuarios';


const controllerRelaciones = {};

/**
 * (Funcionalidad POST /follows)
 * Permite al usuario autenticado (seguidor) seguir a otro usuario (principal).
 */
controllerRelaciones.crearFollow = async (req, res) => {

    const { username } = req.params;
    console.log(`[controllerFollow] INFO: Inicia GET /follows/siguiendo/${username}`);
    const { usuarioSeguidorUsername } = req.body;

    console.log(`[controllerFollow] INFO: Inicia POST /follows (Seguidor: ${username}, Principal: ${usuarioSeguidorUsername})`);

    try {
        // --- Validaciones ---
        if (!usuarioSeguidorUsername) {
            console.warn('[controllerFollow] WARN: Intento de seguir sin "usuarioSeguidorUsername".');
            return res.status(400).json({
                status: 'error',
                mensaje: 'Se requiere "usuarioSeguidorUsername" en el body.'
            });
        }

        if (username === usuarioSeguidorUsername) {
            console.warn(`[controllerFollow] WARN: El usuario ${username} intentó seguirse a sí mismo.`);
            return res.status(400).json({
                status: 'error',
                mensaje: 'Un usuario no puede seguirse a sí mismo.'
            });
        }

        // --- Verificación de Existencia (Llamada al Microservicio Usuarios)
        // Verificamos que el 'usuarioSeguidor' (a quien se quiere seguir) exista.
        // Pasamos el token de autorización para que el servicio de Usuarios nos deje pasar.
        try {
            console.log(`[controllerFollow] INFO: Verificando existencia de ${usuarioSeguidorUsername} en Microservicio Usuarios...`);
            await axios.get(`${USUARIOS_API_URL}/${usuarioSeguidorUsername}`, {
                headers: { 'Authorization': req.headers['authorization'] }
            });
            console.log(`[controllerFollow] INFO: Usuario ${usuarioSeguidorUsername} verificado.`);

        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.warn(`[controllerFollow] NOT_FOUND: El usuario a seguir (${usuarioSeguidorUsername}) no existe.`);
                return res.status(404).json({
                    status: 'error',
                    mensaje: 'El usuario al que intentas seguir no existe.'
                });
            }
            console.error('[controllerFollow] ERROR: Falló la comunicación con el microservicio de Usuarios.', error.message);
            return res.status(503).json({
                status: 'error',
                mensaje: 'El servicio de usuarios no está disponible en este momento.'
            });
        }

        // --- Llamada al Modelo (Crear el Follow)
        await FollowModel.crear(usuarioSeguidorUsername, username);

        // 4. Respuesta Exitosa
        console.log(`[controllerFollow] SUCCESS: ${username} ahora sigue a ${usuarioSeguidorUsername}.`);
        res.status(201).json({
            status: 'success',
            mensaje: 'Usuario seguido exitosamente.',
            data: {
                seguidor: username,
                seguido: usuarioSeguidorUsername
            }
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.warn(`[controllerFollow] CONFLICT: ${username} ya sigue a ${usuarioSeguidorUsername}.`);
            res.status(409).json({
                status: 'error',
                mensaje: 'Ya estás siguiendo a este usuario.'
            });
        } else {
            console.error('[controllerFollow] ERROR: Error interno en crearFollow:', error.message);
            res.status(500).json({
                status: 'error',
                mensaje: 'Error interno del servidor al procesar la solicitud.'
            });
        }
    }
};

/**
 * (Funcionalidad GET /follows/siguiendo/:username)
 * Devuelve la lista de usuarios a los que :username sigue.
 */
controllerRelaciones.obtenerSeguidos = async (req, res) => {
    const { username } = req.params;
    console.log(`[controllerFollow] INFO: Inicia GET /follows/siguiendo/${username}`);

    try {

        try {
            console.log(`[controllerFollow] INFO: Verificando existencia de ${username} en Microservicio Usuarios...`);
            await axios.get(`${USUARIOS_API_URL}/${username}`, {
                headers: { 'Authorization': req.headers['authorization'] }
            });
            console.log(`[controllerFollow] INFO: Usuario ${username} verificado.`);

        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.warn(`[controllerFollow] NOT_FOUND: El usuario a seguir (${username}) no existe.`);
                return res.status(404).json({
                    status: 'error',
                    mensaje: 'El usuario al que intentas seguir no existe o no esta verificado.'
                });
            }
            console.error('[controllerFollow] ERROR: Token Invalido', error.message);
            return res.status(401).json({
                status: 'error',
                mensaje: 'No te encuentras Logeado en el sistema'
            });
        }
        const listaSeguidos = await FollowModel.obtenerSeguidosPor(username);

        // 2. Respuesta Exitosa
        console.log(`[controllerFollow] SUCCESS: Se devolvieron ${listaSeguidos.length} usuarios seguidos por ${username}.`);
        res.status(200).json({
            status: 'success',
            data: listaSeguidos
        });


    } catch (error) {
        console.error(`[controllerFollow] ERROR: Error interno en obtenerSeguidos (user: ${username}):`, error.message);
        res.status(500).json({
            status: 'error',
            mensaje: 'Error interno del servidor al consultar los seguimientos.'
        });
    }
};

module.exports = controllerRelaciones;