const API = "http://localhost:3000";

// Fetch & display members
async function loadMembers() {
  let res = await fetch(`${API}/members`);
  let data = await res.json();

  let container = document.getElementById("members");
  container.innerHTML = "";

  data.forEach(m => {
    container.innerHTML += `
      <div>
        ${m.id}: ${m.name}
        <button onclick="deleteMember(${m.id})">Delete</button>
      </div>
    `;
  });
}

loadMembers();

// Add new member
async function addMember() {
  const name = document.getElementById("nameInput").value;

  if (!name) {
    alert("Please enter a name");
    return;
  }

  await fetch(`${API}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });

  document.getElementById("nameInput").value = "";
  loadMembers();
}

// Delete member
async function deleteMember(id) {
  await fetch(`${API}/members/${id}`, { method: "DELETE" });
  loadMembers();
}
