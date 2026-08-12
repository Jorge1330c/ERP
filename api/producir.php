<?php
// api/producir.php
$db = getDB();

// <-- Verificar permiso 'formulas' (producción está asociada a fórmulas)
$usuario = verificarPermiso('formulas');

$input = json_decode(file_get_contents('php://input'), true);
$formula_id = intval($input['formula_id'] ?? 0);
$batch_size = floatval($input['batch_size'] ?? 0);

if ($formula_id <= 0 || $batch_size <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de fórmula y tamaño de batch son requeridos']);
    exit;
}

// Obtener fórmula con sus ingredientes y producto terminado
$stmt = $db->prepare('SELECT * FROM formulas WHERE id = ?');
$stmt->execute([$formula_id]);
$formula = $stmt->fetch();

if (!$formula) {
    http_response_code(404);
    echo json_encode(['error' => 'Fórmula no encontrada']);
    exit;
}

if (!$formula['producto_terminado_id']) {
    http_response_code(400);
    echo json_encode(['error' => 'La fórmula no tiene asociado un producto terminado']);
    exit;
}

// <-- Validar que el producto terminado existe
$checkPT = $db->prepare('SELECT id FROM productos WHERE id = ?');
$checkPT->execute([$formula['producto_terminado_id']]);
if (!$checkPT->fetch()) {
    http_response_code(400);
    echo json_encode(['error' => 'El producto terminado asociado no existe']);
    exit;
}

// Obtener ingredientes
$stmt = $db->prepare('SELECT * FROM formula_ingredientes WHERE formula_id = ?');
$stmt->execute([$formula_id]);
$ingredientes = $stmt->fetchAll();

if (empty($ingredientes)) {
    http_response_code(400);
    echo json_encode(['error' => 'La fórmula no tiene ingredientes']);
    exit;
}

// Calcular factor de escala
$factor = $batch_size / $formula['tamano_batch'];

$db->beginTransaction();
try {
    // 1. Descontar materias primas
    $stmtUpdateMP = $db->prepare('UPDATE productos SET cantidad = cantidad - ? WHERE id = ?');
    foreach ($ingredientes as $ing) {
        $mp_id = $ing['materia_prima_id'];
        // <-- Validar que la materia prima existe
        $checkMP = $db->prepare('SELECT id FROM productos WHERE id = ?');
        $checkMP->execute([$mp_id]);
        if (!$checkMP->fetch()) {
            throw new Exception("Materia prima ID $mp_id no existe");
        }
        $cantidad_necesaria = $ing['cantidad_batch'] * $factor;
        // Verificar stock suficiente
        $checkStmt = $db->prepare('SELECT cantidad FROM productos WHERE id = ?');
        $checkStmt->execute([$mp_id]);
        $stockActual = $checkStmt->fetchColumn();
        if ($stockActual < $cantidad_necesaria) {
            throw new Exception("Stock insuficiente de materia prima ID $mp_id (necesario: $cantidad_necesaria, disponible: $stockActual)");
        }
        $stmtUpdateMP->execute([$cantidad_necesaria, $mp_id]);
    }

    // 2. Agregar producto terminado
    $producto_terminado_id = $formula['producto_terminado_id'];
    $cantidad_producida = $batch_size; // por defecto en kg
    if ($formula['unidades_batch'] > 0) {
        $cantidad_producida = $formula['unidades_batch'] * $factor;
    }

    $stmtUpdatePT = $db->prepare('UPDATE productos SET cantidad = cantidad + ? WHERE id = ?');
    $stmtUpdatePT->execute([$cantidad_producida, $producto_terminado_id]);

    $db->commit();
    echo json_encode([
        'message' => 'Producción exitosa',
        'detalle' => [
            'batch_size' => $batch_size,
            'factor' => $factor,
            'materias_primas_consumidas' => $ingredientes,
            'producto_terminado_id' => $producto_terminado_id,
            'cantidad_producida' => $cantidad_producida
        ]
    ]);
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(409);
    echo json_encode(['error' => $e->getMessage()]);
}
?>