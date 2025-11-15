/**
 * modelUsuario.js
 *
 * Esta capa del modelo (Patrón MVC) es responsable de TODA la interacción
 * con la base de datos del microservicio de Usuarios.
 * Utilizamos 'mysql2/promise' para soporte de async/await y un pool
 * de conexiones para eficiencia.
 * Utilizamos 'bcrypt' para el manejo seguro de contraseñas (hashing y comparación).
 */

// --- IMPORTACIONES ---
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// --- CONFIGURACIÓN DE LA CONEXIÓN ---
// Un "pool" gestiona múltiples conexiones para que no tengamos que
// abrir y cerrar una por cada consulta. Es una mejora masiva de rendimiento.
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'capasusuarios',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const SALT_ROUNDS = 10;
const UsuarioModel = {};

/**
 * (Funcionalidad POST /usuarios)
 * Crea un nuevo usuario en la base de datos.
 * Esta función incluye el HASHING de la contraseña.
 *
 * NOTA DE ARQUITECTURA: La validación de que el usuario 'solicitante'
 * es 'Administrador' debe hacerse en el CONTROLADOR (o un middleware)
 * antes de llamar a esta función del modelo. El modelo solo ejecuta
 * la lógica de datos.
 *
 * @param {object} nuevoUsuario - Objeto con { username, nombre, contrasena_plana, rol }
 * @returns {object} - El resultado de la inserción (o lanza error)
 */
UsuarioModel.crear = async (nuevoUsuario) => {
    const { username, nombre, contrasena_plana, rol } = nuevoUsuario;

    try {
        // --- Seguridad: Hashing de la contraseña ---
        const contrasena_hash = await bcrypt.hash(contrasena_plana, SALT_ROUNDS);
        // --- Consulta SQL ---
        const sql = `
            INSERT INTO Usuarios (username, nombre, contrasena_hash, rol)
            VALUES (?, ?, ?, ?)
        `;
        // Ejecutamos la consulta
        const [resultado] = await pool.execute(sql, [
            username,
            nombre,
            contrasena_hash,
            rol || 'Usuario red social'
        ]);
        return resultado;
    } catch (error) {
        // Manejo de errores (ej. username duplicado 'ER_DUP_ENTRY')
        console.error("Error en UsuarioModel.crear:", error.message);
        throw error;
    }
};

/**
 * (Funcionalidad GET /usuarios)
 * Consulta y devuelve TODOS los usuarios de la red social.
 *
 * IMPORTANTE: Excluimos campos sensibles como 'contrasena_hash'.
 *
 * @returns {Array<object>} - Un arreglo de objetos de usuario.
 */
UsuarioModel.obtenerTodos = async () => {
    try {
        // --- Consulta SQL ---
        const sql = `
            SELECT username, nombre, rol, fecha_creacion
            FROM Usuarios
        `;
        const [usuarios] = await pool.query(sql);
        return usuarios;
    } catch (error) {
        console.error("Error en UsuarioModel.obtenerTodos:", error.message);
        throw error;
    }
};

/**
 * (Funcionalidad GET /usuarios/:username)
 * Busca y devuelve un usuario específico por su 'username' (PK).
 *
 * IMPORTANTE: También excluye 'contrasena_hash'.
 *
 * @param {string} username - El Primary Key del usuario a buscar.
 * @returns {object | null} - El objeto del usuario o null si no se encuentra.
 */
UsuarioModel.buscarPorUsername = async (username) => {
    try {
        // --- Consulta SQL ---
        const sql = `
            SELECT username, nombre, rol, fecha_creacion
            FROM Usuarios
            WHERE username = ?
        `;
        const [usuarios] = await pool.execute(sql, [username]);

        // .execute() devuelve un arreglo. Si no hay resultados,
        // el arreglo estará vacío.
        if (usuarios.length > 0) {
            return usuarios[0]; // Devolvemos el primer (y único) resultado
        } else {
            return null; // No se encontró el usuario
        }

    } catch (error) {
        console.error("Error en UsuarioModel.buscarPorUsername:", error.message);
        throw error;
    }
};

/**
 * (Funcionalidad POST /login)
 * Valida las credenciales de un usuario.
 * Esta función es el núcleo de la lógica de "Ingresar usuario".
 * No es un endpoint GET, sino la lógica para un POST.
 *
 * @param {string} username - El username a validar.
 * @param {string} contrasenaPlana - La contraseña en texto plano.
 * @returns {object | null} - El objeto del usuario (sin hash) si es válido, o null si no.
 */
UsuarioModel.validarCredenciales = async (username, contrasenaPlana) => {
    try {
        // 1. Buscar al usuario Y su hash (esta es la única vez que traemos el hash de la BD).
        const sql = `
            SELECT username, nombre, rol, contrasena_hash
            FROM Usuarios
            WHERE username = ?
        `;
        const [usuarios] = await pool.execute(sql, [username]);

        if (usuarios.length === 0) {
            return null;
        }
        const usuario = usuarios[0];

        // 2. Comparar la contraseña plana con el hash guardado.
        const esValida = await bcrypt.compare(contrasenaPlana, usuario.contrasena_hash);

        if (esValida) {
            // ¡Contraseña correcta!
            // Eliminamos el hash antes de devolver el objeto
            // por seguridad.
            delete usuario.contrasena_hash;
            return usuario; // Usuario validado
        } else {
            // Contraseña incorrecta
            return null;
        }

    } catch (error) {
        console.error("Error en UsuarioModel.validarCredenciales:", error.message);
        throw error;
    }
};

/**
 * (Funcionalidad: Validar usuario logueado / Middleware)
 *
 * El requisito "Validar usuario logueado: GET" y el llamado a otras APIs
 * (Mensaje, Follow) se implementa típicamente con JSON Web Tokens (JWT).
 *
 * El flujo sería:
 * 1. El usuario hace POST /login.
 * 2. El Controlador llama a `UsuarioModel.validarCredenciales()`.
 * 3. Si tiene éxito, el *Controlador* crea un token JWT y se lo envía al cliente.
 * 4. Para llamar a `POST /mensajes`, el cliente envía ese token en la cabecera (Header).
 * 5. Un *Middleware* en tu API intercepta la llamada, verifica el token (con 'jwt.verify()')
 * y si es válido, deja pasar la solicitud al controlador de Mensajes.
 *
 * La función `buscarPorUsername` de este modelo es útil para el middleware,
 * ya que permite refrescar los datos del usuario en cada solicitud
 * (por ejemplo, para verificar si su 'rol' ha cambiado o si fue baneado).
 */


// 4. --- EXPORTACIÓN ---
module.exports = UsuarioModel;