<?php
// api/clientes.php
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

// <-- Verificar permiso 'clientes'
$usuario = verificarPermiso('clientes');

// --- GET ---
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('SELECT * FROM clientes WHERE id = ?');
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        if (!$data) {
            http_response_code(404);
            echo json_encode(['error' => 'Cliente no encontrado']);
            exit;
        }
        echo json_encode($data);
    } else {
        $stmt = $db->query('SELECT * FROM clientes ORDER BY nombre');
        echo json_encode($stmt->fetchAll());
    }
    exit;
}

// --- POST (crear) ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $nombre = trim($input['nombre'] ?? '');
    $email = trim($input['email'] ?? '');
    $telefono = trim($input['telefono'] ?? '');
    $ruc = trim($input['ruc'] ?? '');

    if (empty($nombre)) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre es obligatorio']);
        exit;
    }

    $stmt = $db->prepare('INSERT INTO clientes (nombre, email, telefono, ruc) VALUES (?, ?, ?, ?)');
    $stmt->execute([$nombre, $email, $telefono, $ruc]);
    echo json_encode(['id' => $db->lastInsertId(), 'message' => 'Cliente creado']);
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
    $email = trim($input['email'] ?? '');
    $telefono = trim($input['telefono'] ?? '');
    $ruc = trim($input['ruc'] ?? '');

    if (empty($nombre)) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre es obligatorio']);
        exit;
    }

    $stmt = $db->prepare('UPDATE clientes SET nombre = ?, email = ?, telefono = ?, ruc = ? WHERE id = ?');
    $stmt->execute([$nombre, $email, $telefono, $ruc, $id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Cliente no encontrado o sin cambios']);
        exit;
    }
    echo json_encode(['message' => 'Cliente actualizado']);
    exit;
}

// --- DELETE ---
if ($method === 'DELETE') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $stmt = $db->prepare('DELETE FROM clientes WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Cliente no encontrado']);
        exit;
    }
    echo json_encode(['message' => 'Cliente eliminado']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>