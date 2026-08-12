<?php
// router.php
// Este archivo actúa como enrutador para el servidor PHP integrado (-S)

// Obtener la ruta solicitada (sin query string)
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$path = urldecode($path); // Decodificar caracteres especiales

// ------------------------------------------------------------
// 1. Si la petición es para la API (empieza con /api/)
// ------------------------------------------------------------
if (strpos($path, '/api/') === 0) {
    // Cargar el controlador principal de la API
    // Las variables $_GET, $_POST, etc. ya están disponibles
    require __DIR__ . '/api/index.php';
    exit; // Terminar la ejecución
}

// ------------------------------------------------------------
// 2. Si el archivo solicitado existe físicamente (CSS, JS, imágenes, etc.)
//    devolvemos false para que el servidor interno lo sirva directamente.
// ------------------------------------------------------------
if ($path !== '/' && file_exists(__DIR__ . $path)) {
    return false; // El servidor se encarga de servir el archivo
}

// ------------------------------------------------------------
// 3. Para cualquier otra ruta (incluyendo la raíz), servir index.html
//    Esto permite que el frontend maneje las rutas (SPA).
// ------------------------------------------------------------
require __DIR__ . '/index.html';
