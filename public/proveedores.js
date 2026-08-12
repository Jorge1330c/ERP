// ============================================
// public/proveedores.js - Proveedores y Compras (CON COLUMNA PRODUCTOS Y USUARIO)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user && user.permisos && !user.permisos.includes('proveedores')) {
        alert('Acceso denegado: no tienes permiso para Proveedores.');
        window.location.href = 'index.html';
        return;
    }

    console.log('🔵 Módulo de Proveedores iniciado');

    let proveedores = [];
    let compras = [];
    let productos = [];

    // --- Elementos DOM (Proveedores) ---
    const supplierTbody = document.getElementById('supplierTableBody');
    const supplierCountSpan = document.getElementById('supplierCount');
    const totalSpan = document.getElementById('totalSuppliers');
    const activeSpan = document.getElementById('activeSuppliers');
    const pendingSpan = document.getElementById('pendingSuppliers');
    const categoryCountSpan = document.getElementById('categoryCount');

    const searchInput = document.getElementById('globalSearch');
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const applyBtn = document.getElementById('applyFilters');
    const resetBtn = document.getElementById('resetFilters');
    const openAddBtn = document.getElementById('openAddModal');

    // Modal proveedor
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const editIdInput = document.getElementById('editId');
    const supplierForm = document.getElementById('supplierForm');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');

    // --- Elementos DOM (Compras) ---
    const compraTbody = document.getElementById('compraTableBody');
    const compraCountSpan = document.getElementById('compraCount');
    const fechaDesde = document.getElementById('fechaDesde');
    const fechaHasta = document.getElementById('fechaHasta');
    const compraProveedorFilter = document.getElementById('compraProveedorFilter');
    const applyCompraFiltersBtn = document.getElementById('applyCompraFilters');
    const resetCompraFiltersBtn = document.getElementById('resetCompraFilters');
    const openAddCompraBtn = document.getElementById('openAddCompraModal');

    // Modal compra
    const modalCompraOverlay = document.getElementById('modalCompraOverlay');
    const modalCompraTitle = document.getElementById('modalCompraTitle');
    const editCompraIdInput = document.getElementById('editCompraId');
    const compraForm = document.getElementById('compraForm');
    const modalCompraClose = document.getElementById('modalCompraClose');
    const modalCompraCancel = document.getElementById('modalCompraCancel');
    const compraProveedorSelect = document.getElementById('compraProveedor');
    const compraFechaInput = document.getElementById('compraFecha');
    const compraEstadoSelect = document.getElementById('compraEstado');
    const compraItemsContainer = document.getElementById('compraItemsContainer');
    const addCompraItemBtn = document.getElementById('addCompraItemBtn');
    const totalCompraModal = document.getElementById('totalCompraModal');

    // --- Estado de filtros ---
    let filtros = { search: '', status: '', category: '' };
    let filtrosCompra = { fechaDesde: '', fechaHasta: '', proveedor: '' };

    // --- Funciones auxiliares ---
    function getEstadoLabel(estado) {
        const map = {
            activo: { label: 'Activo', class: 'status-activo' },
            inactivo: { label: 'Inactivo', class: 'status-inactivo' },
            pendiente: { label: 'Pendiente', class: 'status-pendiente' }
        };
        return map[estado] || { label: estado, class: '' };
    }

    function getCategoriasUnicas() {
        const cats = new Set(proveedores.map(p => p.categoria));
        return Array.from(cats).sort();
    }

    function populateCategoryFilter() {
        const cats = getCategoriasUnicas();
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="">Todas</option>';
        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categoryFilter.appendChild(opt);
        });
        categoryFilter.value = currentValue;
    }

    // ============================================
    // FUNCIONES PARA OBTENER ELEMENTOS (local o API)
    // ============================================
    async function obtenerProveedor(id) {
        let prov = proveedores.find(p => p.id === id);
        if (prov) return prov;
        console.warn(`⚠️ Proveedor ${id} no encontrado localmente, cargando desde API...`);
        try {
            const data = await getProveedor(id);
            if (data) {
                proveedores.push(data);
                console.log(`✅ Proveedor ${id} cargado desde API`);
                return data;
            }
            return null;
        } catch (error) {
            console.error(`❌ Error al cargar proveedor ${id}:`, error);
            return null;
        }
    }

    async function obtenerCompra(id) {
        let comp = compras.find(c => c.id === id);
        if (comp) return comp;
        console.warn(`⚠️ Compra ${id} no encontrada localmente, cargando desde API...`);
        try {
            const data = await getCompra(id);
            if (data) {
                compras.push(data);
                console.log(`✅ Compra ${id} cargada desde API`);
                return data;
            }
            return null;
        } catch (error) {
            console.error(`❌ Error al cargar compra ${id}:`, error);
            return null;
        }
    }

    // --- Cargar datos ---
    async function loadData() {
        console.log('🔄 Cargando datos...');
        try {
            const [proveedoresData, comprasData, productosData] = await Promise.all([
                getProveedores(),
                getCompras(),
                getProductos()
            ]);
            if (proveedoresData) {
                proveedores = proveedoresData;
                console.log(`✅ Proveedores cargados: ${proveedores.length}`);
            }
            if (comprasData) {
                compras = comprasData;
                console.log(`✅ Compras cargadas: ${compras.length}`);
            }
            if (productosData) {
                productos = productosData;
                console.log(`✅ Productos cargados: ${productos.length}`);
            }
            renderProveedores();
            renderCompras();
            populateCategoryFilter();
            populateCompraProveedores();
            populateProductSelects();
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            alert('Error al cargar datos. Revisa la consola para más detalles.');
        }
    }

    // --- Renderizar proveedores ---
    function renderProveedores() {
        console.log('🖌️ Renderizando proveedores');
        let filtered = [...proveedores];
        if (filtros.search.trim()) {
            const term = filtros.search.trim().toLowerCase();
            filtered = filtered.filter(p =>
                p.nombre.toLowerCase().includes(term) ||
                p.contacto.toLowerCase().includes(term) ||
                p.categoria.toLowerCase().includes(term) ||
                p.email.toLowerCase().includes(term)
            );
        }
        if (filtros.status) {
            filtered = filtered.filter(p => p.estado === filtros.status);
        }
        if (filtros.category) {
            filtered = filtered.filter(p => p.categoria === filtros.category);
        }
        filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));

        supplierTbody.innerHTML = '';
        filtered.forEach(p => {
            const estado = getEstadoLabel(p.estado);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.id}</strong></td>
                <td>${p.nombre}</td>
                <td>${p.contacto || '-'}</td>
                <td>${p.categoria}</td>
                <td>${p.telefono || '-'}</td>
                <td>${p.email || '-'}</td>
                <td><span class="status-badge ${estado.class}">${estado.label}</span></td>
                <td>
                    <button class="action-btn edit" data-id="${p.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${p.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            `;
            supplierTbody.appendChild(tr);
        });

        supplierCountSpan.textContent = filtered.length;
        updateSupplierSummary();
        console.log(`✅ Proveedores renderizados: ${filtered.length}`);
    }

    function updateSupplierSummary() {
        totalSpan.textContent = proveedores.length;
        activeSpan.textContent = proveedores.filter(p => p.estado === 'activo').length;
        pendingSpan.textContent = proveedores.filter(p => p.estado === 'pendiente').length;
        const cats = new Set(proveedores.map(p => p.categoria));
        categoryCountSpan.textContent = cats.size;
    }

    // --- CRUD Proveedores ---
    async function addSupplier(data) {
        const result = await createProveedor(data);
        if (result) loadData();
    }
    async function updateSupplier(id, data) {
        const result = await updateProveedor(id, data);
        if (result) loadData();
    }
    async function deleteSupplier(id) {
        if (!confirm('¿Eliminar el proveedor #' + id + '?')) return;
        const result = await deleteProveedor(id);
        if (result) loadData();
    }

    function getSupplierFormData() {
        return {
            nombre: document.getElementById('nombre').value.trim(),
            contacto: document.getElementById('contacto').value.trim(),
            categoria: document.getElementById('categoria').value,
            telefono: document.getElementById('telefono').value.trim(),
            email: document.getElementById('email').value.trim(),
            estado: document.getElementById('estado').value
        };
    }

    async function submitSupplierForm(e) {
        e.preventDefault();
        console.log('📤 Enviando formulario de proveedor...');
        const data = getSupplierFormData();
        console.log('📋 Datos:', data);
        if (!data.nombre || !data.categoria) {
            alert('Nombre y categoría son obligatorios.');
            return;
        }
        const editId = parseInt(editIdInput.value);
        if (editId) {
            await updateSupplier(editId, data);
        } else {
            await addSupplier(data);
        }
        closeSupplierModal();
    }

    // --- Modal Proveedor ---
    function openAddSupplierModal() {
        console.log('➕ Abriendo modal para nuevo proveedor');
        modalTitle.textContent = 'Nuevo proveedor';
        editIdInput.value = '';
        supplierForm.reset();
        document.getElementById('estado').value = 'activo';
        modalOverlay.classList.add('open');
    }

    async function openEditSupplierModal(id) {
        console.log(`✏️ Editando proveedor ${id}`);
        const supplier = await obtenerProveedor(id);
        if (!supplier) {
            alert('❌ No se pudo obtener el proveedor. Recarga la página.');
            return;
        }
        modalTitle.textContent = 'Editar proveedor';
        editIdInput.value = id;
        document.getElementById('nombre').value = supplier.nombre;
        document.getElementById('contacto').value = supplier.contacto || '';
        document.getElementById('categoria').value = supplier.categoria;
        document.getElementById('telefono').value = supplier.telefono || '';
        document.getElementById('email').value = supplier.email || '';
        document.getElementById('estado').value = supplier.estado;
        modalOverlay.classList.add('open');
        console.log('✅ Modal de proveedor abierto');
    }

    function closeSupplierModal() {
        modalOverlay.classList.remove('open');
        supplierForm.reset();
        editIdInput.value = '';
    }

    // --- Compras ---
    function populateCompraProveedores() {
        const selects = [compraProveedorSelect, compraProveedorFilter];
        selects.forEach(sel => {
            const current = sel.value;
            sel.innerHTML = '<option value="">Seleccionar</option>';
            proveedores.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.nombre;
                sel.appendChild(opt);
            });
            if (current) sel.value = current;
        });
    }

    function populateProductSelects() {
        document.querySelectorAll('.compra-producto').forEach(sel => {
            const current = sel.value;
            sel.innerHTML = '<option value="">Seleccionar</option>';
            productos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.nombre + ' (Stock: ' + p.cantidad + ')';
                sel.appendChild(opt);
            });
            if (current) sel.value = current;
        });
    }

    // --- Renderizar compras (modificado) ---
    function renderCompras() {
        console.log('🖌️ Renderizando compras');
        let filtered = [...compras];
        if (filtrosCompra.fechaDesde) {
            filtered = filtered.filter(c => c.fecha >= filtrosCompra.fechaDesde);
        }
        if (filtrosCompra.fechaHasta) {
            filtered = filtered.filter(c => c.fecha <= filtrosCompra.fechaHasta);
        }
        if (filtrosCompra.proveedor) {
            filtered = filtered.filter(c => c.proveedor_id === parseInt(filtrosCompra.proveedor));
        }
        filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        compraTbody.innerHTML = '';
        if (filtered.length === 0) {
            compraTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No hay compras registradas</td></tr>';
            compraCountSpan.textContent = 0;
            return;
        }

        filtered.forEach(c => {
            const estadoClass = {
                recibido: 'status-activo',
                pendiente: 'status-pendiente',
                cancelado: 'status-inactivo'
            }[c.estado] || '';
            
            // Obtener nombres de productos (máximo 3)
            const detalles = c.detalles || [];
            let productosStr = '';
            if (detalles.length === 0) {
                productosStr = 'Sin productos';
            } else {
                const nombres = detalles.map(d => {
                    const prod = productos.find(p => p.id === d.producto_id);
                    return prod ? prod.nombre : `Producto #${d.producto_id}`;
                });
                if (nombres.length <= 3) {
                    productosStr = nombres.join(', ');
                } else {
                    productosStr = nombres.slice(0, 3).join(', ') + ` y ${nombres.length - 3} más`;
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${c.id}</strong></td>
                <td>${c.proveedor_nombre || 'Proveedor #' + c.proveedor_id}</td>
                <td>${c.fecha}</td>
                <td>$${Number(c.total).toFixed(2)}</td>
                <td><span class="status-badge ${estadoClass}">${c.estado}</span></td>
                <td>${productosStr}</td>
                <td>
                    <button class="action-btn view" data-id="${c.id}" title="Ver detalles"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" data-id="${c.id}" title="Cambiar estado"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${c.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            `;
            compraTbody.appendChild(tr);
        });
        compraCountSpan.textContent = filtered.length;
        console.log(`✅ Compras renderizadas: ${filtered.length}`);
    }

    // --- Funciones de compra ---
    async function verDetalleCompra(id) {
        console.log(`👁️ Ver detalle de compra ${id}`);
        const compra = await obtenerCompra(id);
        if (!compra) {
            alert('❌ No se pudo obtener la compra. Recarga la página.');
            return;
        }

        const detalles = compra.detalles || [];
        if (detalles.length === 0) {
            alert(`Compra #${compra.id}\nProveedor: ${compra.proveedor_nombre || '#' + compra.proveedor_id}\nFecha: ${compra.fecha}\nTotal: $${Number(compra.total).toFixed(2)}\nUsuario: ${compra.usuario_nombre || 'Desconocido'}\n\nNo hay detalles disponibles.`);
            return;
        }

        let msg = `📋 COMPRA #${compra.id}\n`;
        msg += `Proveedor: ${compra.proveedor_nombre || '#' + compra.proveedor_id}\n`;
        msg += `Fecha: ${compra.fecha}\n`;
        msg += `Total: $${Number(compra.total).toFixed(2)}\n`;
        msg += `Estado: ${compra.estado}\n`;
        msg += `Usuario: ${compra.usuario_nombre || 'Desconocido'}\n`;
        msg += `\n📦 DETALLES:\n`;
        msg += `─────────────────────\n`;
        detalles.forEach((d, index) => {
            const prod = productos.find(p => p.id === d.producto_id);
            const nombre = prod ? prod.nombre : `Producto #${d.producto_id}`;
            msg += `${index+1}. ${nombre}\n`;
            msg += `   Cantidad: ${d.cantidad}\n`;
            msg += `   Precio Unit: $${Number(d.precio_unitario).toFixed(2)}\n`;
            msg += `   Subtotal: $${Number(d.subtotal).toFixed(2)}\n`;
            msg += `─────────────────────\n`;
        });

        alert(msg);
    }

    async function cambiarEstadoCompra(id) {
        console.log(`🔄 Cambiando estado de compra ${id}`);
        const compra = await obtenerCompra(id);
        if (!compra) {
            alert('❌ No se pudo obtener la compra. Recarga la página.');
            return;
        }
        const nuevoEstado = prompt(
            `Cambiar estado de compra #${id}\nEstado actual: ${compra.estado}\nOpciones: recibido, pendiente, cancelado`,
            compra.estado
        );
        if (!nuevoEstado) return;
        if (!['recibido', 'pendiente', 'cancelado'].includes(nuevoEstado)) {
            alert('Estado no válido. Usa: recibido, pendiente o cancelado');
            return;
        }
        if (nuevoEstado === compra.estado) {
            alert('El estado ya es ese');
            return;
        }
        try {
            const response = await fetch('../api/index.php?action=compras&id=' + id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al actualizar');
            alert('✅ Estado actualizado correctamente');
            loadData();
        } catch (error) {
            alert('❌ Error al actualizar: ' + error.message);
        }
    }

    // --- Modal de compra ---
    function openAddCompraModal() {
        console.log('➕ Abriendo modal para nueva compra');
        modalCompraTitle.textContent = 'Nueva compra';
        editCompraIdInput.value = '';
        compraForm.reset();
        compraItemsContainer.innerHTML = '';
        compraFechaInput.value = new Date().toISOString().split('T')[0];
        compraEstadoSelect.value = 'recibido';
        addCompraItemRow();
        modalCompraOverlay.classList.add('open');
        updateCompraTotal();
    }

    function closeCompraModal() {
        modalCompraOverlay.classList.remove('open');
        compraForm.reset();
        compraItemsContainer.innerHTML = '';
        editCompraIdInput.value = '';
    }

    // --- Items de compra ---
    function createCompraItemRow(productoId = '', cantidad = 1, precio = '') {
        const template = document.getElementById('compraItemTemplate');
        const row = template.cloneNode(true);
        row.style.display = 'flex';
        row.id = '';
        const select = row.querySelector('.compra-producto');
        populateProductSelects(select);
        if (productoId) select.value = productoId;
        const cantidadInput = row.querySelector('.compra-cantidad');
        cantidadInput.value = cantidad;
        const precioInput = row.querySelector('.compra-precio');
        if (precio) precioInput.value = precio;
        else if (productoId) {
            const p = productos.find(pr => pr.id === parseInt(productoId));
            if (p) precioInput.value = p.precio;
        }

        const updateRow = function () {
            const cant = parseFloat(cantidadInput.value) || 0;
            const prec = parseFloat(precioInput.value) || 0;
            const subtotal = cant * prec;
            row.querySelector('.item-subtotal').textContent = '$' + subtotal.toFixed(2);
            updateCompraTotal();
        };
        select.addEventListener('change', function () {
            const prodId = parseInt(this.value);
            if (prodId) {
                const p = productos.find(pr => pr.id === prodId);
                if (p) precioInput.value = p.precio;
            }
            updateRow();
        });
        cantidadInput.addEventListener('input', updateRow);
        precioInput.addEventListener('input', updateRow);
        const removeBtn = row.querySelector('.item-remove');
        removeBtn.addEventListener('click', function () {
            if (compraItemsContainer.children.length > 1) {
                row.remove();
                updateCompraTotal();
            } else {
                alert('Debe haber al menos un producto.');
            }
        });
        setTimeout(updateRow, 50);
        return row;
    }

    function addCompraItemRow() {
        const row = createCompraItemRow();
        compraItemsContainer.appendChild(row);
        updateCompraTotal();
    }

    function updateCompraTotal() {
        const rows = document.querySelectorAll('#compraItemsContainer .item-row');
        let total = 0;
        rows.forEach(row => {
            const cant = parseFloat(row.querySelector('.compra-cantidad').value) || 0;
            const prec = parseFloat(row.querySelector('.compra-precio').value) || 0;
            total += cant * prec;
        });
        totalCompraModal.textContent = '$' + total.toFixed(2);
    }

    function getCompraFormData() {
        const proveedor_id = parseInt(compraProveedorSelect.value) || 0;
        const fecha = compraFechaInput.value;
        const estado = compraEstadoSelect.value;
        const detalles = [];
        document.querySelectorAll('#compraItemsContainer .item-row').forEach(row => {
            const producto_id = parseInt(row.querySelector('.compra-producto').value) || 0;
            const cantidad = parseFloat(row.querySelector('.compra-cantidad').value) || 0;
            const precio_unitario = parseFloat(row.querySelector('.compra-precio').value) || 0;
            if (producto_id > 0 && cantidad > 0 && precio_unitario >= 0) {
                detalles.push({ producto_id, cantidad, precio_unitario });
            }
        });
        return { proveedor_id, fecha, estado, detalles };
    }

    async function submitCompraForm(e) {
        e.preventDefault();
        const data = getCompraFormData();
        if (!data.proveedor_id || data.detalles.length === 0) {
            alert('Selecciona un proveedor y al menos un producto.');
            return;
        }
        const result = await createCompra(data);
        if (result) {
            alert('✅ Compra registrada exitosamente.');
            closeCompraModal();
            loadData();
        }
    }

    // --- Filtros proveedores ---
    function applyFilters() {
        filtros.search = searchInput.value;
        filtros.status = statusFilter.value;
        filtros.category = categoryFilter.value;
        renderProveedores();
    }

    function resetFilters() {
        searchInput.value = '';
        statusFilter.value = '';
        categoryFilter.value = '';
        filtros = { search: '', status: '', category: '' };
        renderProveedores();
    }

    // --- Filtros compras ---
    function applyCompraFilters() {
        filtrosCompra.fechaDesde = fechaDesde.value;
        filtrosCompra.fechaHasta = fechaHasta.value;
        filtrosCompra.proveedor = compraProveedorFilter.value;
        renderCompras();
    }

    function resetCompraFilters() {
        fechaDesde.value = '';
        fechaHasta.value = '';
        compraProveedorFilter.value = '';
        filtrosCompra = { fechaDesde: '', fechaHasta: '', proveedor: '' };
        renderCompras();
    }

    // --- Tabs ---
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                const target = this.dataset.tab;
                document.getElementById('tab-' + target).classList.add('active');
                if (target === 'compras') {
                    renderCompras();
                }
            });
        });
    }

    // ============================================
    // DELEGACIÓN DE EVENTOS
    // ============================================
    supplierTbody.addEventListener('click', function (e) {
        const target = e.target.closest('.action-btn');
        if (!target) return;
        const id = parseInt(target.dataset.id);
        if (isNaN(id)) return;

        if (target.classList.contains('edit')) {
            openEditSupplierModal(id);
        } else if (target.classList.contains('delete')) {
            deleteSupplier(id);
        }
    });

    compraTbody.addEventListener('click', function (e) {
        const target = e.target.closest('.action-btn');
        if (!target) return;
        const id = parseInt(target.dataset.id);
        if (isNaN(id)) return;

        if (target.classList.contains('view')) {
            verDetalleCompra(id);
        } else if (target.classList.contains('edit')) {
            cambiarEstadoCompra(id);
        } else if (target.classList.contains('delete')) {
            alert('Eliminación de compras no permitida para mantener integridad del stock.');
        }
    });

    // ============================================
    // EVENTOS COMUNES
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
    // EXPORTACIÓN A CSV Y PDF
    // ============================================
    function exportarProveedores() {
        const activeTab = document.querySelector('.tab-btn.active');
        if (!activeTab) {
            alert('Selecciona una pestaña (Proveedores o Compras).');
            return;
        }
        const tab = activeTab.dataset.tab;

        if (tab === 'proveedores') {
            const tbody = document.getElementById('supplierTableBody');
            const headers = ['ID', 'Nombre', 'Contacto', 'Categoría', 'Teléfono', 'Email', 'Estado'];
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
                alert('No hay proveedores para exportar.');
                return;
            }
            const csv = convertToCSV(data, headers);
            downloadFile(csv, 'proveedores.csv', 'text/csv;charset=utf-8;');
            generatePDF(data, headers, 'proveedores');
        } else if (tab === 'compras') {
            const tbody = document.getElementById('compraTableBody');
            const headers = ['ID', 'Proveedor', 'Fecha', 'Total', 'Estado', 'Productos'];
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
                alert('No hay compras para exportar.');
                return;
            }
            const csv = convertToCSV(data, headers);
            downloadFile(csv, 'compras.csv', 'text/csv;charset=utf-8;');
            generatePDF(data, headers, 'compras');
        }
    }

    // Funciones auxiliares de exportación
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

    // Asignar evento al botón Exportar
    document.getElementById('exportBtn')?.addEventListener('click', exportarProveedores);

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    setupCommon();
    setupTabs();

    // Eventos proveedores
    modalClose.addEventListener('click', closeSupplierModal);
    modalCancel.addEventListener('click', closeSupplierModal);
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === this) closeSupplierModal();
    });
    openAddBtn.addEventListener('click', openAddSupplierModal);
    supplierForm.addEventListener('submit', submitSupplierForm);
    applyBtn.addEventListener('click', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    searchInput.addEventListener('input', applyFilters);

    // Eventos compras
    modalCompraClose.addEventListener('click', closeCompraModal);
    modalCompraCancel.addEventListener('click', closeCompraModal);
    modalCompraOverlay.addEventListener('click', function (e) {
        if (e.target === this) closeCompraModal();
    });
    openAddCompraBtn.addEventListener('click', openAddCompraModal);
    addCompraItemBtn.addEventListener('click', addCompraItemRow);
    compraForm.addEventListener('submit', submitCompraForm);
    applyCompraFiltersBtn.addEventListener('click', applyCompraFilters);
    resetCompraFiltersBtn.addEventListener('click', resetCompraFilters);

    // Mostrar nombre de usuario en el topbar
    const userData = getCurrentUser();
    const userNameSpan = document.getElementById('userNameDisplay');
    if (userData && userData.nombre && userNameSpan) {
        userNameSpan.textContent = userData.nombre.toUpperCase();
    }

    loadData();
});