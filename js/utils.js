/**
 * Échappe les caractères HTML pour prévenir les injections XSS, y compris dans les attributs.
 * @param {string} str - La chaîne à sécuriser.
 * @returns {string} - La chaîne échappée.
 */
export function escapeHTML(str) {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Formate une date ISO en chaîne lisible (ex: 22 avr 2026).
 * @param {string} dateString - Date au format ISO.
 * @returns {string}
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Vérifie si une tâche est en retard.
 * @param {string} dueDate - Date d'échéance.
 * @param {boolean} completed - Statut de complétion.
 * @returns {boolean}
 */
export function isOverdue(dueDate, completed) {
    if (completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateDue = new Date(dueDate);
    dateDue.setHours(0, 0, 0, 0);
    return dateDue < today;
}

/**
 * Retourne les classes CSS Tailwind selon la priorité.
 * @param {string} priority - low, medium ou high.
 * @returns {string}
 */
export function getPriorityColor(priority) {
    const colors = {
        high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
        medium: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900',
        low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900'
    };
    return colors[priority] || '';
}

/**
 * Retourne le libellé lisible de la priorité.
 * @param {string} priority 
 * @returns {string}
 */
export function getPriorityLabel(priority) {
    return { high: 'Haute', medium: 'Moyenne', low: 'Basse' }[priority] || priority;
}

/**
 * Génère le style CSS inline pour les pastilles de catégorie.
 * @param {string} categoryName 
 * @param {Array} categories - Liste des catégories du state.
 */
export function getCategoryStyle(categoryName, categories) {
    const cat = categories.find(c => c.name === categoryName);
    if (!cat) return 'background-color: #e5e7eb; color: #374151;';

    // Normalisation de la couleur : on s'assure d'avoir un Hex à 6 caractères
    let color = cat.color.startsWith('#') ? cat.color : '#3b82f6';
    if (color.length === 4) { // Gestion du format court #RGB
        color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    
    // On s'assure de n'avoir que 6 caractères hexadécimaux avant d'ajouter l'opacité
    const baseColor = color.slice(0, 7);
    return `background-color: ${baseColor}20; color: ${baseColor}; border: 1px solid ${baseColor}40;`;
}