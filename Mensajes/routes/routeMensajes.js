// 1. --- IMPORTACIONES ---
const express = require('express');
const router = express.Router();

// Importamos el controlador
const controllerMensajes = require('../controllers/controllerMensajes.js'); // Ajusta la ruta

// 2. --- DEFINICIÓN DE RUTAS ---
// La ruta base es "/redesSocial/mensajes" (definida en appMensajes.js)

/**
 * @route   POST /redesSocial/mensajes/:username
 * @desc    Crea un nuevo mensaje. El ':username' es el autor.
 * @access  Protegido (Validado por el controlador)
 */
router.post('/:username', controllerMensajes.crearMensaje);

/**
 * @route   GET /redesSocial/mensajes/:username
 * @desc    Obtiene todos los mensajes de un solo usuario (':username').
 * @access  Protegido (Validado por el controlador)
 */
router.get('/:username', controllerMensajes.getMensajesPorUsuario);

// 3. --- EXPORTACIÓN ---
module.exports = router;