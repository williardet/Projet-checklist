function generateTaskId() {
  return `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// Lit l'identifiant de la checklist depuis l'URL.
const params = new URLSearchParams(window.location.search);
const checklistId = params.get("checklistId");
const storageKey = checklistId ? `tasks-${checklistId}` : null;

const addForm = document.getElementById("addForm");
const searchInput = document.getElementById("searchInput");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const dueDateInput = document.getElementById("dueDateInput");
const priorityInput = document.getElementById("priorityInput");
const filterAllTasksButton = document.getElementById("filter-all-tasks");
const filterPendingTasksButton = document.getElementById("filter-pending-tasks");
const filterDoneTasksButton = document.getElementById("filter-done-tasks");
const sortPriorityButton = document.getElementById("sort-priority");
const sortTitleButton = document.getElementById("sort-title");
const sortProgressButton = document.getElementById("sort-progress");
const dataTable = document.getElementById("dataTable");
const tableScrollArea = document.getElementById("tableScrollArea");
const tableBody = dataTable.querySelector("tbody");
const noDataMessage = document.getElementById("noDataMessage");
const checklistsNav = document.getElementById("checklistsNav");
const tasksTableTitle = document.getElementById("tasksTableTitle");
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editTitleInput = document.getElementById("editTitleInput");
const editDescriptionInput = document.getElementById("editDescriptionInput");
const editDueDateInput = document.getElementById("editDueDateInput");
const editPriorityInput = document.getElementById("editPriorityInput");
const titleError = document.getElementById("titleError");
const descriptionError = document.getElementById("descriptionError");
const editTitleError = document.getElementById("editTitleError");
const editDescriptionError = document.getElementById("editDescriptionError");
const closeEditModalButton = document.getElementById("closeEditModal");
const cancelEditModalButton = document.getElementById("cancelEditModal");
const deleteModal = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const closeDeleteModalButton = document.getElementById("closeDeleteModal");
const cancelDeleteModalButton = document.getElementById("cancelDeleteModal");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");

const checklists = JSON.parse(localStorage.getItem("checklists") || "[]");
const currentChecklist = checklists.find((checklist) => checklist.id === checklistId);

// Charge les taches de la checklist puis complete les champs manquants.
let tasks = storageKey ? JSON.parse(localStorage.getItem(storageKey) || "[]") : [];
tasks = tasks.map((task) => ({
  done: false,
  dueDate: "",
  priority: "moyenne",
  ...task,
  id: task.id || generateTaskId(),
}));

let editingTaskId = null;
let deletingTaskId = null;
let currentSearch = "";
let currentTaskFilter = "all";
let currentSort = "priority";



function showFieldError(input, errorElement, message) {
  input.classList.add("border-red-500", "ring-1", "ring-red-200");
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");
}

function clearFieldError(input, errorElement) {
  input.classList.remove("border-red-500", "ring-1", "ring-red-200");
  errorElement.textContent = "";
  errorElement.classList.add("hidden");
}

function validateRequiredFields(fields) {
  let isValid = true;

  fields.forEach(({ input, errorElement, message }) => {
    if (!input.value.trim()) {
      showFieldError(input, errorElement, message);
      isValid = false;
      return;
    }

    clearFieldError(input, errorElement);
  });

  return isValid;
}

function setActiveTaskFilter(filterName) {
  const filters = {
    all: filterAllTasksButton,
    pending: filterPendingTasksButton,
    done: filterDoneTasksButton,
  };

  Object.entries(filters).forEach(([name, button]) => {
    const isActive = name === filterName;

    button.classList.toggle("bg-blue-800", isActive);
    button.classList.toggle("text-white", isActive);
    button.classList.toggle("border-blue-800", isActive);
    button.classList.toggle("border-slate-300", !isActive);
    button.classList.toggle("text-slate-700", !isActive);
  });
}

function setActiveSortButton(sortName) {
  const sorters = {
    priority: sortPriorityButton,
    title: sortTitleButton,
    progress: sortProgressButton,
  };

  Object.entries(sorters).forEach(([name, button]) => {
    const isActive = name === sortName;

    button.classList.toggle("bg-blue-800", isActive);
    button.classList.toggle("text-white", isActive);
    button.classList.toggle("border-blue-800", isActive);
    button.classList.toggle("border-slate-300", !isActive);
    button.classList.toggle("text-slate-700", !isActive);
  });
}

function formatDueDate(dateString) {
  if (!dateString) {
    return "";
  }

  // Formate la date stockee pour un affichage lisible dans l'interface.
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${dateString}T00:00:00`));
}

function isOverdue(dateString) {
  if (!dateString) {
    return false;
  }

  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(`${dateString}T00:00:00`);

  // Compare uniquement les jours pour eviter les ecarts lies a l'heure.
  return dueDate < currentDate;
}

// Desactive le formulaire si la page a ete ouverte sans checklist valide.
function disableTaskForm() {
  titleInput.disabled = true;
  descriptionInput.disabled = true;
  dueDateInput.disabled = true;
  addForm.querySelector('button[type="submit"]').disabled = true;
}

function saveTasks() {
  if (!storageKey) {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

/*
  Ancienne approche retiree :
  - prompt("Nouveau titre")
  - prompt("Nouvelle description")
  - confirm("Supprimer cette tache ?")
  Ces boites navigateur ont ete remplacees par des modales.
*/

// Ouvre la modale d'edition pour la tache selectionnee.
function openEditModal(task) {
  editingTaskId = task.id;
  editTitleInput.value = task.title;
  editDescriptionInput.value = task.description;
  editDueDateInput.value = task.dueDate || "";
  editPriorityInput.value = task.priority || "moyenne";
  editModal.classList.remove("hidden");
  editModal.classList.add("flex");
  editTitleInput.focus();
}

// Ferme la modale d'edition et remet son etat a zero.
function closeEditModal() {
  editingTaskId = null;
  editForm.reset();
  clearFieldError(editTitleInput, editTitleError);
  clearFieldError(editDescriptionInput, editDescriptionError);
  editPriorityInput.value = "moyenne";
  editModal.classList.remove("flex");
  editModal.classList.add("hidden");
}

// Ouvre une confirmation de suppression pour la tache selectionnee.
function openDeleteModal(task) {
  deletingTaskId = task.id;
  deleteModalText.textContent = `Supprimer definitivement la tache "${task.title}" ?`;
  deleteModal.classList.remove("hidden");
}

// Ferme la modale de suppression.
function closeDeleteModal() {
  deletingTaskId = null;
  deleteModal.classList.add("hidden");
}

// Affiche un etat vide centre quand la checklist ne contient encore aucune tache.
function renderEmptyState() {
  let emptyMessage = "Cette checklist ne contient encore aucune tache.";

  if (currentTaskFilter === "pending") {
    emptyMessage = currentSearch
      ? "Aucune tache a faire ne correspond a votre recherche."
      : "Aucune tache a faire pour le moment.";
  } else if (currentTaskFilter === "done") {
    emptyMessage = currentSearch
      ? "Aucune tache terminee ne correspond a votre recherche."
      : "Aucune tache terminee pour le moment.";
  } else if (currentSearch) {
    emptyMessage = "Aucune tache ne correspond a votre recherche.";
  }

  noDataMessage.innerHTML = `
    <div class="flex max-w-sm flex-col items-center text-center">
      <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11"></path>
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-slate-700">${currentChecklist.title}</h3>
      <p class="mt-2 text-sm text-slate-500">${emptyMessage}</p>
    </div>
  `;
  noDataMessage.style.display = "flex";
}

function getFilteredTasks() {
  let filteredTasks;

  switch (currentTaskFilter) {
    case "pending":
      filteredTasks = tasks.filter((task) => !task.done);
      break;
    case "done":
      filteredTasks = tasks.filter((task) => task.done);
      break;
    default:
      filteredTasks = tasks;
  }

  // Appliquer la recherche
  if (currentSearch) {
    const normalizedSearch = currentSearch.toLowerCase();
    filteredTasks = filteredTasks.filter((task) => {
      const title = task.title.toLowerCase();
      const description = task.description.toLowerCase();
      return (
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }

  // Appliquer le tri selon le type choisi
  switch (currentSort) {
    case "title":
      filteredTasks.sort((a, b) => {
        return a.title.localeCompare(b.title, "fr");
      });
      break;
    case "progress":
      filteredTasks.sort((a, b) => {
        // Les tâches non faites en premier, puis les tâches faites
        if (a.done === b.done) {
          // Si même état, trier par priorité
          const priorityOrder = { haute: 0, moyenne: 1, basse: 2 };
          const priorityA = priorityOrder[a.priority] ?? 1;
          const priorityB = priorityOrder[b.priority] ?? 1;
          return priorityA - priorityB;
        }
        return a.done ? 1 : -1;
      });
      break;
    case "priority":
    default:
      // Trier par priorité (haute, moyenne, basse)
      const priorityOrder = { haute: 0, moyenne: 1, basse: 2 };
      filteredTasks.sort((a, b) => {
        const priorityA = priorityOrder[a.priority] ?? 1;
        const priorityB = priorityOrder[b.priority] ?? 1;
        return priorityA - priorityB;
      });
  }

  return filteredTasks;
}

// Remplit la barre laterale avec toutes les checklists et souligne celle ouverte.
function renderChecklistNav() {
  checklistsNav.innerHTML = "";

  if (checklists.length === 0) {
    checklistsNav.innerHTML = '<p class="text-sm text-blue-200">Aucune checklist</p>';
    return;
  }

  checklists.forEach((checklist) => {
    const isActive = checklist.id === checklistId;
    const link = document.createElement("a");
    const checklistTaskCount = JSON.parse(localStorage.getItem(`tasks-${checklist.id}`) || "[]").length;

    link.href = `../pages/taches.html?checklistId=${checklist.id}`;
    link.className = `block rounded px-3 py-2 text-sm transition ${
      isActive
        ? "bg-white/15 font-semibold text-white ring-1 ring-white/20"
        : "text-blue-100 hover:bg-blue-800"
    }`;
    link.textContent = `${checklist.title} (${checklistTaskCount})`;

    checklistsNav.appendChild(link);
  });
}

// Met a jour l'etat "done" de la checklist parente selon ses taches.
function updateChecklistDoneState() {
  if (!currentChecklist) {
    return;
  }

  const allDone = tasks.length > 0 && tasks.every((task) => task.done === true);
  const updatedChecklists = JSON.parse(localStorage.getItem("checklists") || "[]");
  const checklist = updatedChecklists.find((item) => item.id === checklistId);

  if (!checklist) {
    return;
  }

  checklist.done = allDone;
  localStorage.setItem("checklists", JSON.stringify(updatedChecklists));
}

// Affiche les taches de la checklist selectionnee.
function renderTable() {
  tableBody.innerHTML = "";
  setActiveTaskFilter(currentTaskFilter);
  setActiveSortButton(currentSort);

  if (!currentChecklist) {
    tasksTableTitle.textContent = "Checklist";
    noDataMessage.textContent = "Checklist introuvable.";
    noDataMessage.style.display = "block";
    tableScrollArea.classList.add("hidden");
    dataTable.classList.add("hidden");
    disableTaskForm();
    return;
  }

  // L'en-tete du tableau reprend le nom de la checklist ouverte.
  tasksTableTitle.textContent = currentChecklist.title;

  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    renderEmptyState();
    tableScrollArea.classList.add("hidden");
    dataTable.classList.add("hidden");
    return;
  }

  noDataMessage.style.display = "none";
  tableScrollArea.classList.remove("hidden");
  dataTable.classList.remove("hidden");

  filteredTasks.forEach((task) => {
    const dueDateLabel = formatDueDate(task.dueDate);
    const overdue = isOverdue(task.dueDate) && !task.done;
    // Affiche l'echeance sous la tache si une date a ete definie.
    const dueDateMarkup = dueDateLabel
      ? `
          <div class="mt-2 text-xs ${overdue ? "font-semibold text-red-600" : "text-slate-500"}">
            Echeance : ${dueDateLabel}
          </div>
        `
      : "";
    
    // Determines la couleur du badge de priorite
    let priorityColor = "bg-slate-100 text-slate-700";
    let priorityLabel = "Moyenne";
    if (task.priority === "haute") {
      priorityColor = "bg-red-100 text-red-700 font-semibold";
      priorityLabel = "Haute";
    } else if (task.priority === "basse") {
      priorityColor = "bg-green-100 text-green-700";
      priorityLabel = "Basse";
    }

    const priorityBadge = `<span class="priority-badge inline-block px-2 py-1 rounded text-xs ${priorityColor}">${priorityLabel}</span>`;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="relative border-b p-2">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <button
              type="button"
              class="check-btn mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border transition ${
                task.done
                  ? "border-green-600 bg-green-50 text-green-600"
                  : "border-slate-300 bg-white text-transparent hover:border-green-500"
              }"
              aria-label="${task.done ? "Marquer comme non faite" : "Marquer comme faite"}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11"></path>
              </svg>
            </button>

            <div class="min-w-0">
              <strong class="${task.done ? "line-through text-gray-400" : ""}">
                ${task.title}
              </strong><br/>
              <span class="text-sm text-gray-600 ${task.done ? "line-through text-gray-400" : ""}">
                ${task.description}
              </span>
              <div class="mt-2 flex items-center gap-2">
                ${priorityBadge}
                ${dueDateMarkup ? `<span class="text-xs ${overdue ? "font-semibold text-red-600" : "text-slate-500"}">Echeance : ${dueDateLabel}</span>` : ""}
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <button type="button" class="edit-btn rounded p-2 text-slate-600 hover:bg-gray-100 hover:text-slate-900" aria-label="Modifier la tache">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"></path>
              </svg>
            </button>
            <button type="button" class="delete-btn rounded p-2 text-red-600 hover:bg-red-50 hover:text-red-700" aria-label="Supprimer la tache">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
              </svg>
            </button>
          </div>
        </div>
      </td>
    `;

    row.querySelector(".edit-btn").addEventListener("click", () => {
      openEditModal(task);
    });

    // La case a gauche sert de controle visuel pour l'etat termine / non termine.
    row.querySelector(".check-btn").addEventListener("click", () => {
      task.done = !task.done;
      saveTasks();
      updateChecklistDoneState();
      renderTable();
    });

    row.querySelector(".delete-btn").addEventListener("click", () => {
      openDeleteModal(task);
    });

    tableBody.appendChild(row);
  });
}

// Ajoute une tache a la checklist courante.
addForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentChecklist) {
    return;
  }

  const isValid = validateRequiredFields([
    {
      input: titleInput,
      errorElement: titleError,
      message: "Le titre est obligatoire.",
    },
    {
      input: descriptionInput,
      errorElement: descriptionError,
      message: "La description est obligatoire.",
    },
  ]);

  if (!isValid) {
    return;
  }

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const dueDate = dueDateInput.value;
  const priority = priorityInput.value;

  tasks.push({
    id: generateTaskId(),
    title,
    description,
    dueDate,
    priority,
    done: false,
  });

  saveTasks();
  updateChecklistDoneState();
  addForm.reset();
  priorityInput.value = "moyenne";
  clearFieldError(titleInput, titleError);
  clearFieldError(descriptionInput, descriptionError);
  dueDateInput.value = "";
  renderChecklistNav();
  renderTable();
});

// Gere l'enregistrement des modifications depuis la modale.
editForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!editingTaskId) {
    return;
  }

  const isValid = validateRequiredFields([
    {
      input: editTitleInput,
      errorElement: editTitleError,
      message: "Le titre est obligatoire.",
    },
    {
      input: editDescriptionInput,
      errorElement: editDescriptionError,
      message: "La description est obligatoire.",
    },
  ]);

  if (!isValid) {
    return;
  }

  const trimmedTitle = editTitleInput.value.trim();
  const trimmedDesc = editDescriptionInput.value.trim();
  const dueDate = editDueDateInput.value;
  const priority = editPriorityInput.value;

  const task = tasks.find((item) => item.id === editingTaskId);

  if (!task) {
    closeEditModal();
    return;
  }

  task.title = trimmedTitle;
  task.description = trimmedDesc;
  task.dueDate = dueDate;
  task.priority = priority;
  saveTasks();
  updateChecklistDoneState();
  closeEditModal();
  renderTable();
});

closeEditModalButton.addEventListener("click", closeEditModal);
cancelEditModalButton.addEventListener("click", closeEditModal);
editModal.addEventListener("click", (event) => {
  if (event.target === editModal) {
    closeEditModal();
  }
});

confirmDeleteButton.addEventListener("click", () => {
  if (!deletingTaskId) {
    return;
  }

  tasks = tasks.filter((item) => item.id !== deletingTaskId);
  saveTasks();
  updateChecklistDoneState();
  closeDeleteModal();
  renderChecklistNav();
  renderTable();
});

closeDeleteModalButton.addEventListener("click", closeDeleteModal);
cancelDeleteModalButton.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) {
    closeDeleteModal();
  }
});

[titleInput, descriptionInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (input === titleInput) {
      clearFieldError(titleInput, titleError);
    } else {
      clearFieldError(descriptionInput, descriptionError);
    }
  });
});

[editTitleInput, editDescriptionInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (input === editTitleInput) {
      clearFieldError(editTitleInput, editTitleError);
    } else {
      clearFieldError(editDescriptionInput, editDescriptionError);
    }
  });
});

searchInput.addEventListener("input", () => {
  currentSearch = searchInput.value.trim();
  renderTable();
});

filterAllTasksButton.addEventListener("click", () => {
  currentTaskFilter = "all";
  renderTable();
});

filterPendingTasksButton.addEventListener("click", () => {
  currentTaskFilter = "pending";
  renderTable();
});

filterDoneTasksButton.addEventListener("click", () => {
  currentTaskFilter = "done";
  renderTable();
});

sortPriorityButton.addEventListener("click", () => {
  currentSort = "priority";
  renderTable();
});

sortTitleButton.addEventListener("click", () => {
  currentSort = "title";
  renderTable();
});

sortProgressButton.addEventListener("click", () => {
  currentSort = "progress";
  renderTable();
});

saveTasks();
updateChecklistDoneState();
renderChecklistNav();
renderTable();
