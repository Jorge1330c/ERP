<?php
// api/pedidos.php
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

// <-- Verificar permiso 'ventas'
$usuario = verificarPermiso('ventas');

// --- GET ---
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('SELECT * FROM pedidos WHERE id = ?');
        $stmt->execute([$id]);
        $pedido = $stmt->fetch();
        if (!$pedido) {
            http_response_code(404);
            echo json_encode(['error' => 'Pedido no encontrado']);
            exit;
        }
        $stmt = $db->prepare('SELECT * FROM pedido_items WHERE pedido_id = ?');
        $stmt->execute([$id]);
        $pedido['items'] = $stmt->fetchAll();
        echo json_encode($pedido);
    } else {
        $pedidos = $db->query('SELECT * FROM pedidos ORDER BY fecha DESC')->fetchAll();
        foreach ($pedidos as &$p) {
            $stmt = $db->prepare('SELECT * FROM pedido_items WHERE pedido_id = ?');
            $stmt->execute([$p['id']]);
            $p['items'] = $stmt->fetchAll();
        }
        echo json_encode($pedidos);
    }
    exit;
}

// --- POST (crear pedido) ---
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
        // Insertar pedido
        $stmt = $db->prepare('INSERT INTO pedidos (cliente_id, fecha, estado) VALUES (?, ?, ?)');
        $stmt->execute([$cliente_id, $fecha, $estado]);
        $pedido_id = $db->lastInsertId();

        // Insertar items y descontar stock
        $stmtItem = $db->prepare('INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
        $stmtUpdateStock = $db->prepare('UPDATE productos SET cantidad = cantidad - ? WHERE id = ?');
        foreach ($items as $item) {
            $producto_id = intval($item['producto_id'] ?? 0);
            $cantidad = intval($item['cantidad'] ?? 1);
            $precio = floatval($item['precio_unitario'] ?? 0);
            if ($producto_id > 0 && $cantidad > 0) {
                // Verificar stock suficiente
                $checkStmt = $db->prepare('SELECT cantidad FROM productos WHERE id = ?');
                $checkStmt->execute([$producto_id]);
                $stockActual = $checkStmt->fetchColumn();
                if ($stockActual < $cantidad) {
                    throw new Exception("Stock insuficiente para producto ID $producto_id (disponible: $stockActual, solicitado: $cantidad)");
                }
                // Insertar item
                $stmtItem->execute([$pedido_id, $producto_id, $cantidad, $precio]);
                // Descontar stock
                $stmtUpdateStock->execute([$cantidad, $producto_id]);
            }
        }

        $db->commit();
        echo json_encode(['id' => $pedido_id, 'message' => 'Pedido creado']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(409);
        echo json_encode(['error' => 'Error al crear pedido: ' . $e->getMessage()]);
    }
    exit;
}

// --- PUT (actualizar pedido) ---
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
        // 1. Obtener los items antiguos para revertir stock
        $stmtOld = $db->prepare('SELECT * FROM pedido_items WHERE pedido_id = ?');
        $stmtOld->execute([$id]);
        $oldItems = $stmtOld->fetchAll();

        // Revertir stock de los items antiguos (sumar de vuelta)
        $stmtRevert = $db->prepare('UPDATE productos SET cantidad = cantidad + ? WHERE id = ?');
        foreach ($oldItems as $old) {
            $stmtRevert->execute([$old['cantidad'], $old['producto_id']]);
        }

        // 2. Actualizar el pedido (cliente, fecha, estado)
        $stmt = $db->prepare('UPDATE pedidos SET cliente_id = ?, fecha = ?, estado = ? WHERE id = ?');
        $stmt->execute([$cliente_id, $fecha, $estado, $id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Pedido no encontrado']);
            exit;
        }

        // 3. Eliminar los items viejos (ya están en $oldItems)
        $stmtDel = $db->prepare('DELETE FROM pedido_items WHERE pedido_id = ?');
        $stmtDel->execute([$id]);

        // 4. Insertar nuevos items y descontar stock
        $stmtItem = $db->prepare('INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
        $stmtDescontar = $db->prepare('UPDATE productos SET cantidad = cantidad - ? WHERE id = ?');
        foreach ($items as $item) {
            $producto_id = intval($item['producto_id'] ?? 0);
            $cantidad = intval($item['cantidad'] ?? 1);
            $precio = floatval($item['precio_unitario'] ?? 0);
            if ($producto_id > 0 && $cantidad > 0) {
                // Verificar stock suficiente
                $checkStmt = $db->prepare('SELECT cantidad FROM productos WHERE id = ?');
                $checkStmt->execute([$producto_id]);
                $stockActual = $checkStmt->fetchColumn();
                if ($stockActual < $cantidad) {
                    throw new Exception("Stock insuficiente para producto ID $producto_id (disponible: $stockActual, solicitado: $cantidad)");
                }
                $stmtItem->execute([$id, $producto_id, $cantidad, $precio]);
                $stmtDescontar->execute([$cantidad, $producto_id]);
            }
        }

        $db->commit();
        echo json_encode(['message' => 'Pedido actualizado']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(409);
        echo json_encode(['error' => 'Error al actualizar pedido: ' . $e->getMessage()]);
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
    $db->beginTransaction();
    try {
        // Obtener items para revertir stock
        $stmtOld = $db->prepare('SELECT * FROM pedido_items WHERE pedido_id = ?');
        $stmtOld->execute([$id]);
        $oldItems = $stmtOld->fetchAll();

        // Revertir stock (sumar de vuelta)
        $stmtRevert = $db->prepare('UPDATE productos SET cantidad = cantidad + ? WHERE id = ?');
        foreach ($oldItems as $old) {
            $stmtRevert->execute([$old['cantidad'], $old['producto_id']]);
        }

        // Eliminar items
        $stmtDel = $db->prepare('DELETE FROM pedido_items WHERE pedido_id = ?');
        $stmtDel->execute([$id]);

        // Eliminar pedido
        $stmt = $db->prepare('DELETE FROM pedidos WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Pedido no encontrado']);
            exit;
        }
        $db->commit();
        echo json_encode(['message' => 'Pedido eliminado']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar pedido: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>