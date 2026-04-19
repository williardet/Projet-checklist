import { state, saveState, actions } from './state.js';
import { 
    escapeHTML, formatDate, isOverdue, 
    getPriorityColor, getPriorityLabel, getCategoryStyle 
} from './utils.js';

// Utilitaires
function showModal({ type = 'alert', title = '', message = '', placeholder = '' }) {
    state.modal = { show: true, type, title, message, placeholder, resolve: null };
    render();
    return new Promise((resolve) => {
        state.modal.resolve = resolve;
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const bgClass = {
        success: 'bg-green-600',
        info: 'bg-blue-600',
        warning: 'bg-amber-600',
        danger: 'bg-red-600'
    }[type] || 'bg-gray-800';

    toast.className = `${bgClass} pointer-events-auto flex items-center justify-between gap-4 rounded-lg px-4 py-3 text-white shadow-2xl animate-task-entry min-w-[280px]`;
    toast.innerHTML = `
        <p class="text-sm font-medium">${escapeHTML(message)}</p>
        <button data-action="closeToast" aria-label="Fermer la notification" class="text-white/80 hover:text-white">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-panel-exit');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

function updateSidebarActiveState() {
    const smartFilters = ['all', 'today', 'important', 'upcoming', 'overdue'];
    smartFilters.forEach(filter => {
        const btn = document.getElementById(`smart-${filter}`);
        if (btn) {
            if (state.smartFilter === filter) {
                btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-blue-600', 'dark:text-blue-400');
            } else {
                btn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-blue-600', 'dark:text-blue-400');
            }
        }
    });
}

const setSmartFilter = (filter) => {
    state.smartFilter = filter;
    state.filterCategory = 'all';
    state.showCalendar = false;
    state.showTrash = false;
    state.showCategoryManager = false;
    const labels = { all: 'Toutes', today: 'Journée', important: 'Important', upcoming: 'À venir', overdue: 'Retard' };
    showToast(`Vue : ${labels[filter] || filter}`, 'info');
    render();
};

const setSidebarCategoryFilter = (categoryName) => {
    state.filterCategory = categoryName;
    state.smartFilter = 'all';
    state.showCalendar = false;
    state.showTrash = false;
    state.showCategoryManager = false;
    showToast(`Catégorie : ${categoryName}`, 'info');
    render();
};

const toggleSidebarCategories = () => {
    state.isCategoryExpanded = !state.isCategoryExpanded;
    renderSidebarCategories();
};

function renderSidebarCategories() {
    const container = document.getElementById('sidebarCategories');
    const chevron = document.getElementById('catChevron');
    if (!container || !chevron) return;

    // Gestion de l'affichage
    if (state.isCategoryExpanded) {
        container.classList.remove('hidden');
        chevron.classList.add('rotate-90');
    } else {
        container.classList.add('hidden');
        chevron.classList.remove('rotate-90');
    }

    const categoriesHtml = state.categories.map(cat => {
        const count = state.tasks.filter(t => t.category === cat.name && !t.completed).length;
        const isActive = state.filterCategory === cat.name && state.smartFilter === 'all';
        
        return `<li>
                <button data-action="setSidebarCategoryFilter" data-value="${escapeHTML(cat.name)}" aria-label="Filtrer par catégorie ${cat.name}" 
                    class="flex items-center justify-between w-full rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${isActive ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : ''}">
                    <div class="flex items-center gap-3">
                        <span class="h-2 w-2 rounded-full" style="background-color: ${cat.color}"></span>
                        <span class="font-medium text-sm hidden sm:inline lg:inline">${escapeHTML(cat.name)}</span>
                    </div>
                    ${count > 0 ? `<span class="text-xs font-bold opacity-60 ml-2">${count}</span>` : ''}
                </button>
            </li>`;
    }).join('');
    
    container.innerHTML = `<ul class="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible no-scrollbar">${categoriesHtml}</ul>`;
}

const handleModalAction = (action, value = null) => {
    const resolve = state.modal.resolve;
    state.modal.show = false;
    render();
    
    if (action === 'cancel') {
        resolve(state.modal.type === 'prompt' ? null : false);
    } else {
        if (state.modal.type === 'prompt') {
            resolve(value || document.getElementById('modalInput')?.value || '');
        } else {
            resolve(true);
        }
    }
};

function getFilteredTasks() {
    let tasks = state.tasks;

    // Application du filtre intelligent (Smart List)
    if (state.smartFilter !== 'all') {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        tasks = tasks.filter(task => {
            switch (state.smartFilter) {
                case 'today':
                    return task.dueDate === today;
                case 'important':
                    return task.priority === 'high' && !task.completed;
                case 'upcoming':
                    return task.dueDate > today && task.dueDate <= nextWeekStr;
                case 'overdue':
                    return isOverdue(task.dueDate, task.completed);
                default:
                    return true;
            }
        });
    }

    return tasks.filter(task => {
        const statusMatch = state.filterStatus === 'all' ? true :
            state.filterStatus === 'active' ? !task.completed : task.completed;
        const categoryMatch = state.filterCategory === 'all' || task.category === state.filterCategory;
        const priorityMatch = state.filterPriority === 'all' || task.priority === state.filterPriority;
        const searchMatch = task.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            (task.description || '').toLowerCase().includes(state.searchQuery.toLowerCase());
        return statusMatch && categoryMatch && priorityMatch && searchMatch;
    });
}

function getStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const active = total - completed;
    const highPriority = state.tasks.filter(t => !t.completed && t.priority === 'high').length;
    return { total, completed, active, highPriority };
}

// Gestionnaires d'événements
function toggleDarkMode() {
    state.isDark = !state.isDark;
    applyTheme();
    localStorage.setItem('theme', state.isDark ? 'dark' : 'light');
}

function applyTheme() {
    const themeLabel = document.getElementById('themeLabel');
    if (state.isDark) {
        document.documentElement.classList.add('dark');
        document.getElementById('sunIcon')?.classList.remove('hidden');
        document.getElementById('moonIcon')?.classList.add('hidden');
        if (themeLabel) themeLabel.textContent = 'Mode sombre';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('sunIcon')?.classList.add('hidden');
        document.getElementById('moonIcon')?.classList.remove('hidden');
        if (themeLabel) themeLabel.textContent = 'Mode clair';
    }
}

const changeCalendarMonth = (offset) => {
    const date = state.calendarViewDate;
    state.calendarViewDate = new Date(date.getFullYear(), date.getMonth() + offset, 1);
    render();
};

const closeCategoryManager = () => {
    const panel = document.getElementById('categoryManagerPanel');
    if (panel) {
        panel.classList.add('animate-panel-exit');
        panel.addEventListener('animationend', () => {
            state.showCategoryManager = false;
            render();
        }, { once: true });
    } else {
        state.showCategoryManager = false;
        render();
    }
};

const closeTrash = () => {
    const panel = document.getElementById('trashPanel');
    if (panel) {
        panel.classList.add('animate-panel-exit');
        panel.addEventListener('animationend', () => {
            state.showTrash = false;
            render();
        }, { once: true });
    } else {
        state.showTrash = false;
        render();
    }
};

function addTask(task) {
    actions.addTask(task);
    state.showForm = false;
    showToast('Tâche ajoutée avec succès !');
    render();
}

function toggleTask(id) {
    actions.toggleTask(id);
    render(['tasks', 'stats', 'categories', 'calendar']);
}

const toggleSubtask = (taskId, subtaskId) => {
    actions.toggleSubtask(taskId, subtaskId);
    render(['tasks']);
};

const handleDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Le timeout permet de modifier le style après que l'image fantôme de drag soit créée
    setTimeout(() => e.target.classList.add('opacity-40'), 0);
};

const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-40');
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('border-blue-500', 'dark:border-blue-400', 'scale-[1.01]');
    });
};

const handleDragOver = (e) => {
    e.preventDefault(); // Nécessaire pour autoriser le drop
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.task-item');
    if (item) item.classList.add('border-blue-500', 'dark:border-blue-400', 'scale-[1.01]');
};

const handleDragLeave = (e) => {
    const item = e.target.closest('.task-item');
    if (item) item.classList.remove('border-blue-500', 'dark:border-blue-400', 'scale-[1.01]');
};

const handleDrop = (e, targetId) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId === targetId) return;

    actions.reorderTasks(draggedId, targetId);
    render();
};

const startEditing = (id) => {
    state.editingTaskId = id;
    state.showForm = true;
    render();
};

const startInlineEdit = (id) => {
    state.inlineEditingId = id;
    render(['tasks']);
};

const saveInlineEdit = (id, newTitle) => {
    if (state.inlineEditingId !== id) return;
    if (newTitle.trim()) actions.updateTask(id, { title: newTitle.trim() });
    showToast('Titre mis à jour');
    state.inlineEditingId = null;
    render();
};

const cancelInlineEdit = () => {
    state.inlineEditingId = null;
    render();
};

const toggleExpandTask = (id) => {
    if (state.expandedTasks.includes(id)) {
        state.expandedTasks = state.expandedTasks.filter(taskId => taskId !== id);
    } else {
        state.expandedTasks.push(id);
    }
    render(['tasks']);
};

function deleteTask(id) {
    const taskElement = document.querySelector(`[data-id="${id}"]`);
    if (taskElement) {
        taskElement.classList.add('animate-task-exit');
        // On attend la fin de l'animation avant de mettre à jour l'état
        taskElement.addEventListener('animationend', () => {
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                actions.deleteTask(id);
                showToast('Tâche déplacée dans la corbeille', 'info');
                render(['tasks', 'stats', 'categories', 'trash']);
            }
        }, { once: true });
    }
}

function updateTask(id, updatedData) {
    actions.updateTask(id, updatedData);
    state.editingTaskId = null;
    state.showForm = false;
    showToast('Tâche modifiée avec succès !');
    render();
}

const addCategory = async () => {
    let name = await showModal({ type: 'prompt', title: 'Nouvelle catégorie', placeholder: 'Nom de la catégorie...' });
    if (name) {
        name = name.trim();
        if (name === '') return;
        // Capitalisation de la première lettre
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
        
        if (!state.categories.find(c => c.name === capitalizedName)) {
            actions.addCategory(capitalizedName);
            showToast('Catégorie créée !');
            render();
        }
    }
};

const updateCategory = (index, field, value) => {
    const oldName = state.categories[index].name;
    let newValue = value;

    if (field === 'name' && value) {
        newValue = value.trim();
        if (newValue !== '') {
            newValue = newValue.charAt(0).toUpperCase() + newValue.slice(1);
        }
    }

    actions.updateCategory(index, field, newValue);
    showToast('Catégorie mise à jour');
    render();
};

const deleteCategory = async (index) => {
    const catName = state.categories[index].name;
    const confirmed = await showModal({ type: 'confirm', title: 'Supprimer la catégorie', message: `Voulez-vous vraiment supprimer "${catName}" ? Les tâches associées deviendront "Sans catégorie".` });
    if (confirmed) {
        state.tasks = state.tasks.map(t => t.category === catName ? { ...t, category: 'Sans catégorie' } : t);
        actions.deleteCategory(index);
        if (state.filterCategory === catName) state.filterCategory = 'all';
        showToast('Catégorie supprimée', 'warning');
        render();
    }
};

function restoreTask(id) {
    const task = state.trashedTasks.find(t => t.id === id);
    if (task) {
        state.tasks.unshift(task);
        state.trashedTasks = state.trashedTasks.filter(t => t.id !== id);
        showToast('Tâche restaurée', 'success');
        render();
    }
}

async function deletePermanently(id) {
    const confirmed = await showModal({ 
        type: 'confirm', 
        title: 'Suppression définitive', 
        message: 'Voulez-vous vraiment supprimer cette tâche ? Cette action est irréversible.' 
    });
    
    if (confirmed) {
        state.trashedTasks = state.trashedTasks.filter(t => t.id !== id);
        showToast('Tâche supprimée définitivement', 'danger');
        render();
    }
}

async function emptyTrash() {
    const confirmed = await showModal({ type: 'confirm', title: 'Vider la corbeille', message: 'Cette action est irréversible. Voulez-vous continuer ?' });
    if (confirmed) {
        state.trashedTasks = [];
        showToast('La corbeille a été vidée', 'danger');
        render();
    }
}

// Rendu des composants
function renderStats() {
    const stats = getStats();
    const statsData = [
        { label: 'Total', value: stats.total, color: 'bg-blue-500' },
        { label: 'Actives', value: stats.active, color: 'bg-orange-500' },
        { label: 'Complétées', value: stats.completed, color: 'bg-green-500' },
        { label: 'Priorité haute', value: stats.highPriority, color: 'bg-red-500' }
    ];

    document.getElementById('statsCards').innerHTML = statsData.map(stat => `
                <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-all">
                    <div class="flex items-center gap-4">
                        <div class="${stat.color} flex h-10 w-10 items-center justify-center rounded-lg text-white">
                            <span class="text-lg font-semibold">${stat.value}</span>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${stat.label}</p>
                            <p class="font-medium text-gray-900 dark:text-white">
                                ${stat.value === 0 ? 'Aucune' : stat.value === 1 ? '1 tâche' : `${stat.value} tâches`}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
}

function renderTaskForm() {
    if (!state.showForm) {
        document.getElementById('taskFormContainer').classList.add('hidden');
        return;
    }

    document.getElementById('taskFormContainer').classList.remove('hidden');
    const editingTask = state.editingTaskId ? state.tasks.find(t => t.id === state.editingTaskId) : null;

    document.getElementById('taskFormContainer').innerHTML = `
                <div class="animate-form-entry rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-lg">
                    <div class="mb-4 flex items-center justify-between">
                        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">${editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
                        <button id="closeFormBtn" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <form id="taskForm" class="space-y-4">
                        <div>
                            <label class="mb-1.5 block font-medium text-gray-900 dark:text-white">Titre</label>
                            <input type="text" id="taskTitle" required value="${editingTask ? escapeHTML(editingTask.title) : ''}" placeholder="Ex: Finaliser le rapport" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400">
                        </div>
                        <div>
                            <label class="mb-1.5 block font-medium text-gray-900 dark:text-white">Description</label>
                            <textarea id="taskDescription" rows="3" placeholder="Ajouter une description..." class="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400">${editingTask ? escapeHTML(editingTask.description) : ''}</textarea>
                        </div>
                        <div class="grid gap-4 sm:grid-cols-3">
                        <div class="sm:col-span-3">
                            <label class="mb-1.5 block font-medium text-gray-900 dark:text-white">Sous-tâches</label>
                            <div id="subtasksInputs" class="space-y-2">
                                ${editingTask && editingTask.subtasks ? editingTask.subtasks.map(st => `
                                    <div class="flex items-center gap-2 subtask-row">
                                        <input type="text" class="subtask-input w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400" value="${escapeHTML(st.title)}" data-id="${st.id}" data-completed="${st.completed}">
                                        <button type="button" class="remove-subtask-btn p-2 text-gray-400 hover:text-red-600 transition-colors">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                        </button>
                                    </div>
                                `).join('') : ''}
                            </div>
                            <button type="button" id="addSubtaskBtn" class="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">+ Ajouter une sous-tâche</button>
                        </div>
                            <div>
                                <label class="mb-1.5 block font-medium text-gray-900 dark:text-white">Catégorie</label>
                                <select id="taskCategory" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400">
                                    ${state.categories.map(cat => `<option value="${escapeHTML(cat.name)}" ${editingTask && editingTask.category === cat.name ? 'selected' : ''}>${escapeHTML(cat.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="mb-1.5 block font-medium text-gray-900 dark:text-white">Priorité</label>
                                <select id="taskPriority" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400">
                                    <option value="low" ${editingTask && editingTask.priority === 'low' ? 'selected' : ''}>Basse</option>
                                    <option value="medium" ${(!editingTask || editingTask.priority === 'medium') ? 'selected' : ''}>Moyenne</option>
                                    <option value="high" ${editingTask && editingTask.priority === 'high' ? 'selected' : ''}>Haute</option>
                                </select>
                            </div>
                            <div>
                                <label class="mb-1.5 block font-medium text-gray-900 dark:text-white">Échéance</label>
                                <input type="date" id="taskDueDate" required min="${new Date().toISOString().split('T')[0]}" value="${editingTask ? editingTask.dueDate : new Date(Date.now() + 86400000).toISOString().split('T')[0]}" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400">
                            </div>
                        </div>
                        <div class="flex justify-end gap-3 pt-2">
                            <button type="button" id="cancelFormBtn" class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-2.5 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                                Annuler
                            </button>
                            <button type="submit" class="rounded-lg bg-gray-900 dark:bg-white px-6 py-2.5 text-white dark:text-gray-900 hover:opacity-90">
                                ${editingTask ? 'Enregistrer' : 'Créer la tâche'}
                            </button>
                        </div>
                    </form>
                </div>
            `;

    document.getElementById('closeFormBtn').addEventListener('click', () => {
        state.showForm = false;
        state.editingTaskId = null;
        render();
    });

    document.getElementById('cancelFormBtn').addEventListener('click', () => {
        state.showForm = false;
        state.editingTaskId = null;
        render();
    });

    document.getElementById('addSubtaskBtn').addEventListener('click', () => {
        const container = document.getElementById('subtasksInputs');
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 subtask-row';
        row.innerHTML = `
            <input type="text" class="subtask-input w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400" placeholder="Titre de la sous-tâche...">
            <button type="button" class="remove-subtask-btn p-2 text-gray-400 hover:text-red-600 transition-colors">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        container.appendChild(row);
        row.querySelector('input').focus();
    });

    document.getElementById('subtasksInputs').addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-subtask-btn');
        if (removeBtn) {
            removeBtn.closest('.subtask-row').remove();
        }
    });

    document.getElementById('taskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const subtaskInputs = document.querySelectorAll('.subtask-input');
        const subtasks = Array.from(subtaskInputs).filter(input => input.value.trim() !== '').map(input => ({
            id: input.dataset.id || crypto.randomUUID(),
            title: input.value.trim(),
            completed: input.dataset.completed === 'true'
        }));

        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            category: document.getElementById('taskCategory').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            subtasks: subtasks
        };

        if (state.editingTaskId) {
            updateTask(state.editingTaskId, taskData);
        } else {
            addTask({
                ...taskData,
                completed: false
            });
        }
    });
}

function renderCategoryManager() {
    const container = document.getElementById('categoryManagerContainer');
    if (!state.showCategoryManager) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
        <div id="categoryManagerPanel" class="animate-form-entry rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-lg">
            <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Gérer les catégories</h2>
                <button onclick="closeCategoryManager()" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="space-y-3">
                ${state.categories.map((cat, index) => `
                    <div class="flex items-center gap-3">
                        <input type="color" value="${cat.color}" data-action="updateCategory" data-index="${index}" data-field="color" class="h-10 w-10 cursor-pointer rounded border-none bg-transparent">
                        <input type="text" value="${escapeHTML(cat.name)}" data-action="updateCategory" data-index="${index}" data-field="name" class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900">
                        <button data-action="deleteCategory" data-index="${index}" class="text-red-500 hover:text-red-700 p-2">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                `).join('')}
                <button data-action="addCategory" class="mt-4 w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-all">
                    + Ajouter une catégorie
                </button>
            </div>
        </div>
    `;
}

function renderCalendarView() {
    const container = document.getElementById('calendarContainer');
    if (!state.showCalendar || state.showTrash) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    const date = state.calendarViewDate;
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Ajustement pour commencer le lundi
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let calendarHtml = `
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-lg animate-form-entry">
            <div class="mb-6 flex items-center justify-between">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">${monthNames[month]} ${year}</h2>
                <div class="flex gap-2">
                    <button data-action="changeCalendarMonth" data-value="-1" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button data-action="changeCalendarMonth" data-value="1" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
            <div class="overflow-x-auto no-scrollbar border border-gray-200 dark:border-gray-700 rounded-lg">
                <div class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 min-w-[600px] lg:min-w-0">
                ${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => `
                    <div class="bg-gray-50 dark:bg-gray-900 py-2 text-center text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">${day}</div>
                `).join('')}
                ${Array(firstDay).fill(0).map(() => `<div class="bg-white dark:bg-gray-800 min-h-[5rem] sm:min-h-[8rem]"></div>`).join('')}
                ${Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const dayTasks = state.tasks.filter(t => t.dueDate === currentStr);
                    const isToday = new Date().toISOString().split('T')[0] === currentStr;

                    return `
                        <div class="bg-white dark:bg-gray-800 min-h-[5rem] sm:min-h-[8rem] p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${isToday ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold' : 'text-gray-700 dark:text-gray-300'}">${dayNum}</span>
                            <div class="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)]">
                                ${dayTasks.map(t => `
                                    <div class="group relative flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] sm:text-xs border transition-all ${t.completed ? 'opacity-50' : ''}" 
                                         style="${getCategoryStyle(t.category, state.categories)}">
                                        <span class="truncate">${escapeHTML(t.title)}</span>
                                        ${t.priority === 'high' ? '<span class="flex-shrink-0 w-1 h-1 rounded-full bg-red-500"></span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
                ${Array((7 - (firstDay + daysInMonth) % 7) % 7).fill(0).map(() => `<div class="bg-white dark:bg-gray-800 min-h-[5rem] sm:min-h-[8rem]"></div>`).join('')}
            </div>
            </div>
        </div>
    `;
    
    container.innerHTML = calendarHtml;
}

function renderModal() {
    const container = document.getElementById('modalContainer');
    if (!state.modal.show) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    const { type, title, message, placeholder } = state.modal;

    container.innerHTML = `
        <div class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-5 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-bold leading-6 text-gray-900 dark:text-white mb-2">${escapeHTML(title)}</h3>
            <div class="mt-2">
                ${message ? `<p class="text-sm text-gray-500 dark:text-gray-400">${escapeHTML(message)}</p>` : ''}
                ${type === 'prompt' ? `
                    <input type="text" id="modalInput" autofocus placeholder="${escapeHTML(placeholder)}" class="mt-4 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400" onkeydown="if(event.key === 'Enter') handleModalAction('confirm')">
                ` : ''}
            </div>

            <div class="mt-6 flex justify-end gap-3">
                ${type !== 'alert' ? `
                    <button data-action="handleModalAction" data-value="cancel" class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                        Annuler
                    </button>
                ` : ''}
                <button data-action="handleModalAction" data-value="confirm" class="rounded-lg bg-gray-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-gray-900 hover:opacity-90">
                    ${type === 'confirm' ? 'Confirmer' : 'OK'}
                </button>
            </div>
        </div>
    `;

    if (type === 'prompt') {
        setTimeout(() => document.getElementById('modalInput')?.focus(), 50);
    }
}

function renderTrashView() {
    if (!state.showTrash) {
        document.getElementById('trashContainer').classList.add('hidden');
        return;
    }

    document.getElementById('trashContainer').classList.remove('hidden');

    const tasks = state.trashedTasks.filter(task => {
        return task.title.toLowerCase().includes(state.trashSearchQuery.toLowerCase()) ||
               (task.description && task.description.toLowerCase().includes(state.trashSearchQuery.toLowerCase()));
    });

    document.getElementById('trashContainer').innerHTML = `
                <div id="trashPanel" class="animate-form-entry rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                    <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-5">
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/50">
                                <svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </div>
                            <div>
                                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Corbeille</h2>
                                <p class="text-sm text-gray-600 dark:text-gray-400">
                                    ${tasks.length === 0 ? 'Aucune tâche supprimée' : `${tasks.length} tâche${tasks.length > 1 ? 's' : ''} supprimée${tasks.length > 1 ? 's' : ''}`}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${tasks.length > 0 ? `
                                <button id="emptyTrashBtn" class="flex items-center gap-2 rounded-lg border border-red-600 bg-red-100 dark:bg-red-950/50 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                    <span>Vider la corbeille</span>
                                </button>
                            ` : ''}
                            <button onclick="closeTrash()" class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="p-5">
                        <div class="mb-4 relative">
                            <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input type="text" id="trashSearchInput" value="${state.trashSearchQuery}" placeholder="Rechercher dans la corbeille..." 
                                class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/50">
                        </div>

                        ${tasks.length === 0 ? `
                            <div class="py-12 text-center">
                                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                    <svg class="h-8 w-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </div>
                                <h3 class="mb-2 font-medium text-gray-900 dark:text-white">La corbeille est vide</h3>
                                <p class="text-gray-600 dark:text-gray-400">Les tâches supprimées apparaîtront ici</p>
                            </div>
                        ` : `
                            <div class="space-y-3">
                                ${tasks.map(task => `
                                    <div class="group rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 opacity-60 hover:opacity-100 transition-all">
                                        <div class="flex items-start gap-4">
                                            <div class="min-w-0 flex-1">
                                                <h3 class="font-medium text-gray-900 dark:text-white line-through mb-2">${escapeHTML(task.title)}</h3>
                                                ${task.description ? `<p class="text-gray-600 dark:text-gray-400 line-through mb-3">${escapeHTML(task.description)}</p>` : ''}
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <span class="rounded-full px-2.5 py-0.5 text-sm" style="${getCategoryStyle(task.category, state.categories)}">${escapeHTML(task.category)}</span>
                                                    <span class="text-sm text-gray-600 dark:text-gray-400">${formatDate(task.dueDate)}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-shrink-0 gap-2">
                                            <button data-action="restoreTask" data-id="${task.id}" aria-label="Restaurer la tâche" class="flex h-9 items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                                                    </svg>
                                                    <span class="hidden sm:inline">Restaurer</span>
                                                </button>
                                            <button data-action="deletePermanently" data-id="${task.id}" aria-label="Supprimer définitivement" class="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-colors">
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;

    // Écouteur pour la recherche locale à la corbeille
    document.getElementById('trashSearchInput')?.addEventListener('input', (e) => {
        state.trashSearchQuery = e.target.value;
        renderTrashView();
        // Maintenir le focus après le rendu
        const input = document.getElementById('trashSearchInput');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    });

    document.getElementById('emptyTrashBtn')?.addEventListener('click', emptyTrash);
}

function renderFilterBar() {
    if (state.showTrash || state.showCalendar) {
        document.getElementById('filterBar').classList.add('hidden');
        return;
    }

    document.getElementById('filterBar').classList.remove('hidden');
    document.getElementById('filterBar').innerHTML = `
                <div class="relative">
                    <svg class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input type="text" id="searchInput" value="${state.searchQuery}" placeholder="Rechercher une tâche..." class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 py-2.5 pl-10 pr-4 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400">
                </div>
                <div class="flex flex-wrap gap-3">
                    <div class="flex gap-2 rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
                        <button data-action="setFilterStatus" data-value="all" class="rounded-md px-4 py-1.5 transition-colors ${state.filterStatus === 'all' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}">Toutes</button>
                        <button data-action="setFilterStatus" data-value="active" class="rounded-md px-4 py-1.5 transition-colors ${state.filterStatus === 'active' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}">Actives</button>
                        <button data-action="setFilterStatus" data-value="completed" class="rounded-md px-4 py-1.5 transition-colors ${state.filterStatus === 'completed' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}">Complétées</button>
                    </div>
                    <select id="categoryFilter" class="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400">
                        <option value="all">Toutes catégories</option>
                        ${state.categories.map(cat => `<option value="${escapeHTML(cat.name)}" ${state.filterCategory === cat.name ? 'selected' : ''}>${escapeHTML(cat.name)}</option>`).join('')}
                    </select>
                    <select id="priorityFilter" class="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400">
                        <option value="all">Toutes priorités</option>
                        <option value="high" ${state.filterPriority === 'high' ? 'selected' : ''}>Haute</option>
                        <option value="medium" ${state.filterPriority === 'medium' ? 'selected' : ''}>Moyenne</option>
                        <option value="low" ${state.filterPriority === 'low' ? 'selected' : ''}>Basse</option>
                    </select>
                </div>
            `;

    document.getElementById('searchInput').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderTaskList();
    });

    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        state.filterCategory = e.target.value;
        renderTaskList();
    });

    document.getElementById('priorityFilter').addEventListener('change', (e) => {
        state.filterPriority = e.target.value;
        renderTaskList();
    });
}

function renderTaskList() {
    if (state.showTrash || state.showCalendar) {
        document.getElementById('taskList').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
        return;
    }

    // Capture de l'état du focus et de la sélection avant le rendu
    const activeElementId = document.activeElement?.id;
    const selectionStart = document.activeElement?.selectionStart;
    const selectionEnd = document.activeElement?.selectionEnd;

    const filteredTasks = getFilteredTasks();
    document.getElementById('taskList').classList.remove('hidden');

    if (filteredTasks.length === 0) {
        document.getElementById('taskList').innerHTML = '';
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('emptyState').innerHTML = `
                    <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg class="h-10 w-10 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                    </div>
                    <h3 class="mb-2 font-medium text-gray-900 dark:text-white">Aucune tâche trouvée</h3>
                    <p class="text-gray-600 dark:text-gray-400">
                        ${state.tasks.length === 0 ? "Commencez par créer votre première tâche" : "Essayez de modifier vos filtres"}
                    </p>
                `;
        return;
    }

    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('taskList').innerHTML = filteredTasks.map(task => {
        const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
        const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
        const percentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

        return `
                <div 
                    data-id="${task.id}"
                    draggable="true"
                    class="task-item group cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5 shadow-sm hover:shadow-md transition-all ${task.completed ? 'opacity-60' : ''}">
                    <div class="flex items-start gap-4">
                        <button data-action="toggleTask" data-id="${task.id}" aria-label="${task.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}" class="mt-1 flex-shrink-0 text-gray-900 dark:text-white transition-transform hover:scale-110">
                            ${task.completed ? `
                                <svg class="h-6 w-6 fill-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            ` : `
                                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="9" stroke-width="2"></circle>
                                </svg>
                            `}
                        </button>
                        <div class="min-w-0 flex-1">
                            <div class="mb-2 flex flex-wrap items-start justify-between gap-2">
                                ${state.inlineEditingId === task.id ? `
                                    <input 
                                        type="text" 
                                        id="inlineInput-${task.id}"
                                        data-action="inlineEditInput" data-id="${task.id}"
                                        value="${escapeHTML(task.title)}"
                                        class="inline-edit-input flex-1 rounded border border-blue-500 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                ` : `
                                    <h3 data-action="startInlineEdit" data-id="${task.id}" class="font-medium text-gray-900 dark:text-white cursor-text hover:text-blue-600 transition-colors ${task.completed ? 'line-through' : ''}" title="Cliquez pour modifier le titre">
                                        ${escapeHTML(task.title)}
                                    </h3>
                                `}
                                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button data-action="startEditing" data-id="${task.id}" class="flex-shrink-0 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-all">
                                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                        </svg>
                                    </button>
                                    <button data-action="deleteTask" data-id="${task.id}" class="flex-shrink-0 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-all">
                                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            ${task.description ? `<p class="mb-3 text-gray-600 dark:text-gray-400 ${task.completed ? 'line-through' : ''}">${escapeHTML(task.description)}</p>` : ''}
                            
                            ${totalSubtasks > 0 ? `
                                <div class="mb-3">
                                    <div class="mb-1.5 flex items-center justify-between">
                                        <div data-action="toggleExpandTask" data-id="${task.id}" class="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                            <svg class="h-4 w-4 transform ${state.expandedTasks.includes(task.id) ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                            </svg>
                                            <span>${totalSubtasks} sous-tâche${totalSubtasks > 1 ? 's' : ''} (${completedSubtasks} terminée${completedSubtasks > 1 ? 's' : ''})</span>
                                        </div>
                                        <span class="text-xs font-bold ${percentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}">${percentage}%</span>
                                    </div>
                                    <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                        <div class="h-full ${percentage === 100 ? 'bg-green-500' : 'bg-blue-500'} transition-all duration-500" style="width: ${percentage}%"></div>
                                    </div>
                                </div>
                            ` : ''}

                            ${task.subtasks && task.subtasks.length > 0 && state.expandedTasks.includes(task.id) ? `
                                <div class="mb-4 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 ml-1 pl-4">
                                    ${task.subtasks.map(st => `
                                        <div class="flex items-center gap-3">
                                            <button data-action="toggleSubtask" data-task-id="${task.id}" data-subtask-id="${st.id}" aria-label="${st.completed ? 'Décocher la sous-tâche' : 'Cocher la sous-tâche'}" class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                                ${st.completed ? 
                                                    '<svg class="h-4 w-4 text-green-500 fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>' : 
                                                    '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"></circle></svg>'
                                                }
                                            </button>
                                            <span class="text-sm ${st.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}">${escapeHTML(st.title)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}

                            <div class="flex flex-wrap items-center gap-2">
                                <span class="rounded-full px-2.5 py-0.5 text-sm" style="${getCategoryStyle(task.category, state.categories)}">${escapeHTML(task.category)}</span>
                                <span class="rounded-full border px-2.5 py-0.5 text-sm ${getPriorityColor(task.priority)}">${getPriorityLabel(task.priority)}</span>
                                <div class="flex items-center gap-1.5 text-sm ${isOverdue(task.dueDate, task.completed) ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}">
                                    ${isOverdue(task.dueDate, task.completed) ? `
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                        </svg>
                                    ` : `
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                    `}
                                    <span>${formatDate(task.dueDate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;}).join('');

    // Restauration intelligente du focus
    if (state.inlineEditingId) {
        const inputId = `inlineInput-${state.inlineEditingId}`;
        const input = document.getElementById(inputId);
        if (input) {
            input.focus();
            // Si c'était déjà cet input qui était focalisé, on restaure la position du curseur
            if (activeElementId === inputId && selectionStart !== undefined) {
                input.setSelectionRange(selectionStart, selectionEnd);
            } else {
                // Sinon (ouverture de l'édition), on sélectionne tout le texte
                input.select();
            }
        }
    }
}

function updateTrashBadge() {
    const badge = document.getElementById('trashBadge');
    if (state.trashedTasks.length > 0) {
        badge.classList.remove('hidden');
        badge.textContent = state.trashedTasks.length;
    } else {
        badge.classList.add('hidden');
    }
}

/**
 * Rendu de l'application.
 * @param {string[]} [parts] - Liste des composants à mettre à jour (ex: ['tasks', 'stats']).
 * Si omis, effectue un rendu complet.
 */
function render(parts = null) {
    saveState();
    const all = !parts;

    if (all || parts.includes('stats')) renderStats();
    if (all || parts.includes('form')) renderTaskForm();
    if (all || parts.includes('categories')) {
        renderCategoryManager();
        renderSidebarCategories();
    }
    if (all || parts.includes('nav')) updateSidebarActiveState();
    if (all || parts.includes('calendar')) renderCalendarView();
    if (all || parts.includes('modal')) renderModal();
    if (all || parts.includes('trash')) {
        renderTrashView();
        updateTrashBadge();
    }
    if (all || parts.includes('filters')) renderFilterBar();
    if (all || parts.includes('tasks')) renderTaskList();
}

// Fonctions globales
const setFilterStatus = (status) => {
    state.filterStatus = status;
    render(['tasks', 'filters']);
};

// Event listeners
document.getElementById('darkModeBtn').addEventListener('click', toggleDarkMode);
document.getElementById('newTaskBtn').addEventListener('click', () => {
    state.showForm = !state.showForm;
    if (state.showForm) state.showCalendar = false;
    render();
});
document.getElementById('trashBtn').addEventListener('click', () => {
    state.showTrash = !state.showTrash;
    if (state.showTrash) state.showCalendar = false;
    render();
});
document.getElementById('manageCatsBtn').addEventListener('click', () => {
    state.showCategoryManager = !state.showCategoryManager;
    if (state.showCategoryManager) {
        state.showForm = false;
        state.showTrash = false;
        state.showCalendar = false;
    }
    render();
});
document.getElementById('calendarViewBtn').addEventListener('click', () => {
    state.showCalendar = !state.showCalendar;
    if (state.showCalendar) {
        state.showForm = false;
        state.showTrash = false;
        state.showCategoryManager = false;
    }
    render();
});

// Délégation d'événements globale
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    const value = target.dataset.value;

    switch (action) {
        case 'setSmartFilter':
            setSmartFilter(value);
            break;
        case 'setSidebarCategoryFilter':
            setSidebarCategoryFilter(value);
            break;
        case 'toggleSidebarCategories':
            toggleSidebarCategories();
            break;
        case 'setFilterStatus':
            setFilterStatus(value);
            break;
        case 'toggleTask':
            e.stopPropagation();
            toggleTask(id);
            break;
        case 'toggleExpandTask':
            e.stopPropagation();
            toggleExpandTask(id);
            break;
        case 'startEditing':
            e.stopPropagation();
            startEditing(id);
            break;
        case 'deleteTask':
            e.stopPropagation();
            deleteTask(id);
            break;
        case 'startInlineEdit':
            e.stopPropagation();
            startInlineEdit(id);
            break;
        case 'toggleSubtask':
            e.stopPropagation();
            toggleSubtask(target.dataset.taskId, target.dataset.subtaskId);
            break;
        case 'handleModalAction':
            handleModalAction(value);
            break;
        case 'restoreTask':
            restoreTask(id);
            break;
        case 'deletePermanently':
            deletePermanently(id);
            break;
        case 'changeCalendarMonth':
            changeCalendarMonth(parseInt(value));
            break;
    }
});

// Écouteurs globaux pour l'unification
document.addEventListener('change', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    if (target.dataset.action === 'updateCategory') {
        updateCategory(target.dataset.index, target.dataset.field, target.value);
    }
});

document.addEventListener('keydown', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    if (target.dataset.action === 'inlineEditInput') {
        if (e.key === 'Enter') saveInlineEdit(target.dataset.id, target.value);
        if (e.key === 'Escape') cancelInlineEdit();
    }
});

document.addEventListener('focusout', (e) => {
    const target = e.target.closest('[data-action="inlineEditInput"]');
    if (target) setTimeout(() => saveInlineEdit(target.dataset.id, target.value), 150);
});

// Délégation pour le drag & drop
document.addEventListener('dragstart', (e) => {
    const target = e.target.closest('[draggable="true"]');
    if (target) handleDragStart(e, target.dataset.id);
});
document.addEventListener('dragend', handleDragEnd);
document.addEventListener('dragover', handleDragOver);
document.addEventListener('dragleave', handleDragLeave);
document.addEventListener('drop', (e) => {
    const target = e.target.closest('.task-item');
    if (target) handleDrop(e, target.dataset.id);
});

// Rendu initial
applyTheme();
render();