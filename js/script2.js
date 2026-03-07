const params = new URLSearchParams(window.location.search);
const checklistId = params.get("checklistId");
const storageKey = `tasks-${checklistId}`;

let tasks = JSON.parse(localStorage.getItem(storageKey) || "[]");

const addForm = document.getElementById("addForm");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const dataTable = document.getElementById("dataTable");
const tableBody = dataTable.querySelector("tbody");
const noDataMessage = document.getElementById("noDataMessage");

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

function updateChecklistDoneState() {
  const allDone = tasks.length > 0 && tasks.every(t => t.done === true);

  let checklists = JSON.parse(localStorage.getItem("checklists") || "[]");
  const checklist = checklists.find(c => c.id === checklistId);

  if (checklist) {
    checklist.done = allDone;
    localStorage.setItem("checklists", JSON.stringify(checklists));
  }
}

function renderTable() {
  tableBody.innerHTML = "";

  if (tasks.length === 0) {
    noDataMessage.style.display = "block";
    dataTable.style.display = "none";
    return;
  }

  noDataMessage.style.display = "none";
  dataTable.style.display = "table";

  tasks.forEach((task, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="p-2 border-b relative">
        <strong class="${task.done ? 'line-through text-gray-400' : ''}">
          ${task.title}
        </strong><br/>
        <span class="text-sm text-gray-600 ${task.done ? 'line-through text-gray-400' : ''}">
          ${task.description}
        </span>

        <button class="menu-btn absolute right-2 top-2 text-xl px-2">⋮</button>

        <div class="menu hidden absolute right-2 top-8 bg-white border rounded shadow-md w-32 z-10">
          <button class="edit-btn block w-full text-left px-3 py-2 hover:bg-gray-100">Modifier</button>
          <button class="done-btn block w-full text-left px-3 py-2 hover:bg-gray-100">
            ${task.done ? "Retirer done" : "Done"}
          </button>
          <button class="delete-btn block w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600">
            Supprimer
          </button>
        </div>
      </td>
    `;

    const menuBtn = row.querySelector(".menu-btn");
    const menu = row.querySelector(".menu");

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
    });

    // Modifier
    row.querySelector(".edit-btn").addEventListener("click", () => {
      const newTitle = prompt("Nouveau titre :", task.title);
      const newDesc = prompt("Nouvelle description :", task.description);

      if (newTitle && newDesc) {
        task.title = newTitle;
        task.description = newDesc;
        saveTasks();
        updateChecklistDoneState();
        renderTable();
      }
    });

    // Done et Retirer done
    row.querySelector(".done-btn").addEventListener("click", () => {
      task.done = !task.done;
      saveTasks();
      updateChecklistDoneState();
      renderTable();
    });

    // Supprimer
    row.querySelector(".delete-btn").addEventListener("click", () => {
      if (confirm("Supprimer cette tâche ?")) {
        tasks.splice(index, 1);
        saveTasks();
        updateChecklistDoneState();
        renderTable();
      }
    });

    tableBody.appendChild(row);
  });
}

document.addEventListener("click", () => {
  document.querySelectorAll(".menu").forEach(m => m.classList.add("hidden"));
});

addForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!title || !description) return;

  tasks.push({ title, description, done: false });
  saveTasks();
  updateChecklistDoneState();
  renderTable();
  addForm.reset();
});

renderTable()