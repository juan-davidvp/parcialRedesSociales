const mysql = require('mysql2/promise');

// Configuración del Pool de Conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME || 'capasmensajes', 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const MensajeModel = {};

/**
 * (Funcionalidad POST /mensajes/:username)
 * Crea un nuevo mensaje en la tabla Mensajes.
 *
 * @param {string} username_autor - El 'username' del usuario que crea el mensaje.
 * @param {string} contenido - El texto del mensaje.
 * @returns {object} - El resultado de la inserción.
 */
MensajeModel.crear = async (username_autor, contenido) => {
    try {
        const sql = `
            INSERT INTO Mensajes (username_autor, contenido)
            VALUES (?, ?)
        `;
        
        const [resultado] = await pool.execute(sql, [
            username_autor,
            contenido
        ]);

        return resultado;

    } catch (error) {
        console.error("Error en MensajeModel.crear:", error.message);
        throw error;
    }
};

/**
 * (NUEVA FUNCIONALIDAD GET /mensajes/:username)
 * Obtiene todos los mensajes de UN solo usuario.
 *
 * @param {string} username - El username del autor a buscar.
 * @returns {Array<object>} - Un arreglo de objetos de mensaje, ordenados por fecha.
 */
MensajeModel.obtenerPorUnUsuario = async (username) => {
    try {
        const sql = `
            SELECT id, username_autor, contenido, fecha_creacion
            FROM Mensajes
            WHERE username_autor = ?
            ORDER BY fecha_creacion DESC
        `;

        // Usamos pool.execute() porque solo hay un parámetro (string),
        // lo cual es seguro y eficiente.
        const [mensajes] = await pool.execute(sql, [username]);
        return mensajes;

    } catch (error) {
        console.error("Error en MensajeModel.obtenerPorUnUsuario:", error.message);
        throw error;
    }
};

module.exports = MensajeModel;