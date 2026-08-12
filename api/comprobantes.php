<?php
// api/comprobantes.php
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

$usuario = verificarPermiso('ventas');

// --- GET ---
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('SELECT * FROM comprobantes WHERE id = ?');
        $stmt->execute([$id]);
        $comprobante = $stmt->fetch();
        if (!$comprobante) {
            http_response_code(404);
            echo json_encode(['error' => 'Comprobante no encontrado']);
            exit;
        }
        $stmt = $db->prepare('SELECT * FROM comprobante_items WHERE comprobante_id = ?');
        $stmt->execute([$id]);
        $comprobante['items'] = $stmt->fetchAll();
        echo json_encode($comprobante);
    } else {
        $comprobantes = $db->query('SELECT * FROM comprobantes ORDER BY fecha DESC')->fetchAll();
        foreach ($comprobantes as &$c) {
            $stmt = $db->prepare('SELECT * FROM comprobante_items WHERE comprobante_id = ?');
            $stmt->execute([$c['id']]);
            $c['items'] = $stmt->fetchAll();
        }
        echo json_encode($comprobantes);
    }
    exit;
}

// --- POST ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $numero = trim($input['numero'] ?? '');
    $tipo = trim($input['tipo'] ?? '');
    $cliente_id = intval($input['cliente_id'] ?? 0);
    $fecha = $input['fecha'] ?? date('Y-m-d');
    $estado = $input['estado'] ?? 'emitido';
    $items = $input['items'] ?? [];

    if (empty($numero) || empty($tipo) || $cliente_id <= 0 || empty($items)) {
        http_response_code(400);
        echo json_encode(['error' => 'Número, tipo, cliente y al menos un item son requeridos']);
        exit;
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO comprobantes (numero, tipo, cliente_id, fecha, estado) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$numero, $tipo, $cliente_id, $fecha, $estado]);
        $comp_id = $db->lastInsertId();

        $total = 0;
        $stmtItem = $db->prepare('INSERT INTO comprobante_items (comprobante_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
        foreach ($items as $item) {
            $producto_id = intval($item['producto_id'] ?? 0);
            $cantidad = floatval($item['cantidad'] ?? 0);
            $precio = floatval($item['precio_unitario'] ?? 0);
            if ($producto_id > 0 && $cantidad > 0 && $precio >= 0) {
                $stmtItem->execute([$comp_id, $producto_id, $cantidad, $precio]);
                $total += $cantidad * $precio;
            }
        }
        // Actualizar total
        $stmtUpdate = $db->prepare('UPDATE comprobantes SET total = ? WHERE id = ?');
        $stmtUpdate->execute([$total, $comp_id]);

        $db->commit();
        echo json_encode(['id' => $comp_id, 'message' => 'Comprobante creado']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear comprobante: ' . $e->getMessage()]);
    }
    exit;
}

// --- PUT ---
if ($method === 'PUT') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $numero = trim($input['numero'] ?? '');
    $tipo = trim($input['tipo'] ?? '');
    $cliente_id = intval($input['cliente_id'] ?? 0);
    $fecha = $input['fecha'] ?? date('Y-m-d');
    $estado = $input['estado'] ?? 'emitido';
    $items = $input['items'] ?? [];

    if (empty($numero) || empty($tipo) || $cliente_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Número, tipo y cliente son requeridos']);
        exit;
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('UPDATE comprobantes SET numero = ?, tipo = ?, cliente_id = ?, fecha = ?, estado = ? WHERE id = ?');
        $stmt->execute([$numero, $tipo, $cliente_id, $fecha, $estado, $id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Comprobante no encontrado']);
            exit;
        }
        // Reemplazar items
        $stmtDel = $db->prepare('DELETE FROM comprobante_items WHERE comprobante_id = ?');
        $stmtDel->execute([$id]);
        $total = 0;
        $stmtItem = $db->prepare('INSERT INTO comprobante_items (comprobante_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
        foreach ($items as $item) {
            $producto_id = intval($item['producto_id'] ?? 0);
            $cantidad = floatval($item['cantidad'] ?? 0);
            $precio = floatval($item['precio_unitario'] ?? 0);
            if ($producto_id > 0 && $cantidad > 0 && $precio >= 0) {
                $stmtItem->execute([$id, $producto_id, $cantidad, $precio]);
                $total += $cantidad * $precio;
            }
        }
        $stmtUpdate = $db->prepare('UPDATE comprobantes SET total = ? WHERE id = ?');
        $stmtUpdate->execute([$total, $id]);

        $db->commit();
        echo json_encode(['message' => 'Comprobante actualizado']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar comprobante: ' . $e->getMessage()]);
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
    $stmt = $db->prepare('DELETE FROM comprobantes WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Comprobante no encontrado']);
        exit;
    }
    echo json_encode(['message' => 'Comprobante eliminado']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>