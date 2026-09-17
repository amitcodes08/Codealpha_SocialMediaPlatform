// Profile View & Edit Manager for Task 2
const Profile = {
  user: null,
  posts: [],
  targetUsername: '',

  async init() {
    Auth.init();

    const params = new URLSearchParams(window.location.search);
    const currentUser = Auth.getUser();
    this.targetUsername = params.get('username') || (currentUser ? currentUser.username : 'alexrivera');

    await this.loadProfile();
    await this.loadUserPosts();
    this.setupEditModal();

    window.addEventListener('auth-changed', () => {
      this.loadProfile();
      this.loadUserPosts();
    });
  },

  async loadProfile() {
    try {
      const headers = {};
      if (Auth.isLoggedIn()) {
        headers['Authorization'] = `Bearer ${Auth.getToken()}`;
      }

      const res = await fetch(`/api/users/${encodeURIComponent(this.targetUsername)}`, { headers });
      if (!res.ok) throw new Error('User profile not found');
      this.user = await res.json();

      document.title = `${this.user.name} (@${this.user.username}) — Pulse`;
      this.renderHeader();
    } catch (e) {
      document.getElementById('profileHeaderContainer').innerHTML = `
        <div style="text-align: center; padding: 4rem; color: var(--danger);">
          User not found. <a href="/" style="color: var(--primary-accent); text-decoration: underline;">Go back home</a>
        </div>
      `;
    }
  },

  renderHeader() {
    const container = document.getElementById('profileHeaderContainer');
    if (!container || !this.user) return;

    const currentUser = Auth.getUser();
    const isOwner = currentUser && currentUser.id === this.user.id;

    container.innerHTML = `
      <div class="profile-container">
        <img src="${this.user.cover_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80'}" class="profile-cover" alt="Cover photo">

        <div class="profile-header-card">
          <div class="profile-avatar-row">
            <img src="${this.user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + this.user.username}" class="profile-main-avatar" alt="${this.user.name}">
            
            <div style="display: flex; gap: 0.75rem;">
              ${isOwner ? `
                <button class="btn btn-secondary btn-sm" id="openEditProfileBtn">✏️ Edit Profile</button>
              ` : `
                <button class="follow-btn ${this.user.stats.is_following ? 'following' : 'follow'}" id="profileFollowBtn" style="padding: 0.6rem 1.4rem; font-size: 0.95rem;">
                  ${this.user.stats.is_following ? 'Following' : 'Follow'}
                </button>
              `}
            </div>
          </div>

          <h1 class="profile-name">${this.user.name}</h1>
          <div class="profile-handle">@${this.user.username}</div>

          <p class="profile-bio">${this.user.bio || 'No bio provided yet.'}</p>

          <div class="profile-meta">
            ${this.user.location ? `<span>📍 ${this.user.location}</span>` : ''}
            ${this.user.website ? `<span>🔗 <a href="${this.user.website}" target="_blank" style="color: var(--primary-accent);">${this.user.website}</a></span>` : ''}
            <span>📅 Joined ${new Date(this.user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
          </div>

          <div class="profile-stats-row">
            <div><span class="stat-num">${this.user.stats.posts_count}</span> <span class="stat-label">Posts</span></div>
            <div><span class="stat-num" id="profileFollowersCount">${this.user.stats.followers_count}</span> <span class="stat-label">Followers</span></div>
            <div><span class="stat-num">${this.user.stats.following_count}</span> <span class="stat-label">Following</span></div>
          </div>
        </div>
      </div>
    `;

    // Follow button handler
    const followBtn = document.getElementById('profileFollowBtn');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        if (!Auth.isLoggedIn()) {
          Auth.showModal();
          return;
        }

        try {
          const res = await fetch(`/api/users/${this.user.id}/follow`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to toggle follow');

          if (data.is_following) {
            followBtn.className = 'follow-btn following';
            followBtn.textContent = 'Following';
            Toast.show(`Following @${this.user.username}`, 'success');
          } else {
            followBtn.className = 'follow-btn follow';
            followBtn.textContent = 'Follow';
            Toast.show(`Unfollowed @${this.user.username}`, 'info');
          }

          document.getElementById('profileFollowersCount').textContent = data.followers_count;
        } catch (e) {
          Toast.show(e.message, 'error');
        }
      });
    }

    // Edit Profile Modal Open
    const editBtn = document.getElementById('openEditProfileBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        document.getElementById('editName').value = this.user.name || '';
        document.getElementById('editBio').value = this.user.bio || '';
        document.getElementById('editLocation').value = this.user.location || '';
        document.getElementById('editWebsite').value = this.user.website || '';
        document.getElementById('editAvatarUrl').value = this.user.avatar_url || '';
        document.getElementById('editCoverUrl').value = this.user.cover_url || '';
        document.getElementById('editProfileModal').classList.add('active');
      });
    }
  },

  async loadUserPosts() {
    const container = document.getElementById('profilePostsList');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading posts...</div>`;

    try {
      const headers = {};
      if (Auth.isLoggedIn()) {
        headers['Authorization'] = `Bearer ${Auth.getToken()}`;
      }

      const res = await fetch(`/api/posts?username=${encodeURIComponent(this.targetUsername)}`, { headers });
      this.posts = await res.json();

      if (this.posts.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
            <h4>No posts published yet</h4>
          </div>
        `;
        return;
      }

      App.posts = this.posts;
      container.innerHTML = this.posts.map(post => {
        const currentUser = Auth.getUser();
        const isOwner = currentUser && currentUser.id === post.user_id;

        return `
          <article class="post-card" id="post-${post.id}" style="margin-bottom: 1.5rem;">
            <div class="post-header">
              <div class="post-author-info">
                <img src="${post.user_avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + post.username}" class="author-avatar" alt="${post.user_name}">
                <div class="author-names">
                  <span class="author-name">${post.user_name}</span>
                  <span class="author-handle">@${post.username}</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="post-time">${App.formatRelativeTime(post.created_at)}</span>
                ${isOwner ? `<button class="delete-post-btn" onclick="Profile.deletePost(${post.id})" title="Delete Post">✕</button>` : ''}
              </div>
            </div>

            <p class="post-content">${App.linkifyText(post.content)}</p>

            ${post.image_url ? `
              <div class="post-image-container">
                <img src="${post.image_url}" class="post-image" alt="Post media">
              </div>
            ` : ''}

            <div class="post-actions">
              <button class="action-btn ${post.is_liked ? 'liked' : ''}" onclick="App.toggleLike(${post.id}, this)">
                <span class="action-icon">${post.is_liked ? '❤️' : '🤍'}</span>
                <span class="like-count">${post.likes_count}</span>
              </button>
              <button class="action-btn" onclick="App.toggleComments(${post.id})">
                <span class="action-icon">💬</span>
                <span id="comment-count-${post.id}">${post.comments_count}</span>
              </button>
              <button class="action-btn" onclick="App.sharePost(${post.id})">
                <span class="action-icon">🔗</span>
                <span>Share</span>
              </button>
            </div>

            <div class="comments-container" id="comments-${post.id}">
              <div class="comment-input-row">
                <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') App.submitComment(${post.id})">
                <button class="comment-submit-btn" onclick="App.submitComment(${post.id})">Reply</button>
              </div>
              <div class="comments-list" id="comments-list-${post.id}"></div>
            </div>
          </article>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 2rem;">Failed to load user posts</div>`;
    }
  },

  async deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      Toast.show('Post deleted', 'info');
      this.loadUserPosts();
      this.loadProfile();
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  setupEditModal() {
    const modal = document.getElementById('editProfileModal');
    const closeBtn = document.getElementById('closeEditProfileModal');
    const form = document.getElementById('editProfileForm');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('editName').value.trim(),
          bio: document.getElementById('editBio').value.trim(),
          location: document.getElementById('editLocation').value.trim(),
          website: document.getElementById('editWebsite').value.trim(),
          avatar_url: document.getElementById('editAvatarUrl').value.trim(),
          cover_url: document.getElementById('editCoverUrl').value.trim()
        };

        try {
          const res = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to update profile');

          // Update local session user
          const currentUser = Auth.getUser();
          Auth.setAuth(Auth.getToken(), { ...currentUser, ...data.user });

          modal.classList.remove('active');
          Toast.show('Profile successfully updated!', 'success');
          this.loadProfile();
          this.loadUserPosts();
        } catch (err) {
          Toast.show(err.message, 'error');
        }
      });
    }
  }
};

window.Profile = Profile;
