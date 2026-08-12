<?php
// api/formulas.php (corregido)
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

$usuario = verificarPermiso('formulas');

// --- GET ---
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('SELECT * FROM formulas WHERE id = ?');
        $stmt->execute([$id]);
        $formula = $stmt->fetch();
        if (!$formula) {
            http_response_code(404);
            echo json_encode(['error' => 'Fórmula no encontrada']);
            exit;
        }
        $stmt = $db->prepare('SELECT * FROM formula_ingredientes WHERE formula_id = ?');
        $stmt->execute([$id]);
        $formula['ingredientes'] = $stmt->fetchAll();
        echo json_encode($formula);
    } else {
        $formulas = $db->query('SELECT * FROM formulas ORDER BY id DESC')->fetchAll();
        foreach ($formulas as &$f) {
            $stmt = $db->prepare('SELECT * FROM formula_ingredientes WHERE formula_id = ?');
            $stmt->execute([$f['id']]);
            $f['ingredientes'] = $stmt->fetchAll();
        }
        echo json_encode($formulas);
    }
    exit;
}

// --- POST (crear) ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validar campos requeridos
    $nombre = trim($input['nombre'] ?? '');
    $tamano_batch = floatval($input['tamano_batch'] ?? 0);
    $ingredientes = $input['ingredientes'] ?? [];

    if (empty($nombre)) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre de la fórmula es obligatorio']);
        exit;
    }
    if ($tamano_batch <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'El tamaño del batch debe ser mayor a 0']);
        exit;
    }
    if (empty($ingredientes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Debe agregar al menos un ingrediente']);
        exit;
    }

    // Validar que cada ingrediente tenga materia_prima_id y porcentaje > 0
    foreach ($ingredientes as $ing) {
        $mp_id = intval($ing['materia_prima_id'] ?? 0);
        $porcentaje = floatval($ing['porcentaje'] ?? 0);
        if ($mp_id <= 0 || $porcentaje <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Todos los ingredientes deben tener materia prima y porcentaje > 0']);
            exit;
        }
        // Verificar que la materia prima exista
        $check = $db->prepare('SELECT id FROM productos WHERE id = ?');
        $check->execute([$mp_id]);
        if (!$check->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => "La materia prima con ID $mp_id no existe"]);
            exit;
        }
    }

    // Obtener otros campos
    $estado = $input['estado'] ?? 'activo';
    $unidades_batch = intval($input['unidades_batch'] ?? 0);
    $contenido_neto = floatval($input['contenido_neto'] ?? 0);
    $observaciones = trim($input['observaciones'] ?? '');
    $producto_terminado_id = intval($input['producto_terminado_id'] ?? 0);
    if ($producto_terminado_id > 0) {
        $check = $db->prepare('SELECT id FROM productos WHERE id = ?');
        $check->execute([$producto_terminado_id]);
        if (!$check->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => "El producto terminado con ID $producto_terminado_id no existe"]);
            exit;
        }
    }

    $db->beginTransaction();
    try {
        // Insertar fórmula
        $stmt = $db->prepare('INSERT INTO formulas (nombre, estado, tamano_batch, unidades_batch, contenido_neto, observaciones, producto_terminado_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$nombre, $estado, $tamano_batch, $unidades_batch, $contenido_neto, $observaciones, $producto_terminado_id]);
        $formula_id = $db->lastInsertId();

        // Insertar ingredientes
        $stmtIng = $db->prepare('INSERT INTO formula_ingredientes (formula_id, materia_prima_id, porcentaje, cantidad_batch) VALUES (?, ?, ?, ?)');
        foreach ($ingredientes as $ing) {
            $mp_id = intval($ing['materia_prima_id']);
            $porcentaje = floatval($ing['porcentaje']);
            $cantidad_batch = ($porcentaje / 100) * $tamano_batch;
            $stmtIng->execute([$formula_id, $mp_id, $porcentaje, $cantidad_batch]);
        }

        $db->commit();
        echo json_encode(['id' => $formula_id, 'message' => 'Fórmula creada correctamente']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear la fórmula: ' . $e->getMessage()]);
    }
    exit;
}

// --- PUT (actualizar) - similar, con las mismas validaciones ---
if ($method === 'PUT') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $input = json_decode(file_get_contents('php://input'), true);

    $nombre = trim($input['nombre'] ?? '');
    $tamano_batch = floatval($input['tamano_batch'] ?? 0);
    $ingredientes = $input['ingredientes'] ?? [];

    if (empty($nombre)) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre de la fórmula es obligatorio']);
        exit;
    }
    if ($tamano_batch <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'El tamaño del batch debe ser mayor a 0']);
        exit;
    }
    if (empty($ingredientes)) {
        http_response_code(400);
        echo json_encode(['error' => 'Debe agregar al menos un ingrediente']);
        exit;
    }

    foreach ($ingredientes as $ing) {
        $mp_id = intval($ing['materia_prima_id'] ?? 0);
        $porcentaje = floatval($ing['porcentaje'] ?? 0);
        if ($mp_id <= 0 || $porcentaje <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Todos los ingredientes deben tener materia prima y porcentaje > 0']);
            exit;
        }
        $check = $db->prepare('SELECT id FROM productos WHERE id = ?');
        $check->execute([$mp_id]);
        if (!$check->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => "La materia prima con ID $mp_id no existe"]);
            exit;
        }
    }

    $estado = $input['estado'] ?? 'activo';
    $unidades_batch = intval($input['unidades_batch'] ?? 0);
    $contenido_neto = floatval($input['contenido_neto'] ?? 0);
    $observaciones = trim($input['observaciones'] ?? '');
    $producto_terminado_id = intval($input['producto_terminado_id'] ?? 0);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('UPDATE formulas SET nombre = ?, estado = ?, tamano_batch = ?, unidades_batch = ?, contenido_neto = ?, observaciones = ?, producto_terminado_id = ? WHERE id = ?');
        $stmt->execute([$nombre, $estado, $tamano_batch, $unidades_batch, $contenido_neto, $observaciones, $producto_terminado_id, $id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Fórmula no encontrada']);
            exit;
        }

        // Eliminar ingredientes antiguos y volver a insertar
        $stmtDel = $db->prepare('DELETE FROM formula_ingredientes WHERE formula_id = ?');
        $stmtDel->execute([$id]);

        $stmtIng = $db->prepare('INSERT INTO formula_ingredientes (formula_id, materia_prima_id, porcentaje, cantidad_batch) VALUES (?, ?, ?, ?)');
        foreach ($ingredientes as $ing) {
            $mp_id = intval($ing['materia_prima_id']);
            $porcentaje = floatval($ing['porcentaje']);
            $cantidad_batch = ($porcentaje / 100) * $tamano_batch;
            $stmtIng->execute([$id, $mp_id, $porcentaje, $cantidad_batch]);
        }

        $db->commit();
        echo json_encode(['message' => 'Fórmula actualizada correctamente']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar la fórmula: ' . $e->getMessage()]);
    }
    exit;
}

// --- DELETE ---
if ($method === 'DELETE') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $stmt = $db->prepare('DELETE FROM formulas WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Fórmula no encontrada']);
        exit;
    }
    echo json_encode(['message' => 'Fórmula eliminada']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>