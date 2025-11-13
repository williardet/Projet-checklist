function generateId() {
  return 'checklist-' + Date.now();
}

let data = JSON.parse(localStorage.getItem("checklists") || "[]");

const addForm = document.getElementById("addForm");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const dataTable = document.getElementById("dataTable");
const tableBody = dataTable.querySelector("tbody");
const noDataMessage = document.getElementById("noDataMessage");
const totalCount = document.getElementById("totalCount");

function saveData() {
  localStorage.setItem("checklists", JSON.stringify(data));
}

function renderTable() {
  tableBody.innerHTML = "";
  totalCount.textContent = data.length.toString().padStart(2, '0');

  if (data.length === 0) {
    noDataMessage.style.display = "block";
    dataTable.style.display = "none";
    return;
  }

  noDataMessage.style.display = "none";
  dataTable.style.display = "table";

  data.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="p-2 border-b cursor-pointer" data-id="${item.id}">
        <strong>${item.title}</strong><br/>
        <span class="text-sm text-gray-600">${item.description}</span>
      </td>
    `;
    row.addEventListener("click", () => {
      window.location.href = `pages/taches.html?checklistId=${item.id}`;
    });
    tableBody.appendChild(row);
  });
}

addForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!title || !description) return;

  data.push({ id: generateId(), title, description });
  saveData();
  renderTable();
  addForm.reset();
});

renderTable();