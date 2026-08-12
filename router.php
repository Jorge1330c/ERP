<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Si la solicitud es a /api/, redirige a api/index.php
if (strpos($uri, '/api/') === 0) {
    require __DIR__ . '/api/index.php';
    exit;
}

// Si el archivo existe físicamente (CSS, JS, HTML, imágenes), sírvelo
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false; // Deja que el servidor integrado sirva el archivo
}

// Si no, redirige a index.html (para manejo de rutas SPA)
require_once __DIR__ . '/index.html';
