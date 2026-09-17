// Main Feed, Posts, Likes, Comments, and Follows logic for Task 2
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info') {
    this.init();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};
window.Toast = Toast;

const App = {
  currentTab: 'all', // 'all' or 'following'
  posts: [],
  suggestedUsers: [],

  async init() {
    Auth.init();
    this.setupTabs();
    this.setupCreatePost();
    await this.loadPosts();
    await this.loadSuggestedUsers();

    window.addEventListener('auth-changed', () => {
      this.loadPosts();
      this.loadSuggestedUsers();
    });
  },

  setupTabs() {
    const tabs = document.querySelectorAll('.feed-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.feed || 'all';
        this.loadPosts();
      });
    });
  },

  async loadPosts() {
    const container = document.getElementById('postsFeed');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        Loading social updates...
      </div>
    `;

    try {
      const headers = {};
      if (Auth.isLoggedIn()) {
        headers['Authorization'] = `Bearer ${Auth.getToken()}`;
      }

      const res = await fetch(`/api/posts?feed=${this.currentTab}`, { headers });
      this.posts = await res.json();
      this.renderPosts();
    } catch (e) {
      container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 2rem;">Failed to load posts</div>`;
    }
  },

  renderPosts() {
    const container = document.getElementById('postsFeed');
    if (!container) return;

    if (this.posts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">✨</div>
          <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No posts in this feed yet</h3>
          <p style="color: var(--text-muted); max-width: 360px; margin: 0 auto 1.5rem;">
            ${this.currentTab === 'following' ? 'Follow more creators to see their updates right here!' : 'Be the first to share an update with the community!'}
          </p>
        </div>
      `;
      return;
    }

    const currentUser = Auth.getUser();

    container.innerHTML = this.posts.map(post => {
      const isOwner = currentUser && currentUser.id === post.user_id;
      return `
        <article class="post-card" id="post-${post.id}">
          <div class="post-header">
            <div class="post-author-info">
              <a href="/profile.html?username=${post.username}">
                <img src="${post.user_avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + post.username}" class="author-avatar" alt="${post.user_name}">
              </a>
              <div class="author-names">
                <a href="/profile.html?username=${post.username}" class="author-name">
                  ${post.user_name}
                </a>
                <span class="author-handle">@${post.username}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="post-time">${this.formatRelativeTime(post.created_at)}</span>
              ${isOwner ? `<button class="delete-post-btn" onclick="App.deletePost(${post.id})" title="Delete Post">✕</button>` : ''}
            </div>
          </div>

          <p class="post-content">${this.linkifyText(post.content)}</p>

          ${post.image_url ? `
            <div class="post-image-container">
              <img src="${post.image_url}" class="post-image" alt="Post attachment" loading="lazy" onclick="window.open('${post.image_url}', '_blank')">
            </div>
          ` : ''}

          <div class="post-actions">
            <!-- Like Button -->
            <button class="action-btn ${post.is_liked ? 'liked' : ''}" onclick="App.toggleLike(${post.id}, this)">
              <span class="action-icon">${post.is_liked ? '❤️' : '🤍'}</span>
              <span class="like-count">${post.likes_count}</span>
            </button>

            <!-- Comments Button -->
            <button class="action-btn" onclick="App.toggleComments(${post.id})">
              <span class="action-icon">💬</span>
              <span id="comment-count-${post.id}">${post.comments_count}</span>
            </button>

            <!-- Share button -->
            <button class="action-btn" onclick="App.sharePost(${post.id})">
              <span class="action-icon">🔗</span>
              <span>Share</span>
            </button>
          </div>

          <!-- Comments Container -->
          <div class="comments-container" id="comments-${post.id}">
            <div class="comment-input-row">
              <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') App.submitComment(${post.id})">
              <button class="comment-submit-btn" onclick="App.submitComment(${post.id})">Reply</button>
            </div>
            <div class="comments-list" id="comments-list-${post.id}">
              <!-- Injected comments -->
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  async toggleLike(postId, button) {
    if (!Auth.isLoggedIn()) {
      Auth.showModal();
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to like post');

      const countSpan = button.querySelector('.like-count');
      const iconSpan = button.querySelector('.action-icon');

      if (data.is_liked) {
        button.classList.add('liked');
        iconSpan.textContent = '❤️';
      } else {
        button.classList.remove('liked');
        iconSpan.textContent = '🤍';
      }
      countSpan.textContent = data.likes_count;

      // Update post model in memory
      const post = this.posts.find(p => p.id === postId);
      if (post) {
        post.is_liked = data.is_liked;
        post.likes_count = data.likes_count;
      }
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  async toggleComments(postId) {
    const container = document.getElementById(`comments-${postId}`);
    if (!container) return;

    if (container.classList.contains('active')) {
      container.classList.remove('active');
    } else {
      container.classList.add('active');
      this.loadComments(postId);
    }
  },

  async loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const comments = await res.json();

      const currentUser = Auth.getUser();

      if (comments.length === 0) {
        list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">No comments yet. Start the conversation!</div>`;
        return;
      }

      list.innerHTML = comments.map(c => {
        const isCommentOwner = currentUser && currentUser.id === c.user_id;
        return `
          <div class="comment-item" id="comment-${c.id}">
            <a href="/profile.html?username=${c.username}">
              <img src="${c.user_avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + c.username}" class="author-avatar" style="width: 32px; height: 32px;">
            </a>
            <div class="comment-content">
              <div class="comment-header">
                <div>
                  <a href="/profile.html?username=${c.username}" class="comment-author">${c.user_name}</a>
                  <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 0.35rem;">@${c.username}</span>
                </div>
                <div>
                  <span class="comment-time">${this.formatRelativeTime(c.created_at)}</span>
                  ${isCommentOwner ? `<button class="delete-comment-btn" onclick="App.deleteComment(${c.id}, ${postId})">✕</button>` : ''}
                </div>
              </div>
              <p class="comment-text">${this.linkifyText(c.content)}</p>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      list.innerHTML = `<div style="color: var(--danger); font-size: 0.85rem;">Failed to load comments</div>`;
    }
  },

  async submitComment(postId) {
    if (!Auth.isLoggedIn()) {
      Auth.showModal();
      return;
    }

    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit comment');

      input.value = '';
      const countEl = document.getElementById(`comment-count-${postId}`);
      if (countEl) countEl.textContent = data.comments_count;

      this.loadComments(postId);
      Toast.show('Comment posted!', 'success');
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  async deleteComment(commentId, postId) {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete comment');

      const countEl = document.getElementById(`comment-count-${postId}`);
      if (countEl) countEl.textContent = data.comments_count;

      this.loadComments(postId);
      Toast.show('Comment removed', 'info');
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  async deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete post');

      this.posts = this.posts.filter(p => p.id !== postId);
      this.renderPosts();
      Toast.show('Post deleted', 'info');
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  setupCreatePost() {
    const postBtn = document.getElementById('submitPostBtn');
    const textarea = document.getElementById('postContentInput');
    const imageInput = document.getElementById('postImageInput');
    const previewContainer = document.getElementById('postPreviewContainer');
    const previewImg = document.getElementById('postPreviewImg');
    const removePreviewBtn = document.getElementById('removePreviewBtn');
    const addImageBtn = document.getElementById('addImageBtn');

    if (addImageBtn) {
      addImageBtn.addEventListener('click', () => {
        const url = prompt('Enter an image URL (Unsplash or direct image):', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&q=80');
        if (url) {
          imageInput.value = url;
          previewImg.src = url;
          previewContainer.style.display = 'block';
        }
      });
    }

    if (removePreviewBtn) {
      removePreviewBtn.addEventListener('click', () => {
        imageInput.value = '';
        previewContainer.style.display = 'none';
      });
    }

    if (postBtn) {
      postBtn.addEventListener('click', async () => {
        if (!Auth.isLoggedIn()) {
          Auth.showModal();
          return;
        }

        const content = textarea.value.trim();
        const image_url = imageInput.value.trim() || null;

        if (!content) {
          Toast.show('Post content cannot be empty', 'error');
          return;
        }

        try {
          postBtn.disabled = true;
          postBtn.textContent = 'Posting...';

          const res = await fetch('/api/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ content, image_url })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to create post');

          textarea.value = '';
          imageInput.value = '';
          previewContainer.style.display = 'none';
          Toast.show('Post shared with the world!', 'success');

          this.posts.unshift(data.post);
          this.renderPosts();
        } catch (e) {
          Toast.show(e.message, 'error');
        } finally {
          postBtn.disabled = false;
          postBtn.textContent = 'Publish';
        }
      });
    }
  },

  async loadSuggestedUsers() {
    const list = document.getElementById('suggestedUsersList');
    if (!list) return;

    try {
      const headers = {};
      if (Auth.isLoggedIn()) {
        headers['Authorization'] = `Bearer ${Auth.getToken()}`;
      }

      const res = await fetch('/api/users/suggested', { headers });
      this.suggestedUsers = await res.json();

      list.innerHTML = this.suggestedUsers.map(user => `
        <div class="suggested-user-item">
          <div class="suggested-user-left">
            <a href="/profile.html?username=${user.username}">
              <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.username}" class="author-avatar" style="width: 38px; height: 38px;">
            </a>
            <div style="overflow: hidden;">
              <a href="/profile.html?username=${user.username}" style="font-weight: 700; font-size: 0.9rem; display: block; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${user.name}
              </a>
              <div style="font-size: 0.78rem; color: var(--text-muted);">@${user.username}</div>
            </div>
          </div>
          <button class="follow-btn ${user.is_following ? 'following' : 'follow'}" onclick="App.toggleFollow(${user.id}, this)">
            ${user.is_following ? 'Following' : 'Follow'}
          </button>
        </div>
      `).join('');
    } catch (e) {
      console.error('Failed to load suggestions', e);
    }
  },

  async toggleFollow(userId, btn) {
    if (!Auth.isLoggedIn()) {
      Auth.showModal();
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to follow user');

      if (data.is_following) {
        btn.className = 'follow-btn following';
        btn.textContent = 'Following';
        Toast.show('Followed user!', 'success');
      } else {
        btn.className = 'follow-btn follow';
        btn.textContent = 'Follow';
        Toast.show('Unfollowed user', 'info');
      }

      // If in following feed, reload feed
      if (this.currentTab === 'following') {
        this.loadPosts();
      }
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  sharePost(postId) {
    const url = window.location.origin + `/profile.html#post-${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      Toast.show('Post link copied to clipboard!', 'success');
    }).catch(() => {
      Toast.show(`Share link: ${url}`, 'info');
    });
  },

  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);

    if (diffSecs < 60) return 'just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  },

  linkifyText(text) {
    if (!text) return '';
    const safeText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Link hashtags and handles
    return safeText
      .replace(/(#[\w_]+)/g, '<span style="color: var(--primary-accent); font-weight: 600;">$1</span>')
      .replace(/(@[\w_]+)/g, '<span style="color: #a855f7; font-weight: 600;">$1</span>');
  }
};

window.App = App;
