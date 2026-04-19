/**
 * Charge une donnée du localStorage avec gestion d'erreur try/catch.
 * @param {string} key - La clé dans le storage.
 * @param {any} defaultValue - Valeur de secours.
 */
function loadFromStorage(key, defaultValue) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error(`Erreur de lecture localStorage [${key}]:`, error);
        return defaultValue;
    }
}

export const state = {
    tasks: loadFromStorage('tasks', []),
    categories: loadFromStorage('categories', [
        { name: 'Travail', color: '#3b82f6' },
        { name: 'Personnel', color: '#a855f7' },
        { name: 'Shopping', color: '#ec4899' },
        { name: 'Santé', color: '#14b8a6' },
        { name: 'Études', color: '#6366f1' }
    ]),
    trashedTasks: loadFromStorage('trashedTasks', []),
    isDark: localStorage.getItem('theme') === 'dark',
    showForm: false,
    showTrash: false,
    showCategoryManager: false,
    showCalendar: false,
    isCategoryExpanded: true,
    smartFilter: 'all',
    calendarViewDate: new Date(loadFromStorage('calendarDate', new Date())),
    filterStatus: 'all',
    filterCategory: 'all',
    filterPriority: 'all',
    searchQuery: '',
    trashSearchQuery: '',
    expandedTasks: [],
    editingTaskId: null,
    inlineEditingId: null,
    modal: {
        show: false,
        type: 'alert',
        title: '',
        message: '',
        placeholder: '',
        resolve: null
    }
};

/**
 * Sauvegarde l'état actuel dans le localStorage.
 */
export function saveState() {
    try {
        localStorage.setItem('tasks', JSON.stringify(state.tasks));
        localStorage.setItem('categories', JSON.stringify(state.categories));
        localStorage.setItem('trashedTasks', JSON.stringify(state.trashedTasks));
        localStorage.setItem('theme', state.isDark ? 'dark' : 'light');
        localStorage.setItem('calendarDate', state.calendarViewDate.toISOString());
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du state:", error);
    }
}

// Actions centralisées pour modifier le state
export const actions = {
    addTask: (taskData) => {
        const newTask = { 
            ...taskData, 
            id: crypto.randomUUID(), 
            createdAt: new Date().toISOString() 
        };
        state.tasks.unshift(newTask);
        return newTask;
    },
    updateTask: (id, data) => {
        const index = state.tasks.findIndex(t => t.id === id);
        if (index !== -1) state.tasks[index] = { ...state.tasks[index], ...data };
    },
    toggleTask: (id) => {
        const task = state.tasks.find(t => t.id === id);
        if (task) task.completed = !task.completed;
    },
    toggleSubtask: (taskId, subtaskId) => {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            const st = task.subtasks?.find(s => s.id === subtaskId);
            if (st) st.completed = !st.completed;
        }
    },
    reorderTasks: (draggedId, targetId) => {
        const draggedIndex = state.tasks.findIndex(t => t.id === draggedId);
        const [draggedTask] = state.tasks.splice(draggedIndex, 1);
        const targetIndex = state.tasks.findIndex(t => t.id === targetId);
        state.tasks.splice(targetIndex, 0, draggedTask);
    },
    deleteTask: (id) => {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            state.trashedTasks.unshift(task);
            state.tasks = state.tasks.filter(t => t.id !== id);
        }
    },
    addCategory: (name, color = '#6366f1') => {
        state.categories.push({ name, color });
    },
    updateCategory: (index, field, value) => {
        const oldName = state.categories[index].name;
        state.categories[index][field] = value;
        if (field === 'name') {
            state.tasks.forEach(t => { if (t.category === oldName) t.category = value; });
        }
    },
    deleteCategory: (index) => {
        state.categories.splice(index, 1);
    }
};