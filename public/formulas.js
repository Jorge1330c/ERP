// ============================================
// public/formulas.js - Módulo de Fórmulas (con exportación CSV/PDF)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔵 DOMContentLoaded: Iniciando módulo de fórmulas');

    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user && user.permisos && !user.permisos.includes('formulas')) {
        alert('Acceso denegado: no tienes permiso para Fórmulas.');
        window.location.href = 'index.html';
        return;
    }

    let formulas = [];
    let productos = [];
    let contadorIngredientes = 0;

    // --- Elementos DOM ---
    const tbody = document.getElementById('formulaTableBody');
    const totalFormulasSpan = document.getElementById('totalFormulas');
    const activeFormulasSpan = document.getElementById('activeFormulas');
    const uniqueIngredientsSpan = document.getElementById('uniqueIngredients');
    const avgBatchSpan = document.getElementById('avgBatch');
    const formulaCountSpan = document.getElementById('formulaCount');

    const searchInput = document.getElementById('globalSearch');
    const openAddBtn = document.getElementById('openAddModal');

    // Modal de edición
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const editIdInput = document.getElementById('editId');
    const form = document.getElementById('formulaForm');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');

    const nombreInput = document.getElementById('nombre');
    const estadoFormulaSelect = document.getElementById('estadoFormula');
    const tamanoBatchInput = document.getElementById('tamanoBatch');
    const unidadesBatchInput = document.getElementById('unidadesBatch');
    const contenidoNetoInput = document.getElementById('contenidoNeto');
    const observacionesInput = document.getElementById('observaciones');
    const productoTerminadoSelect = document.getElementById('productoTerminado');
    const ingredientsContainer = document.getElementById('ingredientsContainer');
    const addIngredientBtn = document.getElementById('addIngredientBtn');
    const totalPorcentajeSpan = document.getElementById('totalPorcentaje');
    const totalPesoCalculadoSpan = document.getElementById('totalPesoCalculado');

    // Modal de detalle
    const modalDetalleOverlay = document.getElementById('modalDetalleOverlay');
    const modalDetalleClose = document.getElementById('modalDetalleClose');
    const modalDetalleCancel = document.getElementById('modalDetalleCancel');
    const modalDetalleTitle = document.getElementById('modalDetalleTitle');
    const detalleNombre = document.getElementById('detalleNombre');
    const detalleEstado = document.getElementById('detalleEstado');
    const detalleBatch = document.getElementById('detalleBatch');
    const detalleUnidades = document.getElementById('detalleUnidades');
    const detalleContenidoNeto = document.getElementById('detalleContenidoNeto');
    const detalleProducto = document.getElementById('detalleProducto');
    const detalleObservaciones = document.getElementById('detalleObservaciones');
    const detalleIngredientesBody = document.getElementById('detalleIngredientesBody');
    const detalleDescargarBtn = document.getElementById('detalleDescargarBtn');

    // Botón exportar (ya existe en el HTML)
    const exportBtn = document.getElementById('exportBtn');

    // Verificar elementos críticos
    console.log('🔍 Elementos DOM:', {
        tbody: !!tbody,
        modalOverlay: !!modalOverlay,
        modalDetalleOverlay: !!modalDetalleOverlay,
        form: !!form,
        productoTerminadoSelect: !!productoTerminadoSelect
    });

    if (!tbody) {
        console.error('❌ tbody no encontrado');
        return;
    }

    // Desactivar validación HTML5 nativa
    if (form) form.setAttribute('novalidate', 'novalidate');

    // --- Auxiliares ---
    function getEstadoLabel(estado) {
        const map = {
            activo: { label: 'Activo', class: 'status-activo' },
            inactivo: { label: 'Inactivo', class: 'status-inactivo' }
        };
        return map[estado] || { label: estado, class: '' };
    }

    function getProductoNombre(id) {
        if (!productos || productos.length === 0) return 'Sin productos';
        const p = productos.find(pr => pr.id === id);
        return p ? p.nombre : 'Desconocido';
    }

    // ============================================
    // POPULAR SELECT DE PRODUCTO TERMINADO
    // ============================================
    function populateProductoTerminadoSelect() {
        const select = productoTerminadoSelect;
        if (!select) {
            console.error('❌ Select de producto terminado no encontrado');
            return;
        }
        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccionar</option>';

        if (!productos || productos.length === 0) {
            console.warn('⚠️ No hay productos disponibles para mostrar');
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '⚠️ No hay productos registrados';
            opt.disabled = true;
            select.appendChild(opt);
            return;
        }

        const terminados = productos.filter(p => {
            const cat = (p.categoria || '').trim().toLowerCase();
            return cat === 'producto terminado' || cat === 'producto_terminado';
        });

        console.log(`📦 Productos terminados encontrados: ${terminados.length}`);

        if (terminados.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '⚠️ No hay productos terminados registrados';
            opt.disabled = true;
            select.appendChild(opt);
        } else {
            terminados.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.nombre + (p.cantidad !== undefined ? ` (Stock: ${p.cantidad})` : '');
                select.appendChild(opt);
            });
        }

        if (currentValue) {
            const exists = Array.from(select.options).some(o => o.value === currentValue);
            if (exists) select.value = currentValue;
        }
    }

    // ============================================
    // CARGA DE DATOS
    // ============================================
    async function loadData() {
        console.log('🔄 Cargando datos...');
        try {
            const [formulasData, productosData] = await Promise.all([
                getFormulas(),
                getProductos()
            ]);
            console.log('📦 Datos recibidos - Fórmulas:', formulasData ? formulasData.length : 0);
            console.log('📦 Datos recibidos - Productos:', productosData ? productosData.length : 0);

            if (formulasData) formulas = formulasData;
            else formulas = [];

            if (productosData) {
                productos = productosData;
                populateProductoTerminadoSelect();
            } else {
                productos = [];
            }

            renderTable();
            populateAllProductSelects();
            console.log('✅ Datos cargados correctamente');
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            alert('Error al cargar los datos. Intenta recargar la página.');
        }
    }

    // --- Renderizar tabla ---
    function renderTable() {
        console.log('🖌️ Renderizando tabla...');
        let filtered = [...formulas];
        const search = searchInput.value.trim().toLowerCase();
        if (search) {
            filtered = filtered.filter(f =>
                f.nombre.toLowerCase().includes(search) ||
                f.id.toString().includes(search)
            );
        }
        filtered.sort((a, b) => b.id - a.id);

        tbody.innerHTML = '';
        filtered.forEach(f => {
            const estado = getEstadoLabel(f.estado);
            const ingredientesStr = (f.ingredientes || []).map(i => getProductoNombre(i.materia_prima_id)).join(', ');
            const productoTerminado = f.producto_terminado_id ? getProductoNombre(f.producto_terminado_id) : '-';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${f.id}</strong></td>
                <td>${f.nombre}</td>
                <td>${f.tamano_batch}</td>
                <td>${f.unidades_batch || '-'}</td>
                <td>${f.contenido_neto || '-'}</td>
                <td>${productoTerminado}</td>
                <td>${ingredientesStr || 'Sin ingredientes'}</td>
                <td><span class="status-badge ${estado.class}">${estado.label}</span></td>
                <td>
                    <button class="action-btn view" data-id="${f.id}" title="Ver detalle"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" data-id="${f.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${f.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                    <button class="action-btn produce" data-id="${f.id}" title="Producir lote"><i class="fas fa-flask"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        formulaCountSpan.textContent = filtered.length;
        updateSummaryCards();
        console.log('✅ Tabla renderizada, filas:', filtered.length);
    }

    // --- Actualizar resúmenes ---
    function updateSummaryCards() {
        totalFormulasSpan.textContent = formulas.length;
        const activas = formulas.filter(f => f.estado === 'activo').length;
        activeFormulasSpan.textContent = activas;
        const allIngredients = new Set();
        formulas.forEach(f => {
            (f.ingredientes || []).forEach(i => allIngredients.add(i.materia_prima_id));
        });
        uniqueIngredientsSpan.textContent = allIngredients.size;
        if (formulas.length > 0) {
            const avg = formulas.reduce((sum, f) => sum + (f.tamano_batch || 0), 0) / formulas.length;
            avgBatchSpan.textContent = avg.toFixed(1);
        } else {
            avgBatchSpan.textContent = '0';
        }
    }

    // ============================================
    // FUNCIÓN PARA OBTENER FÓRMULA (local o API)
    // ============================================
    async function obtenerFormula(id) {
        let formula = formulas.find(f => f.id === id);
        if (formula) return formula;

        console.warn(`⚠️ Fórmula ${id} no encontrada localmente, cargando desde API...`);
        try {
            formula = await getFormula(id);
            if (formula) {
                formulas.push(formula);
                console.log(`✅ Fórmula ${id} cargada desde API`);
            }
            return formula;
        } catch (error) {
            console.error(`❌ Error al cargar fórmula ${id} desde API:`, error);
            return null;
        }
    }

    // ============================================
    // ACCIONES (Visualizar, Editar, Eliminar, Producir)
    // ============================================

    // --- Ver detalle ---
    async function abrirDetalle(id) {
        console.log('👁️ abrirDetalle llamado con ID:', id);
        if (!modalDetalleOverlay) {
            console.error('❌ modalDetalleOverlay no encontrado');
            alert('Error: Modal de detalle no encontrado');
            return;
        }

        const formula = await obtenerFormula(id);
        if (!formula) {
            alert('❌ No se pudo obtener la fórmula');
            return;
        }

        formulaActualDetalle = formula;

        modalDetalleTitle.textContent = 'Detalle de fórmula #' + formula.id;
        detalleNombre.textContent = formula.nombre;
        detalleEstado.textContent = formula.estado;
        detalleBatch.textContent = formula.tamano_batch + ' kg';
        detalleUnidades.textContent = formula.unidades_batch || '0';
        detalleContenidoNeto.textContent = formula.contenido_neto ? formula.contenido_neto + ' kg' : '-';
        detalleProducto.textContent = formula.producto_terminado_id ? getProductoNombre(formula.producto_terminado_id) : 'No asignado';
        detalleObservaciones.textContent = formula.observaciones || 'Sin observaciones';

        detalleIngredientesBody.innerHTML = '';
        if (formula.ingredientes && formula.ingredientes.length > 0) {
            formula.ingredientes.forEach(ing => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${getProductoNombre(ing.materia_prima_id)}</td>
                    <td>${ing.porcentaje}%</td>
                    <td>${ing.cantidad_batch} kg</td>
                `;
                detalleIngredientesBody.appendChild(tr);
            });
        } else {
            detalleIngredientesBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">No hay ingredientes registrados</td></tr>';
        }

        modalDetalleOverlay.classList.add('open');
        console.log('✅ Modal de detalle abierto');
    }

    // --- Editar ---
    async function openEditModal(id) {
        console.log('✏️ Abriendo modal de edición para ID:', id);
        if (!modalOverlay) {
            console.error('❌ modalOverlay no encontrado');
            return;
        }

        const formula = await obtenerFormula(id);
        if (!formula) {
            alert('❌ No se pudo obtener la fórmula para editar');
            return;
        }

        modalTitle.textContent = 'Editar fórmula #' + id;
        editIdInput.value = id;
        nombreInput.value = formula.nombre;
        estadoFormulaSelect.value = formula.estado;
        tamanoBatchInput.value = formula.tamano_batch;
        unidadesBatchInput.value = formula.unidades_batch;
        contenidoNetoInput.value = formula.contenido_neto;
        observacionesInput.value = formula.observaciones || '';
        productoTerminadoSelect.value = formula.producto_terminado_id || '';
        ingredientsContainer.innerHTML = '';
        contadorIngredientes = 0;
        if ((formula.ingredientes || []).length === 0) {
            addIngredientRow();
        } else {
            formula.ingredientes.forEach(ing => {
                addIngredientRow(ing.materia_prima_id, ing.porcentaje, ing.cantidad_batch);
            });
        }
        modalOverlay.classList.add('open');
        calcularCantidades();
        console.log('✅ Modal de edición abierto');
    }

    // --- Eliminar ---
    async function deleteFormula(id) {
        try {
            const result = await window.deleteFormula(id);
            if (result) {
                alert('✅ Fórmula eliminada.');
                loadData();
            }
        } catch (error) {
            alert('❌ Error al eliminar la fórmula: ' + error.message);
        }
    }

    // --- Producir lote ---
    async function producirFormula(id, batchSize) {
        try {
            const response = await fetch('../api/index.php?action=producir', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ formula_id: id, batch_size: batchSize })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al producir');
            }
            alert('✅ Producción exitosa. Se ha actualizado el inventario.');
            loadData();
        } catch (error) {
            alert('❌ Error al producir: ' + error.message);
        }
    }

    let formulaActualDetalle = null;

    // --- Descargar CSV del detalle ---
    function descargarFormulaCSV() {
        const formula = formulaActualDetalle;
        if (!formula) {
            alert('No hay fórmula seleccionada');
            return;
        }

        let csv = 'FÓRMULA\n';
        csv += `ID,${formula.id}\n`;
        csv += `Nombre,${formula.nombre}\n`;
        csv += `Estado,${formula.estado}\n`;
        csv += `Tamaño Batch (kg),${formula.tamano_batch}\n`;
        csv += `Unidades por batch,${formula.unidades_batch || 0}\n`;
        csv += `Contenido Neto (kg),${formula.contenido_neto || 0}\n`;
        csv += `Producto Terminado,${formula.producto_terminado_id ? getProductoNombre(formula.producto_terminado_id) : 'No asignado'}\n`;
        csv += `Observaciones,${formula.observaciones || ''}\n`;
        csv += '\nINGREDIENTES\n';
        csv += 'Materia Prima,Porcentaje (%),Cantidad en Batch (kg)\n';
        if (formula.ingredientes && formula.ingredientes.length > 0) {
            formula.ingredientes.forEach(ing => {
                const nombreMP = getProductoNombre(ing.materia_prima_id);
                csv += `${nombreMP},${ing.porcentaje},${ing.cantidad_batch}\n`;
            });
        } else {
            csv += 'Sin ingredientes,,\n';
        }

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Formula_${formula.id}_${formula.nombre.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    // ============================================
    // DELEGACIÓN DE EVENTOS (TODOS LOS BOTONES)
    // ============================================
    tbody.addEventListener('click', async function (e) {
        const target = e.target.closest('.action-btn');
        console.log('🖱️ Click en tbody, target:', target);
        if (!target) return;

        const id = parseInt(target.dataset.id);
        console.log('📌 ID del botón:', id, 'Clases:', target.classList);
        if (isNaN(id)) return;

        if (target.classList.contains('view')) {
            console.log('👁️ Acción: Ver detalle');
            await abrirDetalle(id);
        } else if (target.classList.contains('edit')) {
            console.log('✏️ Acción: Editar');
            await openEditModal(id);
        } else if (target.classList.contains('delete')) {
            console.log('🗑️ Acción: Eliminar');
            if (confirm('¿Eliminar la fórmula #' + id + '?')) {
                await deleteFormula(id);
            }
        } else if (target.classList.contains('produce')) {
            console.log('🔬 Acción: Producir lote');
            const formula = await obtenerFormula(id);
            if (!formula) {
                alert('❌ No se pudo obtener la fórmula para producción.');
                return;
            }
            const batchSize = prompt('Tamaño del lote a producir (kg):', formula.tamano_batch);
            if (batchSize === null || isNaN(batchSize) || parseFloat(batchSize) <= 0) {
                console.log('⏹️ Producción cancelada o valor inválido');
                return;
            }
            await producirFormula(id, parseFloat(batchSize));
        }
    });

    // ============================================
    // FORMULARIO DE EDICIÓN (guardar)
    // ============================================
    function getFormData() {
        const nombre = nombreInput.value.trim();
        const estado = estadoFormulaSelect.value;
        const tamano_batch = parseFloat(tamanoBatchInput.value) || 0;
        const unidades_batch = parseInt(unidadesBatchInput.value) || 0;
        const contenido_neto = parseFloat(contenidoNetoInput.value) || 0;
        const observaciones = observacionesInput.value.trim();
        const producto_terminado_id = parseInt(productoTerminadoSelect.value) || 0;

        const ingredientes = [];
        document.querySelectorAll('#ingredientsContainer .item-row').forEach(row => {
            const mpSelect = row.querySelector('.ingrediente-mp');
            const porcentajeInput = row.querySelector('.ingrediente-porcentaje');
            if (mpSelect && porcentajeInput) {
                const mpId = parseInt(mpSelect.value);
                const porcentaje = parseFloat(porcentajeInput.value) || 0;
                if (mpId > 0 && porcentaje > 0) {
                    const cantidad = (porcentaje / 100) * tamano_batch;
                    ingredientes.push({
                        materia_prima_id: mpId,
                        porcentaje: porcentaje,
                        cantidad_batch: cantidad
                    });
                }
            }
        });

        return {
            nombre,
            estado,
            tamano_batch,
            unidades_batch,
            contenido_neto,
            observaciones,
            producto_terminado_id,
            ingredientes
        };
    }

    async function submitForm(e) {
        e.preventDefault();
        console.log('📤 Enviando formulario...');
        const data = getFormData();
        console.log('📋 Datos del formulario:', data);

        if (!data.nombre) {
            alert('❌ El nombre de la fórmula es obligatorio.');
            return;
        }
        if (data.tamano_batch <= 0) {
            alert('❌ El tamaño del batch debe ser mayor a 0.');
            return;
        }
        if (data.ingredientes.length === 0) {
            alert('❌ Debes agregar al menos un ingrediente con materia prima y porcentaje > 0.');
            return;
        }

        const totalPorc = data.ingredientes.reduce((sum, i) => sum + i.porcentaje, 0);
        if (Math.abs(totalPorc - 100) > 0.01) {
            if (!confirm(`⚠️ El total de porcentajes es ${totalPorc.toFixed(2)}%. ¿Deseas guardar de todos modos?`)) {
                return;
            }
        }

        const editId = parseInt(editIdInput.value);
        try {
            if (editId) {
                await window.updateFormula(editId, data);
            } else {
                await window.createFormula(data);
            }
            closeModal();
            loadData();
        } catch (error) {
            console.error('❌ Error en submit:', error);
            alert('❌ Error al guardar: ' + error.message);
        }
    }

    function openAddModal() {
        console.log('➕ Abriendo modal para nueva fórmula');
        if (!modalOverlay) {
            console.error('❌ modalOverlay no encontrado');
            return;
        }
        modalTitle.textContent = 'Nueva fórmula';
        editIdInput.value = '';
        form.reset();
        ingredientsContainer.innerHTML = '';
        contadorIngredientes = 0;
        addIngredientRow();
        tamanoBatchInput.value = '30';
        unidadesBatchInput.value = '1000';
        contenidoNetoInput.value = '0.008';
        estadoFormulaSelect.value = 'activo';
        productoTerminadoSelect.value = '';
        modalOverlay.classList.add('open');
        calcularCantidades();
        console.log('✅ Modal de nueva fórmula abierto');
    }

    function closeModal() {
        if (modalOverlay) modalOverlay.classList.remove('open');
        form.reset();
        editIdInput.value = '';
        ingredientsContainer.innerHTML = '';
    }

    // --- Ingredientes ---
    function populateProductSelects(selectElement) {
        selectElement.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Seleccionar materia prima';
        selectElement.appendChild(defaultOpt);
        if (productos && productos.length > 0) {
            const materiasPrimas = productos.filter(p =>
                p.categoria === 'Materia-P' || p.categoria === 'Materia Prima'
            );
            if (materiasPrimas.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = '⚠️ No hay materias primas registradas';
                opt.disabled = true;
                selectElement.appendChild(opt);
            } else {
                materiasPrimas.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.nombre + (p.cantidad !== undefined ? ' (Stock: ' + p.cantidad + ')' : '');
                    selectElement.appendChild(opt);
                });
            }
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '⚠️ No hay productos registrados';
            opt.disabled = true;
            selectElement.appendChild(opt);
        }
    }

    function populateAllProductSelects() {
        document.querySelectorAll('.ingrediente-mp').forEach(sel => {
            populateProductSelects(sel);
        });
    }

    function createIngredientRow(mpId = '', porcentaje = '', cantidad = '') {
        const template = document.getElementById('ingredientRowTemplate');
        if (!template) {
            console.error('❌ Template de ingrediente no encontrado');
            return null;
        }
        const row = template.cloneNode(true);
        row.style.display = 'flex';
        row.id = '';
        const select = row.querySelector('.ingrediente-mp');
        select.name = 'ingrediente_mp_' + (++contadorIngredientes);
        populateProductSelects(select);
        if (mpId) select.value = mpId;

        const porcentajeInput = row.querySelector('.ingrediente-porcentaje');
        porcentajeInput.value = porcentaje;
        const cantidadInput = row.querySelector('.ingrediente-cantidad');
        cantidadInput.value = cantidad;

        const updateRow = function () {
            calcularCantidades();
        };
        select.addEventListener('change', updateRow);
        porcentajeInput.addEventListener('input', updateRow);
        const removeBtn = row.querySelector('.item-remove');
        removeBtn.addEventListener('click', function () {
            if (ingredientsContainer.children.length > 1) {
                row.remove();
                calcularCantidades();
            } else {
                alert('Debe haber al menos un ingrediente.');
            }
        });
        return row;
    }

    function addIngredientRow(mpId = '', porcentaje = '', cantidad = '') {
        const row = createIngredientRow(mpId, porcentaje, cantidad);
        if (row) {
            ingredientsContainer.appendChild(row);
            calcularCantidades();
        }
    }

    function calcularCantidades() {
        const tamanoBatch = parseFloat(tamanoBatchInput.value) || 0;
        const rows = document.querySelectorAll('#ingredientsContainer .item-row');
        let totalPorcentaje = 0;
        rows.forEach(row => {
            const porcentajeInput = row.querySelector('.ingrediente-porcentaje');
            const cantidadInput = row.querySelector('.ingrediente-cantidad');
            const porcentaje = parseFloat(porcentajeInput.value) || 0;
            totalPorcentaje += porcentaje;
            const cantidad = (porcentaje / 100) * tamanoBatch;
            cantidadInput.value = cantidad.toFixed(3);
        });
        totalPorcentajeSpan.textContent = totalPorcentaje.toFixed(2) + '%';
        totalPesoCalculadoSpan.textContent = tamanoBatch.toFixed(2) + ' kg';
    }

    // --- Cerrar modal de detalle ---
    function cerrarDetalle() {
        if (modalDetalleOverlay) modalDetalleOverlay.classList.remove('open');
    }

    // ============================================
    // EXPORTACIÓN A CSV Y PDF
    // ============================================
    function exportarFormulas() {
        // Obtener datos de la tabla visible (con filtros aplicados)
        const rows = tbody.querySelectorAll('tr');
        const headers = ['ID', 'Nombre', 'Batch (kg)', 'Unidades', 'Contenido Neto', 'Producto Terminado', 'Ingredientes', 'Estado'];
        const data = [];
        rows.forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length > 0) {
                const rowData = {};
                // Los índices coinciden con el orden de la tabla
                rowData['ID'] = cells[0].textContent.trim();
                rowData['Nombre'] = cells[1].textContent.trim();
                rowData['Batch (kg)'] = cells[2].textContent.trim();
                rowData['Unidades'] = cells[3].textContent.trim();
                rowData['Contenido Neto'] = cells[4].textContent.trim();
                rowData['Producto Terminado'] = cells[5].textContent.trim();
                rowData['Ingredientes'] = cells[6].textContent.trim();
                rowData['Estado'] = cells[7].textContent.trim();
                data.push(rowData);
            }
        });

        if (data.length === 0) {
            alert('No hay fórmulas para exportar.');
            return;
        }

        // CSV
        const csv = convertToCSV(data, headers);
        downloadFile(csv, 'formulas.csv', 'text/csv;charset=utf-8;');

        // PDF
        generatePDF(data, headers, 'formulas');
    }

    // Funciones auxiliares de exportación (reutilizadas)
    function convertToCSV(data, headers) {
        let csv = headers.join(',') + '\n';
        data.forEach(row => {
            const values = headers.map(h => {
                let val = row[h] || '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            csv += values.join(',') + '\n';
        });
        return csv;
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob(['\uFEFF' + content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    function generatePDF(data, headers, filename) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text('Reporte de ' + filename.charAt(0).toUpperCase() + filename.slice(1), 14, 22);
        doc.setFontSize(10);
        doc.text('Fecha: ' + new Date().toLocaleDateString(), 14, 30);

        const tableData = data.map(row => headers.map(h => row[h] || ''));
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 35,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [26, 42, 58] }
        });

        doc.save(filename + '.pdf');
    }

    // Asignar evento al botón Exportar (ya existe en HTML)
    if (exportBtn) {
        exportBtn.addEventListener('click', exportarFormulas);
    }

    // ============================================
    // EVENTOS COMUNES (sidebar, perfil, logout)
    // ============================================
    function setupCommon() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', function () {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });

        const profileBtn = document.getElementById('profileBtn');
        const dropdownMenu = document.getElementById('dropdownMenu');
        profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('open');
        });
        document.addEventListener('click', function (e) {
            if (!dropdownMenu.contains(e.target) && !profileBtn.contains(e.target)) {
                dropdownMenu.classList.remove('open');
            }
        });

        document.getElementById('notifBtn').addEventListener('click', function () {
            const badge = this.querySelector('.notif-badge');
            if (badge) badge.style.display = 'none';
            alert('📬 Notificaciones marcadas como leídas.');
        });

        const logoutBtns = [
            document.getElementById('logoutBtn'),
            document.getElementById('logoutDropdown')
        ];
        logoutBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (confirm('¿Cerrar sesión?')) {
                        logout();
                    }
                });
            }
        });
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    setupCommon();

    // Eventos de modal de edición
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });
    }
    if (openAddBtn) openAddBtn.addEventListener('click', openAddModal);
    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', function () {
            addIngredientRow();
        });
    }
    if (form) form.addEventListener('submit', submitForm);
    if (tamanoBatchInput) tamanoBatchInput.addEventListener('input', calcularCantidades);
    if (searchInput) searchInput.addEventListener('input', renderTable);

    // Eventos de modal de detalle
    if (modalDetalleClose) modalDetalleClose.addEventListener('click', cerrarDetalle);
    if (modalDetalleCancel) modalDetalleCancel.addEventListener('click', cerrarDetalle);
    if (modalDetalleOverlay) {
        modalDetalleOverlay.addEventListener('click', function (e) {
            if (e.target === this) cerrarDetalle();
        });
    }
    if (detalleDescargarBtn) detalleDescargarBtn.addEventListener('click', descargarFormulaCSV);

    // Mostrar nombre de usuario en el topbar
    const userData = getCurrentUser();
    const userNameSpan = document.getElementById('userNameDisplay');
    if (userData && userData.nombre && userNameSpan) {
        userNameSpan.textContent = userData.nombre.toUpperCase();
    }

    // Cargar datos
    loadData();
});