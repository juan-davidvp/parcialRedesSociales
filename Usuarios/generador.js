
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10; // Debe ser el mismo que en tu modelUsuario.js

// La contraseña que quieres usar para tu admin
const contrasenaPlana = 'admin123';

// Función asincrónica para generar el hash
async function generarHash() {
    try {
        console.log(`Generando hash para: "${contrasenaPlana}"...`);
        const hash = await bcrypt.hash(contrasenaPlana, SALT_ROUNDS);
        
        console.log("¡Hash generado exitosamente!");
        console.log("Copia la siguiente línea completa y pégala en tu script 'seed_admin.sql':");
        console.log(hash);

    } catch (error) {
        console.error("Error al generar el hash:", error.message);
    }
}

// Ejecutar la función
generarHash();