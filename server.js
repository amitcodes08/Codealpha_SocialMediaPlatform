const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'codealpha_social_jwt_secret_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middlewares
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session' });
    req.user = user;
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------
app.get('/api/auth/demo-accounts', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, name, email, avatar_url, bio FROM users LIMIT 5').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch demo accounts' });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!username || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email.toLowerCase().trim(), cleanUsername);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with that username or email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
    const defaultCover = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80';

    const result = db.prepare(`
      INSERT INTO users (username, name, email, password_hash, avatar_url, cover_url, bio)
      VALUES (?, ?, ?, ?, ?, ?, 'Hello, I just joined Pulse!')
    `).run(cleanUsername, name.trim(), email.toLowerCase().trim(), passwordHash, defaultAvatar, defaultCover);

    const user = {
      id: Number(result.lastInsertRowid),
      username: cleanUsername,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      avatar_url: defaultAvatar
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Account created successfully', token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { login, password } = req.body; // login can be email or username
    if (!login || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const cleanLogin = login.toLowerCase().trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(cleanLogin, cleanLogin);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, name, email, bio, avatar_url, cover_url, location, website, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// -------------------------------------------------------------
// USER & PROFILE ROUTES
// -------------------------------------------------------------
app.get('/api/users/suggested', optionalAuth, (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 0;
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.avatar_url, u.bio,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
      FROM users u
      WHERE u.id != ?
      ORDER BY followers_count DESC
      LIMIT 5
    `).all(currentUserId, currentUserId);

    res.json(users.map(u => ({ ...u, is_following: Boolean(u.is_following) })));
  } catch (err) {
    console.error('Suggested users error:', err);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

app.get('/api/users/:username', optionalAuth, (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 0;
    const targetUsername = req.params.username.toLowerCase().trim();

    const user = db.prepare(`
      SELECT id, username, name, bio, avatar_url, cover_url, location, website, created_at
      FROM users WHERE username = ?
    `).get(targetUsername);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const stats = {
      followers_count: db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(user.id).count,
      following_count: db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(user.id).count,
      posts_count: db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count,
      is_following: Boolean(db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, user.id))
    };

    res.json({ ...user, stats });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.put('/api/users/profile', authenticateToken, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const { name, bio, avatar_url, cover_url, location, website } = req.body;
    const newName = name !== undefined && name !== null ? name : existing.name;
    const newBio = bio !== undefined && bio !== null ? bio : existing.bio;
    const newAvatar = avatar_url !== undefined && avatar_url !== null ? avatar_url : existing.avatar_url;
    const newCover = cover_url !== undefined && cover_url !== null ? cover_url : existing.cover_url;
    const newLocation = location !== undefined && location !== null ? location : existing.location;
    const newWebsite = website !== undefined && website !== null ? website : existing.website;

    db.prepare(`
      UPDATE users 
      SET name = ?,
          bio = ?,
          avatar_url = ?,
          cover_url = ?,
          location = ?,
          website = ?
      WHERE id = ?
    `).run(newName, newBio, newAvatar, newCover, newLocation, newWebsite, req.user.id);

    const updatedUser = db.prepare('SELECT id, username, name, email, bio, avatar_url, cover_url, location, website FROM users WHERE id = ?').get(req.user.id);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/users/:id/follow', authenticateToken, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const existingFollow = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, targetUserId);

    let isFollowing = false;
    if (existingFollow) {
      db.prepare('DELETE FROM follows WHERE id = ?').run(existingFollow.id);
      isFollowing = false;
    } else {
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(currentUserId, targetUserId);
      isFollowing = true;
    }

    const followersCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(targetUserId).count;

    res.json({
      message: isFollowing ? 'Followed user' : 'Unfollowed user',
      is_following: isFollowing,
      followers_count: followersCount
    });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
});

// -------------------------------------------------------------
// POSTS ROUTES
// -------------------------------------------------------------
app.get('/api/posts', optionalAuth, (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : 0;
    const { feed, username } = req.query;

    let query = `
      SELECT p.id, p.content, p.image_url, p.created_at,
             u.id as user_id, u.username, u.name as user_name, u.avatar_url as user_avatar,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;
    const params = [currentUserId];

    if (username) {
      query += ' WHERE u.username = ?';
      params.push(username.toLowerCase().trim());
    } else if (feed === 'following' && currentUserId) {
      query += ' WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR p.user_id = ?';
      params.push(currentUserId, currentUserId);
    }

    query += ' ORDER BY p.created_at DESC';

    const posts = db.prepare(query).all(...params);
    res.json(posts.map(p => ({ ...p, is_liked: Boolean(p.is_liked) })));
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', authenticateToken, (req, res) => {
  try {
    const { content, image_url } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }

    const result = db.prepare(`
      INSERT INTO posts (user_id, content, image_url)
      VALUES (?, ?, ?)
    `).run(req.user.id, content.trim(), image_url ? image_url.trim() : null);

    const post = db.prepare(`
      SELECT p.id, p.content, p.image_url, p.created_at,
             u.id as user_id, u.username, u.name as user_name, u.avatar_url as user_avatar,
             0 as likes_count, 0 as comments_count, 0 as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Post created', post: { ...post, is_liked: false } });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.delete('/api/posts/:id', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// -------------------------------------------------------------
// LIKES ROUTE
// -------------------------------------------------------------
app.post('/api/posts/:id/like', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const existingLike = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, userId);

    let isLiked = false;
    if (existingLike) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existingLike.id);
      isLiked = false;
    } else {
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
      isLiked = true;
    }

    const likesCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId).count;

    res.json({
      message: isLiked ? 'Post liked' : 'Post unliked',
      is_liked: isLiked,
      likes_count: likesCount
    });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// -------------------------------------------------------------
// COMMENTS ROUTES
// -------------------------------------------------------------
app.get('/api/posts/:id/comments', (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const comments = db.prepare(`
      SELECT c.id, c.content, c.created_at,
             u.id as user_id, u.username, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

app.post('/api/posts/:id/comments', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const result = db.prepare(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(postId, req.user.id, content.trim());

    const comment = db.prepare(`
      SELECT c.id, c.content, c.created_at,
             u.id as user_id, u.username, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    const commentsCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId).count;

    res.status(201).json({ message: 'Comment added', comment, comments_count: commentsCount });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.delete('/api/comments/:id', authenticateToken, (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const comment = db.prepare('SELECT user_id, post_id FROM comments WHERE id = ?').get(commentId);

    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comment' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    const commentsCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(comment.post_id).count;

    res.json({ message: 'Comment deleted', comments_count: commentsCount });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Fallback profile routing
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.listen(PORT, () => {
  console.log(`Task 2 Social Media Platform server running at http://localhost:${PORT}`);
});
