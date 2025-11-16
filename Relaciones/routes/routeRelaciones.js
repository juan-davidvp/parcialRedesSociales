//--- IMPORTACIONES ---
const express = require('express');
const router = express.Router();

// Importamos el controlador
const controllerRelaciones = require('../controllers/controllerRelaciones.js'); 

/**
 * @route   POST /redesSocial/follows/
 * @desc    Permite al usuario autenticado seguir a otro usuario.
 * @access  Protegido (Requiere token)
 */
router.post('/:username', controllerRelaciones.crearFollow);

/**
 * @route   GET /redesSocial/follows/siguiendo/:username
 * @desc    Obtiene la lista de usuarios que :username está siguiendo.
 * @access  Protegido (Requiere token)
 */
router.get('/:username', controllerRelaciones.obtenerSeguidos);

// 4. --- EXPORTACIÓN ---
module.exports = router;