/**
 * modelFollow.js
 *
 * Capa del Modelo para el microservicio de Follows.
 * Se encarga de la interacción directa con la tabla 'Follows' en su
 * propia base de datos.
 */

const mysql = require('mysql2/promise');

// Configuración del Pool de Conexiones
// (Asegúrate de que estas variables de entorno apunten a la BD de Follows)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'capasrelaciones', // BD del microservicio
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const modelRelaciones = {};

/**
 * (Funcionalidad POST /follows)
 * Crea una nueva relación de seguimiento en la tabla Follows.
 *
 * @param {string} usuario_principal_username 
 * @param {string} usuario_seguidor_username 
 * @returns {object}
 */
modelRelaciones.crear = async (usuario_principal_username, usuario_seguidor_username) => {
    try {
        const sql = `
            INSERT INTO Follows (usuario_principal_username, usuario_seguidor_username)
            VALUES (?, ?)
        `;
        
        const [resultado] = await pool.execute(sql, [
            usuario_principal_username,
            usuario_seguidor_username
        ]);

        return resultado;

    } catch (error) {
        console.error("Error en FollowModel.crear:", error.message);
        throw error; // Lanzamos el error para que el controlador lo atrape (ej. ER_DUP_ENTRY)
    }
};

/**
 * (Funcionalidad GET /follows/siguiendo/:username)
 * Consulta la lista de usuarios que un usuario específico está siguiendo.
 *
 * @param {string} username - El usuario (seguidor) del que queremos la lista.
 * @returns {Array<object>} - Un arreglo de objetos, ej. [{ usuario_principal_username: 'usuario_famoso' }]
 */
modelRelaciones.obtenerSeguidosPor = async (username) => {
    try {
        // Solo necesitamos saber a quién sigue
        const sql = `
            SELECT usuario_principal_username, fecha_creacion
            FROM Follows
            WHERE usuario_seguidor_username = ?
        `;

        const [seguidos] = await pool.execute(sql, [username]);
        return seguidos;

    } catch (error) {
        console.error("Error en FollowModel.obtenerSeguidosPor:", error.message);
        throw error;
    }
};

module.exports = modelRelaciones;