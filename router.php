<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// 1. Si la solicitud es a /api/, redirige a api/index.php
if (strpos($uri, '/api/') === 0) {
    require __DIR__ . '/api/index.php';
    exit;
}

// 2. Intentar servir archivos desde la carpeta public/
$publicDir = __DIR__ . '/public';
$filePath = $publicDir . $uri;

// Si el archivo existe y es un archivo (no directorio), servirlo
if ($uri !== '/' && file_exists($filePath) && is_file($filePath)) {
    return false; // Deja que el servidor integrado de PHP sirva el archivo
}

// 3. Si la ruta es la raíz o no se encontró archivo, servir index.html desde public/
$indexFile = $publicDir . '/index.html';
if (file_exists($indexFile)) {
    header('Content-Type: text/html');
    readfile($indexFile);
    exit;
}

// 4. Si nada funciona, mostrar un mensaje de error con el contenido de public/
http_response_code(404);
echo "<h1>404 - Página no encontrada</h1>";
echo "<p>No se encontró <code>public/index.html</code>.</p>";
echo "<p>Contenido de <code>public/</code>:</p><ul>";
if (is_dir($publicDir)) {
    $files = scandir($publicDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            echo "<li>$file</li>";
        }
    }
} else {
    echo "<li>⚠️ La carpeta <code>public/</code> no existe en el contenedor.</li>";
}
echo "</ul>";
