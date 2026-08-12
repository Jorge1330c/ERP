// ============================================
// public/inventario.js - Módulo de Inventario (con gráfico mejorado)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔵 Iniciando módulo de inventario');

    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user && user.permisos && !user.permisos.includes('inventario')) {
        alert('Acceso denegado: no tienes permiso para Inventario.');
        window.location.href = 'index.html';
        return;
    }

    let productos = [];

    // --- Elementos DOM ---
    const tbody = document.getElementById('productTableBody');
    const totalProductsSpan = document.getElementById('totalProducts');
    const totalValueSpan = document.getElementById('totalValue');
    const lowStockCountSpan = document.getElementById('lowStockCount');
    const categoryCountSpan = document.getElementById('categoryCount');
    const productCountSpan = document.getElementById('productCount');
    const categoryChart = document.getElementById('categoryChart');
    const chartMetricSelect = document.getElementById('chartMetric');
    const chartMetricLabel = document.getElementById('chartMetricLabel');

    const searchInput = document.getElementById('globalSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockFilter = document.getElementById('stockFilter');
    const estadoFilter = document.getElementById('estadoFilter');
    const sortFilter = document.getElementById('sortFilter');
    const applyBtn = document.getElementById('applyFilters');
    const resetBtn = document.getElementById('resetFilters');
    const openAddBtn = document.getElementById('openAddModal');

    // --- Elementos del modal de producto ---
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const editIdInput = document.getElementById('editId');
    const form = document.getElementById('productoForm');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const estadoSelect = document.getElementById('estado');

    // --- Elementos del modal de trazabilidad ---
    const modalTrazOverlay = document.getElementById('modalTrazabilidadOverlay');
    const modalTrazClose = document.getElementById('modalTrazabilidadClose');
    const modalTrazCancel = document.getElementById('modalTrazabilidadCancel');
    const modalTrazTitle = document.getElementById('modalTrazabilidadTitle');
    const trazProductoNombre = document.getElementById('trazabilidadProductoNombre');
    const trazProductoCategoria = document.getElementById('trazabilidadProductoCategoria');
    const trazProductoEstado = document.getElementById('trazabilidadProductoEstado');

    const trazComprasBody = document.getElementById('trazComprasBody');
    const trazFormulasMPBody = document.getElementById('trazFormulasMPBody');
    const trazFormulasPTBody = document.getElementById('trazFormulasPTBody');
    const trazPedidosBody = document.getElementById('trazPedidosBody');
    const trazComprobantesBody = document.getElementById('trazComprobantesBody');

    let filtros = { search: '', category: '', stock: '', estado: '', sort: 'nombre' };
    let chartMetric = 'cantidad';

    // --- Auxiliares ---
    function getStockStatus(cantidad) {
        if (cantidad <= 5) return 'bajo';
        if (cantidad <= 50) return 'normal';
        return 'exceso';
    }

    function getStatusLabel(cantidad) {
        const status = getStockStatus(cantidad);
        const map = {
            bajo: { label: 'Stock bajo', class: 'status-bajo' },
            normal: { label: 'Normal', class: 'status-normal' },
            exceso: { label: 'Exceso', class: 'status-exceso' }
        };
        return map[status];
    }

    function formatCurrency(value) {
        return '$ ' + Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function getEstadoLabel(estado) {
        const map = {
            activo: { label: 'Activo', class: 'status-activo' },
            inactivo: { label: 'Inactivo', class: 'status-inactivo' }
        };
        return map[estado] || { label: estado, class: '' };
    }

    // --- Poblar filtro de categorías ---
    function populateCategoryFilter() {
        const categorias = new Set(productos.map(p => p.categoria));
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="">Todas</option>';
        categorias.forEach(cat => {
            if (cat) {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                categoryFilter.appendChild(opt);
            }
        });
        categoryFilter.value = currentValue;
    }

    // --- Cargar datos ---
    async function loadData() {
        console.log('🔄 Cargando productos...');
        try {
            const data = await getProductos();
            if (data) {
                productos = data;
                console.log(`✅ Productos cargados: ${productos.length}`);
                populateCategoryFilter();
                renderTable();
                renderChart(); // <-- Se llama explícitamente después de cargar
            } else {
                console.warn('⚠️ No se recibieron productos');
                productos = [];
                renderTable();
                renderChart();
            }
        } catch (error) {
            console.error('❌ Error cargando inventario:', error);
            alert('Error al cargar los productos. Intenta recargar la página.');
        }
    }

    // --- Renderizar tabla ---
    function renderTable() {
        let filtered = [...productos];
        if (filtros.search.trim()) {
            const term = filtros.search.trim().toLowerCase();
            filtered = filtered.filter(p =>
                p.nombre.toLowerCase().includes(term) ||
                (p.codigo && p.codigo.toLowerCase().includes(term)) ||
                (p.categoria && p.categoria.toLowerCase().includes(term))
            );
        }
        if (filtros.category) {
            filtered = filtered.filter(p => p.categoria === filtros.category);
        }
        if (filtros.stock) {
            filtered = filtered.filter(p => getStockStatus(p.cantidad) === filtros.stock);
        }
        if (filtros.estado) {
            filtered = filtered.filter(p => p.estado === filtros.estado);
        }
        const sortField = filtros.sort;
        filtered.sort((a, b) => {
            if (sortField === 'nombre') return a.nombre.localeCompare(b.nombre);
            if (sortField === 'cantidad') return a.cantidad - b.cantidad;
            if (sortField === 'precio') return a.precio - b.precio;
            if (sortField === 'valor') {
                const valA = a.cantidad * a.precio;
                const valB = b.cantidad * b.precio;
                return valA - valB;
            }
            return 0;
        });

        tbody.innerHTML = '';
        filtered.forEach(p => {
            const total = p.cantidad * p.precio;
            const status = getStatusLabel(p.cantidad);
            const estado = getEstadoLabel(p.estado || 'activo');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.codigo || '-'}</strong></td>
                <td>${p.nombre}</td>
                <td>${p.categoria || 'Sin categoría'}</td>
                <td>${p.cantidad}</td>
                <td>${formatCurrency(p.precio)}</td>
                <td>${formatCurrency(total)}</td>
                <td><span class="status-badge ${estado.class}">${estado.label}</span></td>
                <td>
                    <button class="action-btn trace" data-id="${p.id}" title="Trazabilidad"><i class="fas fa-route"></i></button>
                    <button class="action-btn edit" data-id="${p.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${p.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        productCountSpan.textContent = filtered.length;
        updateSummaryCards();

        // Eventos de acciones
        tbody.querySelectorAll('.action-btn.trace').forEach(btn => {
            btn.addEventListener('click', function () {
                abrirTrazabilidad(parseInt(this.dataset.id));
            });
        });
        tbody.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                openEditModal(id);
            });
        });
        tbody.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                if (confirm('¿Eliminar el producto #' + id + '?')) {
                    deleteProducto(id);
                }
            });
        });

        // 🔥 IMPORTANTE: Actualizar el gráfico después de renderizar la tabla
        renderChart();
    }

    // --- Actualizar resúmenes ---
    function updateSummaryCards() {
        totalProductsSpan.textContent = productos.length;
        const valorTotal = productos.reduce((acc, p) => acc + (p.cantidad * p.precio), 0);
        totalValueSpan.textContent = formatCurrency(valorTotal);
        const bajoStock = productos.filter(p => getStockStatus(p.cantidad) === 'bajo').length;
        lowStockCountSpan.textContent = bajoStock;
        const categorias = new Set(productos.map(p => p.categoria));
        categoryCountSpan.textContent = categorias.size;
    }

    // ============================================
    // GRÁFICO DE STOCK POR CATEGORÍA (MEJORADO)
    // ============================================
    function renderChart() {
        console.log('📊 Renderizando gráfico...');

        // --- FORZAR VISIBILIDAD (parche) ---
        if (categoryChart) {
            categoryChart.style.minHeight = '200px';
            categoryChart.style.border = '1px dashed #7b9cff';
            categoryChart.style.padding = '0.5rem';
            categoryChart.style.background = 'var(--bg-card)';
        }

        // Obtener datos filtrados
        let filtered = [...productos];
        if (filtros.search.trim()) {
            const term = filtros.search.trim().toLowerCase();
            filtered = filtered.filter(p =>
                p.nombre.toLowerCase().includes(term) ||
                (p.codigo && p.codigo.toLowerCase().includes(term)) ||
                (p.categoria && p.categoria.toLowerCase().includes(term))
            );
        }
        if (filtros.category) {
            filtered = filtered.filter(p => p.categoria === filtros.category);
        }
        if (filtros.stock) {
            filtered = filtered.filter(p => getStockStatus(p.cantidad) === filtros.stock);
        }
        if (filtros.estado) {
            filtered = filtered.filter(p => p.estado === filtros.estado);
        }

        console.log(`📊 Productos filtrados para gráfico: ${filtered.length}`);

        // Agrupar por categoría
        const grupos = {};
        filtered.forEach(p => {
            const cat = p.categoria || 'Sin categoría';
            if (!grupos[cat]) grupos[cat] = 0;
            const valor = chartMetric === 'valor' ? p.cantidad * p.precio : p.cantidad;
            grupos[cat] += valor;
        });

        const categorias = Object.keys(grupos);
        const maxVal = Math.max(...Object.values(grupos), 1);

        // Limpiar contenedor
        categoryChart.innerHTML = '';

        // Si no hay datos, mostrar mensaje
        if (categorias.length === 0 || filtered.length === 0) {
            categoryChart.innerHTML = `
                <div style="text-align:center; padding:2rem; color:var(--text-muted);">
                    <i class="fas fa-chart-bar" style="font-size:2rem; display:block; margin-bottom:0.5rem;"></i>
                    No hay datos para mostrar en el gráfico
                </div>
            `;
            chartMetricLabel.textContent = chartMetric === 'valor' ? 'Valor ($)' : 'Cantidad';
            return;
        }

        // Colores para las barras
        const colores = ['', 'orange', 'green', 'purple', 'pink', 'teal', 'red', 'yellow', 'indigo', 'cyan'];
        let colorIndex = 0;

        // Generar barras
        categorias.forEach(cat => {
            const valor = grupos[cat];
            const porcentaje = (valor / maxVal) * 100;
            const colorClass = colores[colorIndex % colores.length];
            colorIndex++;
            const label = chartMetric === 'valor' ? formatCurrency(valor) : valor;

            const row = document.createElement('div');
            row.className = 'bar-row';
            row.style.width = '100%'; // <-- FORZAR ANCHO COMPLETO

            row.innerHTML = `
                <span class="bar-label" title="${cat}">${cat}</span>
                <div class="bar-track">
                    <div class="bar-fill ${colorClass}" style="width: ${Math.max(porcentaje, 5)}%;"></div>
                </div>
                <span class="bar-value">${label}</span>
            `;
            categoryChart.appendChild(row);
        });

        chartMetricLabel.textContent = chartMetric === 'valor' ? 'Valor ($)' : 'Cantidad';
        console.log(`✅ Gráfico actualizado con ${categorias.length} categorías`);
    }

    // --- Filtros ---
    function applyFilters() {
        filtros.search = searchInput.value;
        filtros.category = categoryFilter.value;
        filtros.stock = stockFilter.value;
        filtros.estado = estadoFilter.value;
        filtros.sort = sortFilter.value;
        renderTable(); // Esto llama a renderChart internamente
    }

    function resetFilters() {
        searchInput.value = '';
        categoryFilter.value = '';
        stockFilter.value = '';
        estadoFilter.value = '';
        sortFilter.value = 'nombre';
        filtros = { search: '', category: '', stock: '', estado: '', sort: 'nombre' };
        renderTable();
    }

    // --- CRUD ---
    async function deleteProducto(id) {
        try {
            console.log(`🗑️ Eliminando producto ${id}...`);
            const result = await deleteProducto(id);
            if (result) {
                alert('✅ Producto eliminado correctamente.');
                loadData();
            }
        } catch (error) {
            console.error('❌ Error al eliminar:', error);
            alert('❌ Error al eliminar: ' + error.message);
        }
    }

    // --- Modal de producto ---
    function openAddModal() {
        console.log('➕ Abriendo modal para nuevo producto');
        modalTitle.textContent = 'Nuevo producto';
        editIdInput.value = '';
        form.reset();
        document.getElementById('codigo').value = '';
        document.getElementById('nombre').value = '';
        document.getElementById('categoria').value = '';
        document.getElementById('cantidad').value = 0;
        document.getElementById('precio').value = 0;
        estadoSelect.value = 'activo';
        modalOverlay.classList.add('open');
    }

    function openEditModal(id) {
        const producto = productos.find(p => p.id === id);
        if (!producto) {
            alert('Producto no encontrado');
            return;
        }
        modalTitle.textContent = 'Editar producto';
        editIdInput.value = id;
        document.getElementById('codigo').value = producto.codigo || '';
        document.getElementById('nombre').value = producto.nombre;
        document.getElementById('categoria').value = producto.categoria || '';
        document.getElementById('cantidad').value = producto.cantidad;
        document.getElementById('precio').value = producto.precio;
        estadoSelect.value = producto.estado || 'activo';
        modalOverlay.classList.add('open');
    }

    function closeModal() {
        modalOverlay.classList.remove('open');
        form.reset();
        editIdInput.value = '';
    }

    function getFormData() {
        return {
            codigo: document.getElementById('codigo').value.trim(),
            nombre: document.getElementById('nombre').value.trim(),
            categoria: document.getElementById('categoria').value,
            cantidad: parseFloat(document.getElementById('cantidad').value) || 0,
            precio: parseFloat(document.getElementById('precio').value) || 0,
            estado: estadoSelect.value
        };
    }

    async function submitForm(e) {
        e.preventDefault();
        console.log('📤 Enviando formulario...');

        const data = getFormData();
        console.log('📋 Datos del producto:', data);

        if (!data.nombre) {
            alert('❌ El nombre es obligatorio.');
            return;
        }

        const editId = parseInt(editIdInput.value);
        try {
            let result;
            if (editId) {
                console.log(`✏️ Actualizando producto ${editId}...`);
                result = await updateProducto(editId, data);
            } else {
                console.log('➕ Creando nuevo producto...');
                result = await createProducto(data);
            }

            if (result) {
                alert(editId ? '✅ Producto actualizado correctamente.' : '✅ Producto creado correctamente.');
                closeModal();
                loadData();
            } else {
                alert('❌ No se pudo guardar el producto. Revisa la consola para más detalles.');
            }
        } catch (error) {
            console.error('❌ Error en submit:', error);
            alert('❌ Error al guardar: ' + error.message);
        }
    }

    // ============================================
    // TRAZABILIDAD DEL PRODUCTO
    // ============================================
    async function abrirTrazabilidad(id) {
        try {
            console.log(`🔍 Cargando trazabilidad del producto ${id}...`);
            const data = await getTrazabilidad(id);
            if (!data) {
                alert('No se pudo obtener la trazabilidad del producto.');
                return;
            }
            mostrarTrazabilidad(data);
            modalTrazOverlay.classList.add('open');
        } catch (error) {
            console.error('❌ Error al cargar trazabilidad:', error);
            alert('Error al cargar la trazabilidad: ' + error.message);
        }
    }

    function mostrarTrazabilidad(data) {
        const producto = data.producto;
        const traz = data.trazabilidad;

        modalTrazTitle.textContent = 'Trazabilidad del producto #' + producto.id;
        trazProductoNombre.textContent = producto.nombre;
        trazProductoCategoria.textContent = 'Categoría: ' + (producto.categoria || 'Sin categoría');
        trazProductoEstado.textContent = 'Estado: ' + (producto.estado || 'activo');

        llenarTablaTraz(trazComprasBody, traz.compras, ['id', 'proveedor', 'fecha', 'cantidad', 'precio_unitario', 'subtotal', 'estado']);
        llenarTablaTraz(trazFormulasMPBody, traz.formulas_como_mp, ['id', 'nombre', 'estado', 'porcentaje', 'cantidad_batch']);
        llenarTablaTraz(trazFormulasPTBody, traz.formulas_como_pt, ['id', 'nombre', 'estado', 'tamano_batch', 'unidades_batch']);
        llenarTablaTraz(trazPedidosBody, traz.pedidos, ['id', 'cliente', 'fecha', 'cantidad', 'precio_unitario', 'estado']);
        llenarTablaTraz(trazComprobantesBody, traz.comprobantes, ['numero', 'tipo', 'cliente', 'fecha', 'cantidad', 'precio_unitario', 'estado']);

        document.querySelectorAll('.tab-panel-traz').forEach(p => p.classList.remove('active'));
        document.getElementById('traz-compras').classList.add('active');
        document.querySelectorAll('.tab-btn[data-traz-tab]').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-traz-tab="compras"]').classList.add('active');
    }

    function llenarTablaTraz(tbody, data, columnas) {
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="' + columnas.length + '" style="text-align:center;color:var(--text-muted);">No hay registros</td></tr>';
            return;
        }
        data.forEach(item => {
            const tr = document.createElement('tr');
            let html = '';
            columnas.forEach(col => {
                let valor = item[col] !== undefined ? item[col] : '-';
                if (col === 'precio_unitario' || col === 'subtotal' || col === 'tamano_batch' || col === 'cantidad_batch') {
                    valor = typeof valor === 'number' ? valor.toFixed(2) : valor;
                }
                if (col === 'porcentaje') {
                    valor = typeof valor === 'number' ? valor.toFixed(2) + '%' : valor;
                }
                if (col === 'estado') {
                    const estadoClass = {
                        'activo': 'status-activo',
                        'inactivo': 'status-inactivo',
                        'pendiente': 'status-pendiente',
                        'completado': 'status-completado',
                        'enviado': 'status-enviado',
                        'cancelado': 'status-cancelado',
                        'recibido': 'status-completado',
                        'emitido': 'status-completado',
                        'anulado': 'status-cancelado'
                    }[valor] || '';
                    html += `<td><span class="status-badge ${estadoClass}">${valor}</span></td>`;
                } else {
                    html += `<td>${valor}</td>`;
                }
            });
            tr.innerHTML = html;
            tbody.appendChild(tr);
        });
    }

    function cerrarTrazabilidad() {
        modalTrazOverlay.classList.remove('open');
    }

    // --- Eventos de pestañas de trazabilidad ---
    document.querySelectorAll('.tab-btn[data-traz-tab]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn[data-traz-tab]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const target = this.dataset.trazTab;
            document.querySelectorAll('.tab-panel-traz').forEach(p => p.classList.remove('active'));
            document.getElementById('traz-' + target).classList.add('active');
        });
    });

    // --- Eventos comunes (sidebar, profile, logout) ---
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
    // EXPORTACIÓN A CSV Y PDF
    // ============================================
    function exportarInventario() {
        const tbody = document.getElementById('productTableBody');
        const headers = ['Código', 'Nombre', 'Categoría', 'Cantidad', 'Precio', 'Valor Total', 'Estado'];
        const rows = tbody.querySelectorAll('tr');
        const data = [];
        rows.forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length > 0) {
                const rowData = {};
                cells.forEach((cell, index) => {
                    rowData[headers[index] || 'col' + index] = cell.textContent.trim();
                });
                data.push(rowData);
            }
        });

        if (data.length === 0) {
            alert('No hay productos para exportar.');
            return;
        }

        const csv = convertToCSV(data, headers);
        downloadFile(csv, 'inventario.csv', 'text/csv;charset=utf-8;');
        generatePDF(data, headers, 'inventario');
    }

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

    document.getElementById('exportBtn')?.addEventListener('click', exportarInventario);

    // --- Inicialización ---
    setupCommon();

    // Eventos de filtros
    applyBtn.addEventListener('click', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    searchInput.addEventListener('input', applyFilters);

    // Evento del selector de métrica del gráfico
    chartMetricSelect.addEventListener('change', function () {
        chartMetric = this.value;
        renderChart(); // Actualizar gráfico con la nueva métrica
    });

    // Eventos del modal de producto
    openAddBtn?.addEventListener('click', openAddModal);
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });
    form.addEventListener('submit', submitForm);

    // Eventos del modal de trazabilidad
    modalTrazClose.addEventListener('click', cerrarTrazabilidad);
    modalTrazCancel.addEventListener('click', cerrarTrazabilidad);
    modalTrazOverlay.addEventListener('click', function (e) {
        if (e.target === this) cerrarTrazabilidad();
    });

    // Mostrar nombre de usuario en el topbar
    const userData = getCurrentUser();
    const userNameSpan = document.getElementById('userNameDisplay');
    if (userData && userData.nombre && userNameSpan) {
        userNameSpan.textContent = userData.nombre.toUpperCase();
    }

    loadData();
});