const API_BASE = 'http://localhost:3001/api';

let token = localStorage.getItem('adminToken') || null;
let currentAdmin = JSON.parse(localStorage.getItem('adminUser')) || null;

// DOM Elements
const pageLoader = document.getElementById('pageLoader');
const authScreen = document.getElementById('authScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const tabTitle = document.getElementById('tabTitle');
const tabDesc = document.getElementById('tabDesc');
const adminName = document.getElementById('adminName');
const adminInitials = document.getElementById('adminInitials');
const logoutLink = document.getElementById('logoutLink');

// Navigation Tabs
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabPanels = document.querySelectorAll('.tab-panel');

// Stats Elements
const statTotalUsers = document.getElementById('statTotalUsers');
const statTotalTx = document.getElementById('statTotalTx');
const statPendingWithdrawals = document.getElementById('statPendingWithdrawals');

// Tables
const usersTableBody = document.getElementById('usersTableBody');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const withdrawalsTableBody = document.getElementById('withdrawalsTableBody');

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (token && currentAdmin) {
    showDashboard();
  } else {
    showAuth();
  }
});

// Helper: Show/Hide Screen
function showAuth() {
  authScreen.classList.remove('hidden');
  dashboardScreen.classList.add('hidden');
  hideLoader();
}

function showDashboard() {
  authScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  
  // Set profile info
  const name = `${currentAdmin.firstName || 'Admin'} ${currentAdmin.lastName || ''}`.trim();
  adminName.textContent = name;
  adminInitials.textContent = currentAdmin.firstName ? currentAdmin.firstName[0].toUpperCase() : 'AD';

  loadDashboardData();
  hideLoader();
}

function showLoader() {
  pageLoader.style.opacity = '1';
  pageLoader.style.pointerEvents = 'all';
}

function hideLoader() {
  pageLoader.style.opacity = '0';
  pageLoader.style.pointerEvents = 'none';
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoader();

  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.user.role !== 'Admin') {
      throw new Error('Access denied: User is not an Administrator');
    }

    // Save tokens
    token = data.token;
    currentAdmin = data.user;
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(currentAdmin));

    showDashboard();
  } catch (error) {
    alert(error.message);
    hideLoader();
  }
});

// Logout Handler
logoutLink.addEventListener('click', (e) => {
  e.preventDefault();
  token = null;
  currentAdmin = null;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  showAuth();
});

// Tab Switcher
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tabName = item.getAttribute('data-tab');
    
    // Set active link
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // Show active panel
    tabPanels.forEach(p => p.classList.remove('active'));
    
    // Set header
    if (tabName === 'users') {
      tabTitle.textContent = 'Users Directory';
      tabDesc.textContent = 'Manage accounts, verify profiles, and check balances';
      document.getElementById('usersPanel').classList.add('active');
    } else if (tabName === 'transactions') {
      tabTitle.textContent = 'Transactions';
      tabDesc.textContent = 'Global audit logging for sticks and wallets';
      document.getElementById('transactionsPanel').classList.add('active');
    } else if (tabName === 'withdrawals') {
      tabTitle.textContent = 'Withdrawals';
      tabDesc.textContent = 'Operate on withdrawal requests and verify bank credentials';
      document.getElementById('withdrawalsPanel').classList.add('active');
    }
  });
});

// Load Dashboard Data
async function loadDashboardData() {
  showLoader();
  try {
    const headers = { 'Authorization': `Bearer ${token}` };

    const [usersRes, txRes, withRes] = await Promise.all([
      fetch(`${API_BASE}/admin/users`, { headers }),
      fetch(`${API_BASE}/admin/transactions`, { headers }),
      fetch(`${API_BASE}/admin/withdrawals`, { headers })
    ]);

    const usersData = await usersRes.json();
    const txData = await txRes.json();
    const withData = await withRes.json();

    if (usersRes.ok) renderUsers(usersData.users);
    if (txRes.ok) renderTransactions(txData.transactions);
    if (withRes.ok) renderWithdrawals(withData.withdrawals);

    // Compute stats
    statTotalUsers.textContent = usersData.users?.length || 0;
    statTotalTx.textContent = txData.transactions?.length || 0;
    
    const pendingWithdrawals = withData.withdrawals?.filter(w => w.status === 'pending').length || 0;
    statPendingWithdrawals.textContent = pendingWithdrawals;

  } catch (error) {
    console.error('Error loading admin data:', error);
  } finally {
    hideLoader();
  }
}

// Render Users Table
function renderUsers(users) {
  usersTableBody.innerHTML = '';
  
  if (!users || users.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No users registered</td></tr>';
    return;
  }

  users.forEach(u => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unnamed User';
    const email = u.email || 'N/A';
    const roleBadge = `<span class="badge ${u.role === 'Influencer' ? 'primary' : 'success'}">${u.role || 'User'}</span>`;
    
    // Sticks Balance
    const sticksBalance = u.role === 'Influencer' ? (u.profile?.sticks?.total ?? 0) : '—';
    
    // Wallet Balance
    const walletBalance = u.wallet ? `₹${(u.wallet.availableBalance || 0).toLocaleString()}` : '₹0';
    
    // Bank Verification status
    let bankBadge = '—';
    let verifyBtn = '';
    if (u.wallet?.bankDetails) {
      const verified = u.wallet.bankDetails.verified;
      bankBadge = `<span class="badge ${verified ? 'success' : 'warning'}">${verified ? 'Verified' : 'Unverified'}</span>`;
      
      if (!verified) {
        verifyBtn = `
          <button class="btn success btn-sm" onclick="approveBank('${u._id}')">
            <i class="fa-solid fa-circle-check"></i> Approve Bank
          </button>
        `;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 600;">${name}</div>
        <div style="font-size: 12px; color: var(--text-secondary);">${email}</div>
      </td>
      <td>${roleBadge}</td>
      <td>${sticksBalance}</td>
      <td>${walletBalance}</td>
      <td>${bankBadge}</td>
      <td>${verifyBtn || '<span style="color: var(--text-secondary); font-size: 13px;">No actions available</span>'}</td>
    `;
    usersTableBody.appendChild(tr);
  });
}

// Render Transactions Table
function renderTransactions(transactions) {
  transactionsTableBody.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    transactionsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No transactions recorded</td></tr>';
    return;
  }

  transactions.forEach(t => {
    const isCredit = t.type === 'credit' || t.type === 'earned' || t.type === 'purchased';
    const sign = isCredit ? '+' : '-';
    const color = isCredit ? 'var(--success)' : 'var(--text-primary)';
    
    const amountVal = t.isSticks ? `${t.amount || 0} Sticks` : `₹${(t.amount || 0).toLocaleString()}`;
    const name = t.user ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim() || 'Unnamed User' : 'System/Deleted';
    const role = t.user ? (t.user.role || '') : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span style="font-family: monospace; font-size: 12px; color: var(--text-secondary);">${t._id || 'N/A'}</span></td>
      <td>
        <div style="font-weight: 600;">${name}</div>
        <div style="font-size: 11px; color: var(--text-secondary);">${role}</div>
      </td>
      <td><span class="badge ${isCredit ? 'success' : 'outline'}">${t.type || 'unknown'}</span></td>
      <td style="color: ${color}; font-weight: 700;">${sign} ${amountVal}</td>
      <td style="font-size: 13px;">${t.description || 'No description'}</td>
      <td style="color: var(--text-secondary); font-size: 12px;">${new Date(t.createdAt || t.date || Date.now()).toLocaleString('en-IN')}</td>
    `;
    transactionsTableBody.appendChild(tr);
  });
}

// Render Withdrawals Table
function renderWithdrawals(withdrawals) {
  withdrawalsTableBody.innerHTML = '';

  if (!withdrawals || withdrawals.length === 0) {
    withdrawalsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No withdrawal requests found</td></tr>';
    return;
  }

  withdrawals.forEach(w => {
    const name = w.user ? `${w.user.firstName || ''} ${w.user.lastName || ''}`.trim() || 'Unnamed User' : 'Unknown';
    const email = w.user ? (w.user.email || '') : '';
    
    // Bank Account details
    const bankText = w.bankDetails ? `
      <div>${w.bankDetails.accountHolderName || 'N/A'}</div>
      <div style="font-size: 12px; color: var(--text-secondary);">A/C: ${w.bankDetails.accountNumber || 'N/A'}</div>
      <div style="font-size: 12px; color: var(--text-secondary);">IFSC: ${w.ifscCode || w.bankDetails.ifscCode || 'N/A'} | Bank: ${w.bankDetails.bankName || 'N/A'}</div>
    ` : '<span style="color: var(--danger);">No Details</span>';

    // Status Badge
    let statusClass = 'warning';
    if (w.status === 'completed') statusClass = 'success';
    if (w.status === 'failed') statusClass = 'danger';
    const statusBadge = `<span class="badge ${statusClass}">${w.status || 'pending'}</span>`;

    // Actions
    let actionBtn = '';
    if (w.status === 'pending') {
      actionBtn = `
        <div style="display: flex; gap: 8px;">
          <button class="btn success btn-sm" onclick="operateWithdrawal('${w.walletId}', '${w._id}', 'completed')">
            <i class="fa-solid fa-check"></i> Complete
          </button>
          <button class="btn danger btn-sm" onclick="operateWithdrawal('${w.walletId}', '${w._id}', 'failed')">
            <i class="fa-solid fa-xmark"></i> Reject
          </button>
        </div>
      `;
    } else {
      actionBtn = '<span style="color: var(--text-secondary); font-size: 13px;">Processed</span>';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 600;">${name}</div>
        <div style="font-size: 12px; color: var(--text-secondary);">${email}</div>
      </td>
      <td>${bankText}</td>
      <td style="font-weight: 700; font-size: 15px;">₹${(w.amount || 0).toLocaleString()}</td>
      <td>${statusBadge}</td>
      <td style="color: var(--text-secondary); font-size: 12px;">${new Date(w.createdAt || Date.now()).toLocaleString('en-IN')}</td>
      <td>${actionBtn}</td>
    `;
    withdrawalsTableBody.appendChild(tr);
  });
}

// Global approval actions triggerable from buttons
window.approveBank = async (userId) => {
  if (!confirm('Are you sure you want to verify this user\'s bank details?')) return;
  showLoader();
  try {
    const res = await fetch(`${API_BASE}/admin/bank-details/${userId}/verify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Operation failed');

    alert('Bank details verified successfully!');
    loadDashboardData();
  } catch (err) {
    alert(err.message);
    hideLoader();
  }
};

window.operateWithdrawal = async (walletId, txId, status) => {
  const actionText = status === 'completed' ? 'approve and complete' : 'reject and refund';
  if (!confirm(`Are you sure you want to ${actionText} this withdrawal request?`)) return;
  showLoader();
  try {
    const res = await fetch(`${API_BASE}/admin/withdrawals/${walletId}/transaction/${txId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Operation failed');

    alert(`Withdrawal marked as ${status} successfully!`);
    loadDashboardData();
  } catch (err) {
    alert(err.message);
    hideLoader();
  }
};
