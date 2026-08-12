<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Definir rutas y claves usando variables de entorno (Render) o valores por defecto (local)
define('DB_FILE', $_ENV['DB_PATH'] ?? __DIR__ . '/../erp.db');
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'clave_secreta_super_segura_123456789');
define('JWT_EXPIRES', 28800); // 8 horas

// Cabeceras CORS para todas las respuestas
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responder a solicitudes OPTIONS (preflight) sin ejecutar más código
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}
?>
