<?php
// api/compras.php (con usuario_id y lógica de stock)
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

$usuario = verificarPermiso('proveedores');

// --- GET ---
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('
            SELECT c.*, p.nombre as proveedor_nombre, u.nombre as usuario_nombre
            FROM compras c
            LEFT JOIN proveedores p ON c.proveedor_id = p.id
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.id = ?
        ');
        $stmt->execute([$id]);
        $compra = $stmt->fetch();
        if (!$compra) {
            http_response_code(404);
            echo json_encode(['error' => 'Compra no encontrada']);
            exit;
        }
        $stmt = $db->prepare('SELECT * FROM compra_detalles WHERE compra_id = ?');
        $stmt->execute([$id]);
        $compra['detalles'] = $stmt->fetchAll();
        echo json_encode($compra);
    } else {
        $compras = $db->query('
            SELECT c.*, p.nombre as proveedor_nombre, u.nombre as usuario_nombre
            FROM compras c
            LEFT JOIN proveedores p ON c.proveedor_id = p.id
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            ORDER BY c.fecha DESC
        ')->fetchAll();
        foreach ($compras as &$c) {
            $stmt = $db->prepare('SELECT * FROM compra_detalles WHERE compra_id = ?');
            $stmt->execute([$c['id']]);
            $c['detalles'] = $stmt->fetchAll();
        }
        echo json_encode($compras);
    }
    exit;
}

// --- POST (crear compra) ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $proveedor_id = intval($input['proveedor_id'] ?? 0);
    $fecha = $input['fecha'] ?? date('Y-m-d');
    $estado = $input['estado'] ?? 'recibido';
    $detalles = $input['detalles'] ?? [];
    $usuario_id = $usuario['id'];

    if ($proveedor_id <= 0 || empty($detalles)) {
        http_response_code(400);
        echo json_encode(['error' => 'Proveedor y al menos un detalle son requeridos']);
        exit;
    }

    $checkProveedor = $db->prepare('SELECT id FROM proveedores WHERE id = ?');
    $checkProveedor->execute([$proveedor_id]);
    if (!$checkProveedor->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Proveedor no existe']);
        exit;
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO compras (proveedor_id, fecha, estado, usuario_id) VALUES (?, ?, ?, ?)');
        $stmt->execute([$proveedor_id, $fecha, $estado, $usuario_id]);
        $compra_id = $db->lastInsertId();

        $total = 0;
        $stmtDetalle = $db->prepare('INSERT INTO compra_detalles (compra_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)');
        $stmtUpdateStock = $db->prepare('UPDATE productos SET cantidad = cantidad + ? WHERE id = ?');

        foreach ($detalles as $det) {
            $producto_id = intval($det['producto_id'] ?? 0);
            $cantidad = floatval($det['cantidad'] ?? 0);
            $precio = floatval($det['precio_unitario'] ?? 0);
            if ($producto_id > 0 && $cantidad > 0 && $precio >= 0) {
                $checkProd = $db->prepare('SELECT id FROM productos WHERE id = ?');
                $checkProd->execute([$producto_id]);
                if (!$checkProd->fetch()) {
                    throw new Exception("Producto ID $producto_id no existe");
                }
                $subtotal = $cantidad * $precio;
                $stmtDetalle->execute([$compra_id, $producto_id, $cantidad, $precio, $subtotal]);
                $total += $subtotal;

                if ($estado === 'recibido') {
                    $stmtUpdateStock->execute([$cantidad, $producto_id]);
                }
            }
        }

        $stmtUpdateTotal = $db->prepare('UPDATE compras SET total = ? WHERE id = ?');
        $stmtUpdateTotal->execute([$total, $compra_id]);

        $db->commit();
        echo json_encode(['id' => $compra_id, 'message' => 'Compra registrada', 'total' => $total]);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al registrar compra: ' . $e->getMessage()]);
    }
    exit;
}

// --- PUT (actualizar estado) ---
if ($method === 'PUT') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $nuevoEstado = $input['estado'] ?? null;
    if ($nuevoEstado === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Estado es requerido']);
        exit;
    }

    $stmt = $db->prepare('SELECT * FROM compras WHERE id = ?');
    $stmt->execute([$id]);
    $compra = $stmt->fetch();
    if (!$compra) {
        http_response_code(404);
        echo json_encode(['error' => 'Compra no encontrada']);
        exit;
    }

    $estadoActual = $compra['estado'];
    if ($estadoActual === $nuevoEstado) {
        echo json_encode(['message' => 'Estado sin cambios']);
        exit;
    }

    $stmtDetalles = $db->prepare('SELECT * FROM compra_detalles WHERE compra_id = ?');
    $stmtDetalles->execute([$id]);
    $detalles = $stmtDetalles->fetchAll();

    $db->beginTransaction();
    try {
        $stmtUpdate = $db->prepare('UPDATE compras SET estado = ? WHERE id = ?');
        $stmtUpdate->execute([$nuevoEstado, $id]);

        $stmtStock = $db->prepare('UPDATE productos SET cantidad = cantidad + ? WHERE id = ?');

        foreach ($detalles as $det) {
            $producto_id = $det['producto_id'];
            $cantidad = $det['cantidad'];

            if ($estadoActual === 'pendiente' && $nuevoEstado === 'recibido') {
                $stmtStock->execute([$cantidad, $producto_id]);
            } elseif ($estadoActual === 'recibido' && ($nuevoEstado === 'pendiente' || $nuevoEstado === 'cancelado')) {
                $stmtStock->execute([-$cantidad, $producto_id]);
            } elseif ($estadoActual === 'cancelado' && $nuevoEstado === 'recibido') {
                $stmtStock->execute([$cantidad, $producto_id]);
            }
        }

        $db->commit();
        echo json_encode(['message' => 'Estado actualizado correctamente']);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar estado: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>