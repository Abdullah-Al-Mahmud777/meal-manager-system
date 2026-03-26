// ---- State ----
let state = JSON.parse(localStorage.getItem('mealApp')) || {
  users: [],
  meals: [],      // { id, userId, date, lunch, dinner }
  deposits: [],   // { id, userId, amount, date }
  lunchRate: 50,
  dinnerRate: 60
};

function save() {
  localStorage.setItem('mealApp', JSON.stringify(state));
}

// ---- Toast ----
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ---- Populate Selects ----
function populateSelects() {
  ['depositUser', 'mealUser', 'filterUser'].forEach(id => {
    const el = document.getElementById(id);
    const prev = el.value;
    el.innerHTML = id === 'filterUser' ? '<option value="">All Users</option>' : '';
    state.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name;
      el.appendChild(opt);
    });
    if (prev) el.value = prev;
  });
}

// ---- Add User ----
function addUser() {
  const name = document.getElementById('userName').value.trim();
  if (!name) return toast('Please enter a user name');
  if (state.users.find(u => u.name.toLowerCase() === name.toLowerCase()))
    return toast('User already exists');
  state.users.push({ id: Date.now().toString(), name });
  save();
  document.getElementById('userName').value = '';
  populateSelects();
  render();
  toast(`User "${name}" added`);
}

// ---- Add Deposit ----
function addDeposit() {
  const userId = document.getElementById('depositUser').value;
  const amount = parseFloat(document.getElementById('depositAmount').value);
  if (!userId) return toast('Select a user');
  if (!amount || amount <= 0) return toast('Enter a valid amount');
  state.deposits.push({ id: Date.now().toString(), userId, amount, date: new Date().toLocaleDateString('en-GB') });
  save();
  document.getElementById('depositAmount').value = '';
  render();
  toast('Deposit added');
}

// ---- Add Meal ----
function addMeal() {
  const userId = document.getElementById('mealUser').value;
  const date = document.getElementById('mealDate').value;
  const lunch = document.getElementById('lunchCheck').checked;
  const dinner = document.getElementById('dinnerCheck').checked;
  if (!userId) return toast('Select a user');
  if (!date) return toast('Select a date');
  if (!lunch && !dinner) return toast('Select at least Lunch or Dinner');

  // Check duplicate
  const dup = state.meals.find(m => m.userId === userId && m.date === date);
  if (dup) {
    dup.lunch = lunch;
    dup.dinner = dinner;
    toast('Meal updated for this date');
  } else {
    state.meals.push({ id: Date.now().toString(), userId, date, lunch, dinner });
    toast('Meal added');
  }
  save();
  document.getElementById('lunchCheck').checked = false;
  document.getElementById('dinnerCheck').checked = false;
  render();
}

// ---- Update Rates ----
function updateRates() {
  const lr = parseFloat(document.getElementById('lunchRate').value);
  const dr = parseFloat(document.getElementById('dinnerRate').value);
  if (!lr || !dr || lr <= 0 || dr <= 0) return toast('Enter valid rates');
  state.lunchRate = lr;
  state.dinnerRate = dr;
  save();
  render();
  toast('Rates updated');
}

// ---- Delete Meal ----
function deleteMeal(id) {
  state.meals = state.meals.filter(m => m.id !== id);
  save(); render(); toast('Meal removed');
}

// ---- Delete Deposit ----
function deleteDeposit(id) {
  state.deposits = state.deposits.filter(d => d.id !== id);
  save(); render(); toast('Deposit removed');
}

// ---- Delete User ----
function deleteUser(id) {
  const user = state.users.find(u => u.id === id);
  if (!confirm(`Delete user "${user.name}"? This will also remove their meals and deposits.`)) return;
  state.users = state.users.filter(u => u.id !== id);
  state.meals = state.meals.filter(m => m.userId !== id);
  state.deposits = state.deposits.filter(d => d.userId !== id);
  save();
  populateSelects();
  render();
  toast(`User "${user.name}" deleted`);
}

// ---- Render Summary ----
function renderSummary() {
  const tbody = document.getElementById('summaryBody');
  const tfoot = document.getElementById('summaryFoot');
  tbody.innerHTML = '';

  let totalMeals = 0, totalDeposit = 0;

  state.users.forEach(u => {
    const userMeals = state.meals.filter(m => m.userId === u.id);
    const lunch = userMeals.filter(m => m.lunch).length;
    const dinner = userMeals.filter(m => m.dinner).length;
    const meals = lunch + dinner;
    const deposited = state.deposits.filter(d => d.userId === u.id).reduce((s, d) => s + d.amount, 0);

    totalMeals += meals;
    totalDeposit += deposited;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tbody.children.length + 1}</td>
      <td>${u.name}</td>
      <td><span class="badge">${meals}</span></td>
      <td>৳${deposited.toFixed(2)}</td>
      <td><button class="btn btn-danger" onclick="deleteUser('${u.id}')">Delete</button></td>`;
    tbody.appendChild(tr);
  });

  tfoot.innerHTML = `<tr>
    <td></td>
    <td>Total</td>
    <td><span class="badge">${totalMeals}</span></td>
    <td>৳${totalDeposit.toFixed(2)}</td>
    <td></td>
  </tr>`;
}

// ---- Render Meal Log ----
function renderMealLog() {
  const filterUser = document.getElementById('filterUser').value;
  const tbody = document.getElementById('mealLogBody');
  tbody.innerHTML = '';

  const filtered = state.meals
    .filter(m => !filterUser || m.userId === filterUser)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  filtered.forEach(m => {
    const user = state.users.find(u => u.id === m.userId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.date}</td>
      <td>${user ? user.name : 'Unknown'}</td>
      <td>${m.lunch ? '✅' : '—'}</td>
      <td>${m.dinner ? '✅' : '—'}</td>
      <td><button class="btn btn-danger" onclick="deleteMeal('${m.id}')">Delete</button></td>`;
    tbody.appendChild(tr);
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No meals found</td></tr>';
  }
}

// ---- Render Deposit Log ----
function renderDepositLog() {
  const tbody = document.getElementById('depositLogBody');
  tbody.innerHTML = '';

  const sorted = [...state.deposits].sort((a, b) => b.id - a.id);
  sorted.forEach(d => {
    const user = state.users.find(u => u.id === d.userId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user ? user.name : 'Unknown'}</td>
      <td>৳${d.amount.toFixed(2)}</td>
      <td>${d.date}</td>
      <td><button class="btn btn-danger" onclick="deleteDeposit('${d.id}')">Delete</button></td>`;
    tbody.appendChild(tr);
  });

  if (!sorted.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No deposits yet</td></tr>';
  }
}

// ---- Render All ----
function render() {
  renderSummary();
  renderMealLog();
  renderDepositLog();
}

// ---- Filter listener ----
document.getElementById('filterUser').addEventListener('change', renderMealLog);

// ---- Init ----
document.getElementById('lunchRate').value = state.lunchRate;
document.getElementById('dinnerRate').value = state.dinnerRate;
document.getElementById('mealDate').value = new Date().toISOString().split('T')[0];
populateSelects();
render();
