function generateId() {
  return 'checklist-' + Date.now();
}

let data = JSON.parse(localStorage.getItem("checklists") || "[]");

// Ajout des propriétés manquantes pour éviter les erreurs
data = data.map(item => ({
  important: false,
  favorite: false,
  done: false,
  ...item
}));

const addForm = document.getElementById("addForm");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const dataTable = document.getElementById("dataTable");
const tableBody = dataTable.querySelector("tbody");
const noDataMessage = document.getElementById("noDataMessage");
const totalCount = document.getElementById("totalCount");

const links = document.querySelectorAll("nav a");

function setActive(link) {
  links.forEach(a => a.classList.remove("active-link"));
  link.classList.add("active-link");
}

// Filtres
document.getElementById("filter-all").addEventListener("click", (e) => {
  setActive(e.target);
  renderTable(data);
});

document.getElementById("filter-important").addEventListener("click", (e) => {
  setActive(e.target);
  renderTable(data.filter(item => item.important));
});

document.getElementById("filter-favorite").addEventListener("click", (e) => {
  setActive(e.target);
  renderTable(data.filter(item => item.favorite));
});

document.getElementById("filter-done").addEventListener("click", (e) => {
  setActive(e.target);
  renderTable(data.filter(item => item.done));
});

function saveData() {
  localStorage.setItem("checklists", JSON.stringify(data));
}

function renderTable(list = data) {
  tableBody.innerHTML = "";
  totalCount.textContent = list.length.toString().padStart(2, '0');

  if (list.length === 0) {
    noDataMessage.style.display = "block";
    dataTable.style.display = "none";
    return;
  }

  noDataMessage.style.display = "none";
  dataTable.style.display = "table";

  list.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="p-2 border-b cursor-pointer" data-id="${item.id}">
        <strong>${item.title}</strong><br/>
        <span class="text-sm text-gray-600">${item.description}</span>
      </td>

      <td class="p-2 border-b text-right relative">
        <button class="menu-btn text-xl px-2">⋮</button>

        <div class="menu hidden absolute right-2 top-8 bg-white border rounded shadow-md w-32">
          <button class="edit-btn block w-full text-left px-3 py-2 hover:bg-gray-100">Modifier</button>
          <button class="delete-btn block w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600">Supprimer</button>
          <button class="important-btn block w-full text-left px-3 py-2 hover:bg-gray-100">Important</button>
          <button class="favorite-btn block w-full text-left px-3 py-2 hover:bg-gray-100">Favori</button>
        </div>
      </td>
    `;

    // Ouvrir checklist
    row.querySelector("td[data-id]").addEventListener("click", () => {
      window.location.href = `pages/taches.html?checklistId=${item.id}`;
    });

    // Menu ⋮
    const menuBtn = row.querySelector(".menu-btn");
    const menu = row.querySelector(".menu");

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
    });

    // Modifier
    row.querySelector(".edit-btn").addEventListener("click", () => {
      const newTitle = prompt("Nouveau titre :", item.title);
      const newDesc = prompt("Nouvelle description :", item.description);

      if (newTitle && newDesc) {
        item.title = newTitle;
        item.description = newDesc;
        saveData();
        renderTable(list);
      }
    });

    // Supprimer
    row.querySelector(".delete-btn").addEventListener("click", () => {
      if (confirm("Supprimer cette checklist ?")) {
        data = data.filter(d => d.id !== item.id);
        saveData();
        renderTable(list);
      }
    });

    // Marquer important
    const btnImp = row.querySelector(".important-btn");

    btnImp.textContent = item.important ? "Retirer important" : "Marquer important";

    btnImp.addEventListener("click", () => {
      item.important = !item.important;

      // Mettre à jour le texte du bouton après le clic
      btnImp.textContent = item.important ? "Retirer important" : "Marquer important";
      saveData();
      renderTable(data);
    });


    // Marquer favori
    const bntFav = row.querySelector(".favorite-btn");

    bntFav.textContent = item.favorite ? "Retirer favorite":"Marquer favorite";

    bntFav.addEventListener("click", () => {
      item.favorite = !item.favorite;

      bntFav.textContent = item.favorite ? "Retirer favorite":"Marquer favorite"; 
      saveData();
      renderTable(data);
    });


    tableBody.appendChild(row);
  });
}

// Fermer les menus si on clique ailleurs
document.addEventListener("click", () => {
  document.querySelectorAll(".menu").forEach(m => m.classList.add("hidden"));
});

// Ajouter une checklist
addForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!title || !description) return;

  data.push({
    id: generateId(),
    title,
    description,
    important: false,
    favorite: false,
    done: false
  });

  saveData();
  renderTable(data);
  addForm.reset();
});

renderTable(data);