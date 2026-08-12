<?php
// api/cotizaciones.php
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

$usuario = verificarPermiso('ventas');

// --- GET ---
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('SELECT * FROM cotizaciones WHERE id = ?');
        $stmt->execute([$id]);
        $cotizacion = $stmt->fetch();
        if (!$cotizacion) {
            http_response_code(404);
            echo json_encode(['error' => 'Cotización no encontrada']);
            exit;
        }
        $stmt = $db->prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id = ?');
        $stmt->execute([$id]);
        $cotizacion['items'] = $stmt->fetchAll();
        echo json_encode($cotizacion);
    } else {
        $cotizaciones = $db->query('SELECT * FROM cotizaciones ORDER BY fecha DESC')->fetchAll();
        foreach ($cotizaciones as &$c) {
            $stmt = $db->prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id = ?');
            $stmt->execute([$c['id']]);
            $c['items'] = $stmt->fetchAll();
        }
        echo json_encode($cotizaciones);
    }
    exit;
}

// --- POST ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $cliente_id = intval($input['cliente_id'] ?? 0);
    $fecha = $input['fecha'] ?? date('Y-m-d');
    $estado = $input['estado'] ?? 'pendiente';
    $items = $input['items'] ?? [];

    if ($cliente_id <= 0 || empty($items)) {
        http_response_code(400);
        echo json_encode(['error' => 'Cliente y al menos un item son requeridos']);
        exit;
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO cotizaciones (cliente_id, fecha, estado) VALUES (?, ?, ?)');
        $stmt->execute([$cliente_id, $fecha, $estado]);
        $cotizacion_id = $db->lastInsertId();

        $stmtItem = $db->prepare('INSERT INTO cotizacion_items (cotizacion_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
        foreach ($items as $item) {
            $producto_id = intval($item['producto_id'] ?? 0);
            $cantidad = floatval($item['cantidad'] ?? 0);
            $precio = floatval($item['precio_unitario'] ?? 0);
            if ($producto_id > 0 && $cantidad > 0 && $precio >= 0) {
                $stmtItem->execute([$cotizacion_id, $producto_id, $cantidad, $precio]);
            }
        }
        $db->commit();
        echo json_encode(['id' => $cotizacion_id, 'message' => 'Cotización creada']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear cotización: ' . $e->getMessage()]);
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
    $cliente_id = intval($input['cliente_id'] ?? 0);
    $fecha = $input['fecha'] ?? date('Y-m-d');
    $estado = $input['estado'] ?? 'pendiente';
    $items = $input['items'] ?? [];

    if ($cliente_id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Cliente requerido']);
        exit;
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('UPDATE cotizaciones SET cliente_id = ?, fecha = ?, estado = ? WHERE id = ?');
        $stmt->execute([$cliente_id, $fecha, $estado, $id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Cotización no encontrada']);
            exit;
        }
        // Reemplazar items
        $stmtDel = $db->prepare('DELETE FROM cotizacion_items WHERE cotizacion_id = ?');
        $stmtDel->execute([$id]);
        $stmtItem = $db->prepare('INSERT INTO cotizacion_items (cotizacion_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
        foreach ($items as $item) {
            $producto_id = intval($item['producto_id'] ?? 0);
            $cantidad = floatval($item['cantidad'] ?? 0);
            $precio = floatval($item['precio_unitario'] ?? 0);
            if ($producto_id > 0 && $cantidad > 0 && $precio >= 0) {
                $stmtItem->execute([$id, $producto_id, $cantidad, $precio]);
            }
        }
        $db->commit();
        echo json_encode(['message' => 'Cotización actualizada']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar cotización: ' . $e->getMessage()]);
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
    $stmt = $db->prepare('DELETE FROM cotizaciones WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Cotización no encontrada']);
        exit;
    }
    echo json_encode(['message' => 'Cotización eliminada']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>