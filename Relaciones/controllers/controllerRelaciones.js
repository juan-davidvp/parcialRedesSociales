// Imports
const FollowModel = require('../models/modelRelaciones.js');
const axios = require('axios');

// URL base del microservicio de Usuarios (debe estar en .env)
const USUARIOS_API_URL = process.env.USUARIOS_API_URL || 'http://localhost:3310/redesSocial/usuarios';
const MENSAJES_API_URL = 'http://localhost:3308/redesSocial/mensajes';


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
    const authHeader = req.headers['authorization'];
    console.log(`[controllerRelaciones] INFO: Inicia GET /timeline (Timeline para: ${username})`);

    try {
        // 1. AUTENTICACIÓN MANUAL (Como ya lo tienes)
        // (Verifica que el usuario que pide el timeline esté logueado)
        try {
            console.log(`[controllerRelaciones] INFO: Verificando autenticación de ${username}...`);
            await axios.get(`${USUARIOS_API_URL}/${username}`, {
                headers: { 'Authorization': authHeader }
            });
            console.log(`[controllerRelaciones] INFO: Usuario ${username} verificado.`);
        } catch (error) {
            console.warn(`[controllerRelaciones] AUTH_FAIL: Token inválido para ${username}.`);
            return res.status(401).json({
                status: 'error',
                mensaje: 'No te encuentras logueado en el sistema.'
            });
        }

        // 2. OBTENER LISTA DE SEGUIDOS (Llamada al Modelo Local)
        // (Esta lógica ya la tenías en esta función)
        const listaSeguidos = await FollowModel.obtenerSeguidosPor(username);
        
        if (listaSeguidos.length === 0) {
            console.log(`[controllerRelaciones] INFO: ${username} no sigue a nadie.`);
            return res.status(200).json({ status: 'success', data: [] });
        }

        // Convertimos el resultado (ej. [{ usuario_principal_username: 'userA' }])
        // en un arreglo simple de strings (ej. ['userA'])
        const usernamesSeguidos = listaSeguidos.map(s => s.usuario_principal_username);
        console.log(`[controllerRelaciones] INFO: ${username} sigue a:`, usernamesSeguidos);

        // 3. OBTENER MENSAJES POR CADA USUARIO SEGUIDO (Orquestación)
        
        // Creamos un arreglo de "promesas", una por cada llamada a la API de Mensajes
        const promesasDeMensajes = usernamesSeguidos.map(usernameSeguido => {
            console.log(`[controllerRelaciones] INFO: Llamando a Microservicio Mensajes para ${usernameSeguido}...`);
            return axios.get(`${MENSAJES_API_URL}/${usernameSeguido}`, {
                headers: { 'Authorization': authHeader } // Pasamos el token
            });
        });

        // Ejecutamos todas las llamadas en paralelo y esperamos a que terminen
        const respuestasMensajes = await Promise.all(promesasDeMensajes);

        const timelineAgrupado = usernamesSeguidos.map((usernameSeguido, index) => {
            const respuesta = respuestasMensajes[index];
            let mensajesLimpios = [];

            // Verificamos que la respuesta fue exitosa y trajo datos
            if (respuesta.data && respuesta.data.data && respuesta.data.data.length > 0) {
                
                // Limpiamos los mensajes para que coincidan con el formato solicitado
                // (Omitiendo 'username_autor', ya que es implícito en 'siguiendo')
                mensajesLimpios = respuesta.data.data.map(msg => {
                    return {
                        id: msg.id,
                        contenido: msg.contenido,
                        fecha_creacion: msg.fecha_creacion
                    };
                });
                // Nota: Los mensajes ya vienen ordenados por fecha desde el
                // microservicio de Mensajes.
            }

            // Devolvemos el objeto en el formato solicitado
            return {
                siguiendo: usernameSeguido,
                mensajes: mensajesLimpios
            };
        });

        // 5. RESPUESTA EXITOSA
        console.log(`[controllerRelaciones] SUCCESS: Timeline de ${username} devuelto (${timelineAgrupado.length} mensajes).`);
        res.status(200).json({
            status: 'success',
            data: timelineAgrupado
        });

    } catch (error) {
        // Captura errores de la llamada al modelo local o de las llamadas axios
        console.error(`[controllerRelaciones] ERROR: Error interno en getRelacionesPorUsuario (user: ${username}):`, error.message);
        res.status(500).json({
            status: 'error',
            mensaje: 'Error interno del servidor al construir el timeline.'
        });
    }
};

module.exports = controllerRelaciones;