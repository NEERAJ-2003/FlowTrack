// Advanced monthly expense tracker with simple auth using localStorage

// Header + navigation
const currentMonthLabel = document.getElementById("currentMonthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const userInfo = document.getElementById("userInfo");
const welcomeUser = document.getElementById("welcomeUser");
const logoutBtn = document.getElementById("logoutBtn");

// Auth
const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const signupUsername = document.getElementById("signupUsername");
const signupPassword = document.getElementById("signupPassword");
const signupPasswordConfirm = document.getElementById("signupPasswordConfirm");

const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const forgotModal = document.getElementById("forgotModal");
const forgotForm = document.getElementById("forgotForm");
const forgotUsername = document.getElementById("forgotUsername");
const forgotNewPassword = document.getElementById("forgotNewPassword");
const forgotCancel = document.getElementById("forgotCancel");

// Salary + expenses
const salaryDisplay = document.getElementById("salaryDisplay");
const resetMonthBtn = document.getElementById("resetMonthBtn");

const expenseForm = document.getElementById("expenseForm");
const expenseTitle = document.getElementById("expenseTitle");
const expenseAmount = document.getElementById("expenseAmount");

const totalSpentDisplay = document.getElementById("totalSpentDisplay");
const remainingDisplay = document.getElementById("remainingDisplay");

const expenseList = document.getElementById("expenseList");
const emptyState = document.getElementById("emptyState");
const clearExpensesBtn = document.getElementById("clearExpensesBtn");

// Charts
const chartCanvas = document.getElementById("monthlyChart");
const chartCtx = chartCanvas ? chartCanvas.getContext("2d") : null;
const pieCanvas = document.getElementById("pieChart");
const pieCtx = pieCanvas ? pieCanvas.getContext("2d") : null;

// Overlays + modals
const overlay = document.getElementById("overlay");
const salaryModal = document.getElementById("salaryModal");
const salaryQuickInput = document.getElementById("salaryQuickInput");
const salaryModalCancel = document.getElementById("salaryModalCancel");
const salaryModalSave = document.getElementById("salaryModalSave");
const deleteModal = document.getElementById("deleteModal");
const deleteCancel = document.getElementById("deleteCancel");
const deleteConfirm = document.getElementById("deleteConfirm");
const resetModal = document.getElementById("resetModal");
const resetCancel = document.getElementById("resetCancel");
const resetConfirm = document.getElementById("resetConfirm");

// Use year-month key, e.g. "2026-02"
let currentYearMonth = getYearMonthKey(new Date());
let currentUser = null;
let pendingDeleteId = null;
let pieChartState = 'spent';

function getYearMonthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(key) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString(undefined, { month: "short", year: "numeric" });
}

function getUserStorageKey(user, yearMonth) {
  if (!user) return null;
  return `expenseTracker:${user}:${yearMonth}`;
}

function loadMonthData(key) {
  if (!currentUser) {
    return { salary: 0, expenses: [] };
  }
  const storageKey = getUserStorageKey(currentUser, key);
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return { salary: 0, expenses: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      salary: Number(parsed.salary) || 0,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    };
  } catch {
    return { salary: 0, expenses: [] };
  }
}

function saveMonthData(key, data) {
  if (!currentUser) return;
  const storageKey = getUserStorageKey(currentUser, key);
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function render() {
  if (!currentUser) {
    currentMonthLabel.textContent = "";
    return;
  }

  const data = loadMonthData(currentYearMonth);

  currentMonthLabel.textContent = formatMonthLabel(currentYearMonth);

  salaryDisplay.textContent = data.salary.toFixed(2);

  const totalSpent = data.expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );
  totalSpentDisplay.textContent = totalSpent.toFixed(2);

  const remaining = data.salary - totalSpent;
  remainingDisplay.textContent = remaining.toFixed(2);
  remainingDisplay.classList.toggle("negative", remaining < 0);
  remainingDisplay.classList.toggle("positive", remaining >= 0);

  // List
  expenseList.innerHTML = "";

  if (!data.expenses.length) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  data.expenses
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((expense) => {
      const li = document.createElement("li");
      li.className = "expense-item";
      li.dataset.id = expense.id;

      const left = document.createElement("div");
      left.className = "expense-main";

      const title = document.createElement("div");
      title.className = "expense-title";
      title.textContent = expense.title;

      const meta = document.createElement("div");
      meta.className = "expense-meta";

      const date = document.createElement("span");
      date.className = "expense-date";
      date.textContent = new Date(expense.createdAt).toLocaleDateString(
        undefined,
        { day: "2-digit", month: "short" }
      );

      meta.appendChild(date);
      left.appendChild(title);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "expense-right";

      const amount = document.createElement("div");
      amount.className = "expense-amount";
      amount.textContent = Number(expense.amount || 0).toFixed(2);

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "×";
      delBtn.title = "Delete expense";
      delBtn.addEventListener("click", () => openDeleteModal(expense.id));

      right.appendChild(amount);
      right.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(right);

      expenseList.appendChild(li);
    });

  renderChart();
  renderPieChart(data.salary, totalSpent);
}

function changeMonth(offset) {
  const [year, month] = currentYearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1 + offset, 1);
  currentYearMonth = getYearMonthKey(date);
  expenseTitle.value = "";
  expenseAmount.value = "";
  render();
}

function onExpenseSubmit(e) {
  e.preventDefault();

  const title = expenseTitle.value.trim();
  const amount = Number(expenseAmount.value);

  if (!title) {
    alert("Please enter a title.");
    return;
  }
  if (Number.isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  const data = loadMonthData(currentYearMonth);
  const newExpense = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title,
    amount,
    createdAt: new Date().toISOString(),
  };
  data.expenses.push(newExpense);
  saveMonthData(currentYearMonth, data);

  expenseTitle.value = "";
  expenseAmount.value = "";

  render();
}

function deleteExpense(id) {
  const data = loadMonthData(currentYearMonth);
  const filtered = data.expenses.filter((e) => e.id !== id);
  data.expenses = filtered;
  saveMonthData(currentYearMonth, data);
  render();
}

function clearExpenses() {
  const data = loadMonthData(currentYearMonth);
  if (!data.expenses.length) return;
  const confirmed = confirm("Clear all expenses for this month?");
  if (!confirmed) return;
  data.expenses = [];
  saveMonthData(currentYearMonth, data);
  render();
}

function resetMonth() {
  const data = loadMonthData(currentYearMonth);
  if (!data.expenses.length) return;
  data.expenses = [];
  saveMonthData(currentYearMonth, data);
  render();
}

function getTotalSpentForMonth(yearMonth) {
  if (!currentUser) return 0;
  const raw = localStorage.getItem(getUserStorageKey(currentUser, yearMonth));
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  } catch {
    return 0;
  }
}

function renderChart() {
  if (!chartCtx || !currentUser) return;

  const [year, month] = currentYearMonth.split('-').map(Number);
  const now = new Date(year, month - 1, 1);
  const labels = [];
  const values = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getYearMonthKey(date);
    labels.push(date.toLocaleString(undefined, { month: "short" }));
    values.push(getTotalSpentForMonth(key));
  }

  // High DPI scaling for sharper rendering on mobile
  const dpr = window.devicePixelRatio || 1;
  if (!chartCanvas.dataset.logicalWidth) {
    chartCanvas.dataset.logicalWidth = chartCanvas.width;
    chartCanvas.dataset.logicalHeight = chartCanvas.height;
  }
  const width = Number(chartCanvas.dataset.logicalWidth);
  const height = Number(chartCanvas.dataset.logicalHeight);

  chartCanvas.width = width * dpr;
  chartCanvas.height = height * dpr;
  chartCanvas.style.width = `${width}px`;
  chartCanvas.style.height = `${height}px`;

  chartCtx.scale(dpr, dpr);
  chartCtx.clearRect(0, 0, width, height);

  const padding = 24;
  const innerHeight = height - padding * 2;
  const innerWidth = width - padding * 2;

  const maxValue = Math.max(...values, 1);
  const barWidth = innerWidth / (labels.length * 1.8);
  const gap = (innerWidth - barWidth * labels.length) / (labels.length - 1 || 1);

  let progress = 0;
  const duration = 450;
  const startTime = performance.now();

  function drawFrame(nowTime) {
    const elapsed = nowTime - startTime;
    progress = Math.min(1, elapsed / duration);

    chartCtx.clearRect(0, 0, width, height);

    // axis
    chartCtx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    chartCtx.lineWidth = 1;
    chartCtx.beginPath();
    chartCtx.moveTo(padding, height - padding);
    chartCtx.lineTo(width - padding, height - padding);
    chartCtx.stroke();

    labels.forEach((label, index) => {
      const isLast = index === labels.length - 1;
      const currentBarWidth = isLast ? barWidth * 1.2 : barWidth;
      const x =
        padding +
        index * (barWidth + gap) -
        (isLast ? (currentBarWidth - barWidth) / 2 : 0);
      const value = values[index];
      const normalized = value / maxValue;
      const barHeight = innerHeight * normalized * progress;
      const y = height - padding - barHeight;

      if (barHeight > 0) {
        const gradient = chartCtx.createLinearGradient(0, y, 0, height - padding);
        if (isLast) {
          gradient.addColorStop(0, "#e0f2fe");
          gradient.addColorStop(1, "#bae6fd");
        } else {
          gradient.addColorStop(0, "#22d3ee");
          gradient.addColorStop(1, "#6366f1");
        }

        chartCtx.fillStyle = gradient;
        chartCtx.beginPath();
        try {
          if (typeof chartCtx.roundRect === "function") {
            chartCtx.roundRect(x, y, currentBarWidth, barHeight, 8);
          } else {
            chartCtx.rect(x, y, currentBarWidth, barHeight);
          }
        } catch (e) {
          chartCtx.rect(x, y, currentBarWidth, barHeight);
        }
        chartCtx.fill();
      }

      // label
      chartCtx.fillStyle = "rgba(148, 163, 184, 0.9)";
      chartCtx.font = "10px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      chartCtx.textAlign = "center";
      chartCtx.fillText(label, x + currentBarWidth / 2, height - padding + 12);
    });

    if (progress < 1) {
      requestAnimationFrame(drawFrame);
    }
  }

  requestAnimationFrame(drawFrame);
}

function renderPieChart(salary, totalSpent) {
  if (!pieCtx) return;

  const width = pieCanvas.width;
  const height = pieCanvas.height;
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2 + 4;

  pieCtx.clearRect(0, 0, width, height);

  const remaining = Math.max(0, salary - totalSpent);
  const spent = Math.max(0, Math.min(totalSpent, salary || totalSpent || 1));
  const total = spent + remaining || 1;

  const spentAngle = (spent / total) * Math.PI * 2;

  // Spent slice
  const gradientSpent = pieCtx.createLinearGradient(0, 0, width, 0);
  gradientSpent.addColorStop(0, "#fb7185");
  gradientSpent.addColorStop(1, "#f97316");

  pieCtx.beginPath();
  pieCtx.moveTo(centerX, centerY);
  pieCtx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + spentAngle);
  pieCtx.closePath();
  pieCtx.fillStyle = gradientSpent;
  pieCtx.fill();

  // Remaining slice
  const gradientRem = pieCtx.createLinearGradient(0, height, width, 0);
  gradientRem.addColorStop(0, "#22d3ee");
  gradientRem.addColorStop(1, "#6366f1");

  pieCtx.beginPath();
  pieCtx.moveTo(centerX, centerY);
  pieCtx.arc(
    centerX,
    centerY,
    radius,
    -Math.PI / 2 + spentAngle,
    -Math.PI / 2 + Math.PI * 2
  );
  pieCtx.closePath();
  pieCtx.fillStyle = gradientRem;
  pieCtx.fill();

  // Inner circle to create donut
  pieCtx.beginPath();
  pieCtx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
  pieCtx.fillStyle = "rgba(15, 23, 42, 0.97)";
  pieCtx.fill();

  // Text
  pieCtx.fillStyle = "#e5e7eb";
  pieCtx.textAlign = "center";

  if (pieChartState === 'spent') {
    pieCtx.font = "24px Poppins, system-ui, -apple-system, BlinkMacSystemFont";
    pieCtx.fillText("Spent", centerX, centerY - 8);
    pieCtx.font = "28px Poppins, system-ui, -apple-system, BlinkMacSystemFont";
    pieCtx.fillText(totalSpent.toFixed(2), centerX, centerY + 32);
  } else { // 'remaining'
    pieCtx.font = "24px Poppins, system-ui, -apple-system, BlinkMacSystemFont";
    pieCtx.fillText("Remaining", centerX, centerY - 8);
    pieCtx.font = "28px Poppins, system-ui, -apple-system, BlinkMacSystemFont";
    pieCtx.fillText(remaining.toFixed(2), centerX, centerY + 32);
  }
}

function handlePieChartClick() {
  pieChartState = pieChartState === 'spent' ? 'remaining' : 'spent';
  const data = loadMonthData(currentYearMonth);
  const totalSpent = data.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  renderPieChart(data.salary, totalSpent);
}

// --- Simple auth (demo only, not secure) ---

function loadUsers() {
  const raw = localStorage.getItem("expenseTracker:users");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("expenseTracker:users", JSON.stringify(users));
}

function setCurrentUser(username) {
  currentUser = username;
  if (username) {
    localStorage.setItem("expenseTracker:currentUser", username);
    welcomeUser.textContent = `Hi, ${username}`;
    userInfo.classList.remove("hidden");
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    render();
  } else {
    localStorage.removeItem("expenseTracker:currentUser");
    userInfo.classList.add("hidden");
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
}

function handleSignup(e) {
  e.preventDefault();
  const username = signupUsername.value.trim();
  const password = signupPassword.value;
  const confirmPassword = signupPasswordConfirm.value;

  if (!username || !password) {
    alert("Username and password are required.");
    return;
  }
  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  const users = loadUsers();
  const exists = users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    alert("This username is already taken.");
    return;
  }

  users.push({ username, password });
  saveUsers(users);
  signupForm.reset();
  setCurrentUser(username);
}

function handleLogin(e) {
  e.preventDefault();
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  const users = loadUsers();
  const match = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!match) {
    alert("Invalid username or password.");
    return;
  }
  loginForm.reset();
  setCurrentUser(match.username);
}

function handleLogout() {
  setCurrentUser(null);
}

function openForgotModal() {
  overlay.classList.remove("hidden");
  forgotModal.classList.remove("hidden");
  forgotUsername.focus();
}

function closeAllModals() {
  overlay.classList.add("hidden");
  salaryModal.classList.add("hidden");
  forgotModal.classList.add("hidden");
  deleteModal.classList.add("hidden");
  resetModal.classList.add("hidden");
  pendingDeleteId = null;
}

function handleForgotSubmit(e) {
  e.preventDefault();
  const username = forgotUsername.value.trim();
  const newPassword = forgotNewPassword.value;
  if (!username || !newPassword) {
    alert("Please fill all fields.");
    return;
  }

  const users = loadUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    alert("User not found.");
    return;
  }
  user.password = newPassword;
  saveUsers(users);
  forgotForm.reset();
  closeAllModals();
  alert("Password updated. You can now log in.");
}

function switchAuthTab(tab) {
  if (tab === "login") {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
  } else {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  }
}

// --- Salary modal ---

function openSalaryModal() {
  if (!currentUser) return;
  const data = loadMonthData(currentYearMonth);
  salaryQuickInput.value = data.salary ? data.salary.toFixed(2) : "";
  overlay.classList.remove("hidden");
  salaryModal.classList.remove("hidden");
  salaryQuickInput.focus();
}

function saveSalaryFromModal() {
  const value = Number(salaryQuickInput.value);
  if (Number.isNaN(value) || value < 0) {
    alert("Please enter a valid salary.");
    return;
  }
  const data = loadMonthData(currentYearMonth);
  data.salary = value;
  saveMonthData(currentYearMonth, data);
  closeAllModals();
  render();
}

function openDeleteModal(id) {
  if (!currentUser) return;
  pendingDeleteId = id;
  overlay.classList.remove("hidden");
  deleteModal.classList.remove("hidden");
}

function confirmDelete() {
  if (!pendingDeleteId) {
    closeAllModals();
    return;
  }
  deleteExpense(pendingDeleteId);
  pendingDeleteId = null;
  closeAllModals();
}

function openResetModal() {
  if (!currentUser) return;
  const data = loadMonthData(currentYearMonth);
  if (!data.expenses.length) return;
  overlay.classList.remove("hidden");
  resetModal.classList.remove("hidden");
}

function confirmReset() {
  resetMonth();
  closeAllModals();
}

// Event listeners
prevMonthBtn.addEventListener("click", () => changeMonth(-1));
nextMonthBtn.addEventListener("click", () => changeMonth(1));

expenseForm.addEventListener("submit", onExpenseSubmit);
clearExpensesBtn.addEventListener("click", clearExpenses);

salaryDisplay.addEventListener("click", openSalaryModal);
salaryModalCancel.addEventListener("click", closeAllModals);
salaryModalSave.addEventListener("click", saveSalaryFromModal);
overlay.addEventListener("click", closeAllModals);

deleteCancel.addEventListener("click", closeAllModals);
deleteConfirm.addEventListener("click", confirmDelete);

resetCancel.addEventListener("click", closeAllModals);
resetConfirm.addEventListener("click", confirmReset);

loginTab.addEventListener("click", () => switchAuthTab("login"));
signupTab.addEventListener("click", () => switchAuthTab("signup"));

signupForm.addEventListener("submit", handleSignup);
loginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", handleLogout);

forgotPasswordBtn.addEventListener("click", openForgotModal);
forgotCancel.addEventListener("click", closeAllModals);
forgotForm.addEventListener("submit", handleForgotSubmit);

resetMonthBtn.addEventListener("click", openResetModal);

// Bootstrap: restore user if present, else show auth 
const storedUser = localStorage.getItem("expenseTracker:currentUser");
if (storedUser) {
  currentUser = storedUser;
  setCurrentUser(storedUser);
} else {
  setCurrentUser(null);
}
