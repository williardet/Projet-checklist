function generateId(prefix = "checklist") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// Charge la liste des checklists sauvegardees dans le navigateur.
let data = JSON.parse(localStorage.getItem("checklists") || "[]");

// Ajoute les proprietes manquantes pour eviter les erreurs sur d'anciennes donnees.
data = data.map((item) => ({
  important: false,
  favorite: false,
  done: false,
  dueDate: "",
  ...item,
}));

const addForm = document.getElementById("addForm");
const searchInput = document.getElementById("searchInput");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const dueDateInput = document.getElementById("dueDateInput");
const dataTable = document.getElementById("dataTable");
const tableScrollArea = document.getElementById("tableScrollArea");
const tableBody = dataTable.querySelector("tbody");
const noDataMessage = document.getElementById("noDataMessage");
const totalCount = document.getElementById("totalCount");
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editTitleInput = document.getElementById("editTitleInput");
const editDescriptionInput = document.getElementById("editDescriptionInput");
const editDueDateInput = document.getElementById("editDueDateInput");
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

const filterLinks = {
  all: document.getElementById("filter-all"),
  important: document.getElementById("filter-important"),
  favorite: document.getElementById("filter-favorite"),
  done: document.getElementById("filter-done"),
};

// Memorise le filtre actif pour garder la meme vue apres chaque action.
let currentFilter = "all";
let currentSearch = "";
let editingChecklistId = null;
let deletingChecklistId = null;

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

function setActiveFilter(filterName) {
  Object.entries(filterLinks).forEach(([name, link]) => {
    link.classList.toggle("active-link", name === filterName);
  });
}

// Retourne uniquement les checklists correspondant au filtre selectionne.
function getFilteredData() {
  let filteredData;

  switch (currentFilter) {
    case "important":
      filteredData = data.filter((item) => item.important);
      break;
    case "favorite":
      filteredData = data.filter((item) => item.favorite);
      break;
    case "done":
      filteredData = data.filter((item) => item.done);
      break;
    default:
      filteredData = data;
  }

  if (!currentSearch) {
    return filteredData;
  }

  const normalizedSearch = currentSearch.toLowerCase();

  return filteredData.filter((item) => {
    const title = item.title.toLowerCase();
    const description = item.description.toLowerCase();

    return (
      title.includes(normalizedSearch) ||
      description.includes(normalizedSearch)
    );
  });
}

function saveData() {
  localStorage.setItem("checklists", JSON.stringify(data));
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

/*
  Ancienne approche retiree :
  - prompt("Nouveau titre")
  - prompt("Nouvelle description")
  - confirm("Supprimer cette checklist ?")
  Ces boites navigateur ont ete remplacees par des modales.
*/

// Ouvre la modale d'edition et pre-remplit le formulaire.
function openEditModal(item) {
  editingChecklistId = item.id;
  editTitleInput.value = item.title;
  editDescriptionInput.value = item.description;
  editDueDateInput.value = item.dueDate || "";
  editModal.classList.remove("hidden");
  editModal.classList.add("flex");
  editTitleInput.focus();
}

// Ferme la modale d'edition puis nettoie sa selection.
function closeEditModal() {
  editingChecklistId = null;
  editForm.reset();
  clearFieldError(editTitleInput, editTitleError);
  clearFieldError(editDescriptionInput, editDescriptionError);
  editModal.classList.remove("flex");
  editModal.classList.add("hidden");
}

// Ouvre une confirmation de suppression pour la checklist cible.
function openDeleteModal(item) {
  deletingChecklistId = item.id;
  deleteModalText.textContent = `Supprimer definitivement la checklist "${item.title}" et toutes ses taches ?`;
  deleteModal.classList.remove("hidden");
}

// Ferme la confirmation de suppression.
function closeDeleteModal() {
  deletingChecklistId = null;
  deleteModal.classList.add("hidden");
}

// Recupere toutes les taches liees a une checklist pour calculer son etat.
function getChecklistTasks(checklistId) {
  return JSON.parse(localStorage.getItem(`tasks-${checklistId}`) || "[]");
}

// Construit les statistiques affichees sous chaque checklist.
function getChecklistStats(checklistId) {
  const tasks = getChecklistTasks(checklistId);
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  const remaining = total - done;
  const isDone = total > 0 && done === total;
  const overdue = isOverdue(data.find((item) => item.id === checklistId)?.dueDate || "");

  return {
    total,
    done,
    remaining,
    isDone,
    overdue,
    statusLabel: isDone ? "Fait" : "En cours",
    statusClasses: isDone
      ? "bg-green-100 text-green-700"
      : "bg-amber-100 text-amber-700",
  };
}

// Definit le visuel a afficher quand une section ne contient encore aucune checklist.
function getEmptyStateConfig() {
  const hasSearch = Boolean(currentSearch);

  switch (currentFilter) {
    case "important":
      return {
        title: "Importants",
        message: hasSearch
          ? "Aucune checklist importante ne correspond a votre recherche."
          : "Aucune checklist importante pour le moment.",
        iconColor: "#1E3A8A",
        iconPath:
          '<path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>',
      };
    case "favorite":
      return {
        title: "Favoris",
        message: hasSearch
          ? "Aucune checklist favorite ne correspond a votre recherche."
          : "Aucune checklist favorite pour le moment.",
        iconColor: "#ec4899",
        iconPath:
          '<path d="M12 21s-6.7-4.35-9.33-8.28A5.56 5.56 0 0 1 12 5.82a5.56 5.56 0 0 1 9.33 6.9C18.7 16.65 12 21 12 21Z"></path>',
      };
    case "done":
      return {
        title: "Terminees",
        message: hasSearch
          ? "Aucune checklist terminee ne correspond a votre recherche."
          : "Aucune checklist terminee pour le moment.",
        iconColor: "#16a34a",
        iconPath:
          '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11"></path>',
      };
    default:
      return {
        title: "Mes checklists",
        message: hasSearch
          ? "Aucune checklist ne correspond a votre recherche."
          : "Aucune checklist n'a encore ete ajoutee.",
        iconColor: "#475569",
        iconPath:
          '<line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line>',
      };
  }
}

// Affiche un etat vide centre avec une icone et le titre de la section courante.
function renderEmptyState() {
  const config = getEmptyStateConfig();

  noDataMessage.innerHTML = `
    <div class="flex max-w-sm flex-col items-center text-center">
      <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="${config.iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          ${config.iconPath}
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-slate-700">${config.title}</h3>
      <p class="mt-2 text-sm text-slate-500">${config.message}</p>
    </div>
  `;
  noDataMessage.style.display = "flex";
}

// Recalcule toute l'interface a partir de l'etat courant.
function refreshView() {
  setActiveFilter(currentFilter);
  renderTable(getFilteredData());
}

// Affiche les checklists dans le tableau principal.
function renderTable(list) {
  tableBody.innerHTML = "";
  totalCount.textContent = data.length.toString().padStart(2, "0");

  if (list.length === 0) {
    renderEmptyState();
    tableScrollArea.classList.add("hidden");
    dataTable.classList.add("hidden");
    return;
  }

  noDataMessage.style.display = "none";
  tableScrollArea.classList.remove("hidden");
  dataTable.classList.remove("hidden");

  list.forEach((item) => {
    const stats = getChecklistStats(item.id);
    const dueDateLabel = formatDueDate(item.dueDate);
    // Affiche l'echeance sous la checklist si une date a ete definie.
    const dueDateMarkup = dueDateLabel
      ? `
          <div class="mt-2 text-xs ${stats.overdue && !stats.isDone ? "font-semibold text-red-600" : "text-slate-600"}">
            Echeance : ${dueDateLabel}
          </div>
        `
      : "";
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="cursor-pointer border-b p-2" data-id="${item.id}">
        <strong class="${stats.isDone ? "line-through text-slate-400" : ""}">${item.title}</strong><br/>
        <span class="text-sm text-gray-600">${item.description}</span>
        ${dueDateMarkup}
        <div class="mt-3 rounded-md bg-slate-50 px-3 py-2">
          <div class="flex items-center gap-2 text-sm">
            <span class="font-semibold text-slate-700">Etat :</span>
            <span class="rounded-full px-2 py-1 text-xs font-semibold ${stats.statusClasses}">
              ${stats.statusLabel}
            </span>
          </div>
          <div class="mt-2 text-xs text-slate-600">
            <span class="mr-3">Faites : ${stats.done}</span>
            <span class="mr-3">En cours : ${stats.remaining}</span>
            <span>Total : ${stats.total}</span>
          </div>
        </div>
      </td>

      <td class="relative border-b p-2 text-right">
        <div class="flex items-center justify-end gap-1">
          <button type="button" class="menu-btn rounded p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label="Ouvrir le menu">
            <svg xmlns="http://www.w3.org/2000/svg" class="inline-block h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="4" y1="7" x2="20" y2="7"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="17" x2="20" y2="17"></line>
            </svg>
          </button>
        </div>

        <div class="menu hidden absolute right-2 top-11 z-20 w-40 rounded border border-slate-200 bg-white shadow-lg ring-1 ring-slate-200">
          <button type="button" class="edit-btn flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"></path>
            </svg>
            <span>Modifier</span>
          </button>
          <button type="button" class="delete-btn flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="M19 6l-1 14H6L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
            </svg>
            <span>Supprimer</span>
          </button>
          <button type="button" class="important-btn flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100"></button>
          <button type="button" class="favorite-btn flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100"></button>
        </div>
      </td>
    `;

    row.querySelector("td[data-id]").addEventListener("click", () => {
      window.location.href = `pages/taches.html?checklistId=${item.id}`;
    });

    const menuBtn = row.querySelector(".menu-btn");
    const menu = row.querySelector(".menu");

    menuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      document.querySelectorAll(".menu").forEach((otherMenu) => {
        if (otherMenu !== menu) {
          otherMenu.classList.add("hidden");
        }
      });
      menu.classList.toggle("hidden");
    });

    row.querySelector(".edit-btn").addEventListener("click", () => {
      openEditModal(item);
    });

    row.querySelector(".delete-btn").addEventListener("click", () => {
      openDeleteModal(item);
    });

    const importantButton = row.querySelector(".important-btn");
    importantButton.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="${item.important ? "#1E3A8A" : "none"}"
        stroke="${item.important ? "#1E3A8A" : "currentColor"}"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
      </svg>
      <span>${item.important ? "Retirer important" : "Marquer important"}</span>
    `;
    importantButton.addEventListener("click", () => {
      item.important = !item.important;
      saveData();
      refreshView();
    });

    const favoriteButton = row.querySelector(".favorite-btn");
    favoriteButton.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="${item.favorite ? "#ec4899" : "none"}"
        stroke="${item.favorite ? "#ec4899" : "currentColor"}"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M12 21s-6.7-4.35-9.33-8.28A5.56 5.56 0 0 1 12 5.82a5.56 5.56 0 0 1 9.33 6.9C18.7 16.65 12 21 12 21Z"></path>
      </svg>
      <span>${item.favorite ? "Retirer favori" : "Marquer favori"}</span>
    `;
    favoriteButton.addEventListener("click", () => {
      item.favorite = !item.favorite;
      saveData();
      refreshView();
    });

    tableBody.appendChild(row);
  });
}

filterLinks.all.addEventListener("click", () => {
  currentFilter = "all";
  refreshView();
});

filterLinks.important.addEventListener("click", () => {
  currentFilter = "important";
  refreshView();
});

filterLinks.favorite.addEventListener("click", () => {
  currentFilter = "favorite";
  refreshView();
});

filterLinks.done.addEventListener("click", () => {
  currentFilter = "done";
  refreshView();
});

// Ferme tous les menus si on clique ailleurs sur la page.
document.addEventListener("click", () => {
  document.querySelectorAll(".menu").forEach((menu) => menu.classList.add("hidden"));
});

// Ajoute une nouvelle checklist puis rafraichit la vue active.
addForm.addEventListener("submit", (event) => {
  event.preventDefault();

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

  data.push({
    id: generateId(),
    title,
    description,
    dueDate,
    important: false,
    favorite: false,
    done: false,
  });

  saveData();
  addForm.reset();
  clearFieldError(titleInput, titleError);
  clearFieldError(descriptionInput, descriptionError);
  dueDateInput.value = "";
  refreshView();
});

// Gere l'enregistrement des modifications depuis la modale.
editForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!editingChecklistId) {
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

  const checklist = data.find((item) => item.id === editingChecklistId);

  if (!checklist) {
    closeEditModal();
    return;
  }

  checklist.title = trimmedTitle;
  checklist.description = trimmedDesc;
  checklist.dueDate = dueDate;
  saveData();
  closeEditModal();
  refreshView();
});

closeEditModalButton.addEventListener("click", closeEditModal);
cancelEditModalButton.addEventListener("click", closeEditModal);
editModal.addEventListener("click", (event) => {
  if (event.target === editModal) {
    closeEditModal();
  }
});

confirmDeleteButton.addEventListener("click", () => {
  if (!deletingChecklistId) {
    return;
  }

  data = data.filter((checklist) => checklist.id !== deletingChecklistId);
  localStorage.removeItem(`tasks-${deletingChecklistId}`);
  saveData();
  closeDeleteModal();
  refreshView();
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
  refreshView();
});

refreshView();
