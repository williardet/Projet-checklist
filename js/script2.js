
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
      <td class="p-2 border-b cursor-pointer">
        <strong>${task.title}</strong><br/>
        <span class="text-sm text-gray-600">${task.description}</span>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

addForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!title || !description) return;

  tasks.push({ title, description });
  saveTasks();
  renderTable();
  addForm.reset();
});

renderTable();
