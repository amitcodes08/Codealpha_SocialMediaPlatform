// Auth & Session Manager for Task 2 Social Media Platform
const Auth = {
  getToken() {
    return localStorage.getItem('pulse_social_token');
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('pulse_social_user'));
    } catch (e) {
      return null;
    }
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  setAuth(token, user) {
    localStorage.setItem('pulse_social_token', token);
    localStorage.setItem('pulse_social_user', JSON.stringify(user));
    this.updateUserBadges();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } }));
  },
  logout() {
    localStorage.removeItem('pulse_social_token');
    localStorage.removeItem('pulse_social_user');
    this.updateUserBadges();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
    Toast.show('Signed out', 'info');
  },
  async loginAsDemo(username) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: username, password: 'password123' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');

      this.setAuth(data.token, data.user);
      Toast.show(`Switched account to @${data.user.username}`, 'success');
      const modal = document.getElementById('authModal');
      if (modal) modal.classList.remove('active');
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },
  init() {
    this.renderAuthModal();
    this.updateUserBadges();
    this.setupListeners();

    // Default auto-login to Alex Rivera if first visit
    if (!this.isLoggedIn()) {
      this.loginAsDemo('alexrivera');
    }
  },
  renderAuthModal() {
    if (document.getElementById('authModal')) return;
    const modalHtml = `
      <div id="authModal" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3 style="font-size: 1.3rem; font-weight: 800;" id="authModalTitle">Welcome to Pulse</h3>
            <button class="close-btn" id="closeAuthModal">&times;</button>
          </div>

          <div style="display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;">
            <button class="feed-tab active" id="tabLoginBtn" style="padding: 0.6rem;">Sign In</button>
            <button class="feed-tab" id="tabRegBtn" style="padding: 0.6rem;">Create Account</button>
          </div>

          <!-- Quick Demo Switcher -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              ⚡ Quick Switch Demo Creators
            </div>
            <div class="demo-switcher">
              <button class="demo-chip" onclick="Auth.loginAsDemo('alexrivera')">👤 @alexrivera</button>
              <button class="demo-chip" onclick="Auth.loginAsDemo('sophiachen')">📸 @sophiachen</button>
              <button class="demo-chip" onclick="Auth.loginAsDemo('marcusvance')">☕ @marcusvance</button>
            </div>
          </div>

          <form id="socialLoginForm">
            <div class="form-group">
              <label>Username or Email</label>
              <input type="text" class="form-control" id="loginIdentifier" required placeholder="e.g. alexrivera">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" class="form-control" id="loginPassword" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">Sign In</button>
          </form>

          <form id="socialRegForm" style="display: none;">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" class="form-control" id="regName" required placeholder="Alex Rivera">
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" class="form-control" id="regUsername" required placeholder="alexrivera">
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" class="form-control" id="regEmail" required placeholder="alex@example.com">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" class="form-control" id="regPassword" minlength="6" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">Create Account</button>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },
  setupListeners() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.getElementById('closeAuthModal');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabReg = document.getElementById('tabRegBtn');
    const loginForm = document.getElementById('socialLoginForm');
    const regForm = document.getElementById('socialRegForm');

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      document.getElementById('authModalTitle').textContent = 'Welcome Back';
    });

    tabReg.addEventListener('click', () => {
      tabReg.classList.add('active');
      tabLogin.classList.remove('active');
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      document.getElementById('authModalTitle').textContent = 'Create Pulse Account';
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = document.getElementById('loginIdentifier').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        this.setAuth(data.token, data.user);
        modal.classList.remove('active');
        Toast.show(`Welcome back, ${data.user.name}!`, 'success');
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const username = document.getElementById('regUsername').value;
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        this.setAuth(data.token, data.user);
        modal.classList.remove('active');
        Toast.show(`Account created! Welcome, ${data.user.name}`, 'success');
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  },
  showModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('active');
  },
  updateUserBadges() {
    const container = document.getElementById('sidebarUserBadge');
    if (!container) return;

    if (this.isLoggedIn()) {
      const user = this.getUser();
      container.innerHTML = `
        <div class="current-user-card" onclick="Auth.showModal()" title="Click to switch user or view account">
          <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}" class="author-avatar" style="width: 38px; height: 38px;">
          <div class="current-user-info" style="flex: 1; overflow: hidden;">
            <div style="font-weight: 700; font-size: 0.9rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${user.name}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">@${user.username}</div>
          </div>
          <span style="color: var(--text-muted); font-size: 0.9rem;">⇄</span>
        </div>
      `;

      // Update post box avatar if exists
      const postBoxAvatar = document.getElementById('createPostAvatar');
      if (postBoxAvatar) {
        postBoxAvatar.src = user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user';
      }

      // Update my profile links
      const myProfileLinks = document.querySelectorAll('.my-profile-link');
      myProfileLinks.forEach(link => {
        link.href = `/profile.html?username=${user.username}`;
      });
    } else {
      container.innerHTML = `
        <button class="btn btn-primary" style="width: 100%; border-radius: 999px;" onclick="Auth.showModal()">
          Sign In
        </button>
      `;
    }
  }
};

window.Auth = Auth;
