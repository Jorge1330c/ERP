<?php
// api/usuarios.php (modificado: PUT con campos opcionales)
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

$usuario = verificarPermiso('administracion');

// --- GET ---
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('SELECT id, nombre, email, rol, estado FROM usuarios WHERE id = ?');
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        if (!$data) {
            http_response_code(404);
            echo json_encode(['error' => 'Usuario no encontrado']);
            exit;
        }
        $permStmt = $db->prepare('SELECT modulo FROM permisos WHERE usuario_id = ?');
        $permStmt->execute([$id]);
        $data['permisos'] = $permStmt->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode($data);
    } else {
        $stmt = $db->query('SELECT id, nombre, email, rol, estado FROM usuarios');
        $usuarios = $stmt->fetchAll();
        foreach ($usuarios as &$u) {
            $permStmt = $db->prepare('SELECT modulo FROM permisos WHERE usuario_id = ?');
            $permStmt->execute([$u['id']]);
            $u['permisos'] = $permStmt->fetchAll(PDO::FETCH_COLUMN);
        }
        echo json_encode($usuarios);
    }
    exit;
}

// --- POST (crear) ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $nombre = trim($input['nombre'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $rol = trim($input['rol'] ?? '');
    $estado = $input['estado'] ?? 'activo';
    $permisos = $input['permisos'] ?? [];

    if (empty($nombre) || empty($email) || empty($password) || empty($rol)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre, email, contraseña y rol son obligatorios']);
        exit;
    }

    $check = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'El email ya está registrado']);
        exit;
    }

    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO usuarios (nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$nombre, $email, $password_hash, $rol, $estado]);
        $userId = $db->lastInsertId();

        if (!empty($permisos)) {
            $stmtPerm = $db->prepare('INSERT INTO permisos (usuario_id, modulo) VALUES (?, ?)');
            foreach ($permisos as $modulo) {
                $stmtPerm->execute([$userId, $modulo]);
            }
        }

        $db->commit();
        echo json_encode(['id' => $userId, 'message' => 'Usuario creado']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear usuario: ' . $e->getMessage()]);
    }
    exit;
}

// --- PUT (actualizar con campos opcionales) ---
if ($method === 'PUT') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Campos que se pueden actualizar (todos opcionales)
    $nombre = isset($input['nombre']) ? trim($input['nombre']) : null;
    $email = isset($input['email']) ? trim($input['email']) : null;
    $password = isset($input['password']) ? $input['password'] : null;
    $rol = isset($input['rol']) ? trim($input['rol']) : null;
    $estado = isset($input['estado']) ? trim($input['estado']) : null;
    $permisos = isset($input['permisos']) ? $input['permisos'] : null;

    // Construir consulta dinámica
    $fields = [];
    $params = [];

    if ($nombre !== null) {
        $fields[] = 'nombre = ?';
        $params[] = $nombre;
    }
    if ($email !== null) {
        // Validar email único
        $check = $db->prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?');
        $check->execute([$email, $id]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'El email ya está registrado']);
            exit;
        }
        $fields[] = 'email = ?';
        $params[] = $email;
    }
    if ($password !== null) {
        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'La contraseña debe tener al menos 6 caracteres']);
            exit;
        }
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        $fields[] = 'password_hash = ?';
        $params[] = $password_hash;
    }
    if ($rol !== null) {
        $fields[] = 'rol = ?';
        $params[] = $rol;
    }
    if ($estado !== null) {
        $fields[] = 'estado = ?';
        $params[] = $estado;
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No se enviaron campos para actualizar']);
        exit;
    }

    $params[] = $id;
    $sql = 'UPDATE usuarios SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado o sin cambios']);
        exit;
    }

    // Actualizar permisos si se enviaron
    if ($permisos !== null) {
        $stmtDel = $db->prepare('DELETE FROM permisos WHERE usuario_id = ?');
        $stmtDel->execute([$id]);
        if (!empty($permisos)) {
            $stmtPerm = $db->prepare('INSERT INTO permisos (usuario_id, modulo) VALUES (?, ?)');
            foreach ($permisos as $modulo) {
                $stmtPerm->execute([$id, $modulo]);
            }
        }
    }

    echo json_encode(['message' => 'Usuario actualizado']);
    exit;
}

// --- DELETE ---
if ($method === 'DELETE') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $check = $db->prepare('SELECT id FROM usuarios WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        exit;
    }
    $stmt = $db->prepare('DELETE FROM usuarios WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['message' => 'Usuario eliminado']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>