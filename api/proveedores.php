<?php
// api/proveedores.php
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

// <-- Verificar permiso 'proveedores'
$usuario = verificarPermiso('proveedores');

// --- GET ---
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('SELECT * FROM proveedores WHERE id = ?');
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        if (!$data) {
            http_response_code(404);
            echo json_encode(['error' => 'Proveedor no encontrado']);
            exit;
        }
        echo json_encode($data);
    } else {
        $stmt = $db->query('SELECT * FROM proveedores ORDER BY nombre');
        echo json_encode($stmt->fetchAll());
    }
    exit;
}

// --- POST (crear) ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $nombre = trim($input['nombre'] ?? '');
    $contacto = trim($input['contacto'] ?? '');
    $categoria = trim($input['categoria'] ?? '');
    $telefono = trim($input['telefono'] ?? '');
    $email = trim($input['email'] ?? '');
    $estado = $input['estado'] ?? 'activo';

    if (empty($nombre) || empty($categoria)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre y categoría son obligatorios']);
        exit;
    }

    $stmt = $db->prepare('INSERT INTO proveedores (nombre, contacto, categoria, telefono, email, estado) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$nombre, $contacto, $categoria, $telefono, $email, $estado]);
    echo json_encode(['id' => $db->lastInsertId(), 'message' => 'Proveedor creado']);
    exit;
}

// --- PUT (actualizar) ---
if ($method === 'PUT') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $nombre = trim($input['nombre'] ?? '');
    $contacto = trim($input['contacto'] ?? '');
    $categoria = trim($input['categoria'] ?? '');
    $telefono = trim($input['telefono'] ?? '');
    $email = trim($input['email'] ?? '');
    $estado = $input['estado'] ?? 'activo';

    if (empty($nombre) || empty($categoria)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre y categoría son obligatorios']);
        exit;
    }

    $stmt = $db->prepare('UPDATE proveedores SET nombre = ?, contacto = ?, categoria = ?, telefono = ?, email = ?, estado = ? WHERE id = ?');
    $stmt->execute([$nombre, $contacto, $categoria, $telefono, $email, $estado, $id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Proveedor no encontrado o sin cambios']);
        exit;
    }
    echo json_encode(['message' => 'Proveedor actualizado']);
    exit;
}

// --- DELETE ---
if ($method === 'DELETE') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $stmt = $db->prepare('DELETE FROM proveedores WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Proveedor no encontrado']);
        exit;
    }
    echo json_encode(['message' => 'Proveedor eliminado']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>