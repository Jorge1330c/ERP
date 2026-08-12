<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function generarToken($usuario) {
    $payload = [
        'id' => $usuario['id'],
        'email' => $usuario['email'],
        'rol' => $usuario['rol'],
        'permisos' => obtenerPermisos($usuario['id']),
        'exp' => time() + JWT_EXPIRES
    ];
    return JWT::encode($payload, JWT_SECRET, 'HS256');
}

function obtenerPermisos($usuarioId) {
    $db = getDB();
    $stmt = $db->prepare('SELECT modulo FROM permisos WHERE usuario_id = ?');
    $stmt->execute([$usuarioId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function validarToken() {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Token no proporcionado']);
        exit;
    }
    $token = str_replace('Bearer ', '', $headers['Authorization']);
    try {
        $decoded = JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
        return (array) $decoded;
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['error' => 'Token inválido: ' . $e->getMessage()]);
        exit;
    }
}

// <-- NUEVA FUNCIÓN: Verifica que el usuario tenga el permiso requerido
function verificarPermiso($modulo) {
    $usuario = validarToken(); // ya decodifica y valida, devuelve array con 'permisos'
    if (!in_array($modulo, $usuario['permisos'])) {
        http_response_code(403);
        echo json_encode(['error' => 'No tienes permiso para este módulo: ' . $modulo]);
        exit;
    }
    return $usuario;
}
?>