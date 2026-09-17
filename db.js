const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'social.db');
const db = new DatabaseSync(dbPath);

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bio TEXT,
      avatar_url TEXT,
      cover_url TEXT,
      location TEXT,
      website TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Check if users exist, otherwise seed
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (username, name, email, password_hash, bio, avatar_url, cover_url, location, website)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // User 1
    insertUser.run(
      'alexrivera',
      'Alex Rivera',
      'alex@example.com',
      passwordHash,
      'Full-stack engineer & creative technologist. Crafting minimal, ultra-responsive digital products 🚀',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
      'San Francisco, CA',
      'https://alexrivera.dev'
    );

    // User 2
    insertUser.run(
      'sophiachen',
      'Sophia Chen',
      'sophia@example.com',
      passwordHash,
      'AI researcher & photographer. Exploring generative models and capturing city skylines after dark 📸✨',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80',
      'Seattle, WA',
      'https://sophiachen.ai'
    );

    // User 3
    insertUser.run(
      'marcusvance',
      'Marcus Vance',
      'marcus@example.com',
      passwordHash,
      'Cloud Architect & open-source contributor. Obsessed with distributed systems, clean architecture, and cold brew ☕',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
      'Austin, TX',
      'https://marcusvance.io'
    );

    // Seed Follows (Alex follows Sophia, Sophia follows Alex & Marcus, Marcus follows Alex)
    const insertFollow = db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
    insertFollow.run(1, 2); // Alex -> Sophia
    insertFollow.run(2, 1); // Sophia -> Alex
    insertFollow.run(2, 3); // Sophia -> Marcus
    insertFollow.run(3, 1); // Marcus -> Alex

    // Seed Posts
    const insertPost = db.prepare('INSERT INTO posts (user_id, content, image_url, created_at) VALUES (?, ?, ?, ?)');
    insertPost.run(
      1,
      'Just deployed our brand new design system update! Glassmorphism combined with micro-interactions makes web applications feel so alive and responsive. What do you think?',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&q=80',
      "2026-09-17 14:30:00"
    );

    insertPost.run(
      2,
      'Golden hour captured over Puget Sound yesterday. Nature never ceases to inspire creative workflows. Remember to take a break from the terminal today! 🌲✨',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&q=80',
      "2026-09-17 18:15:00"
    );

    insertPost.run(
      3,
      'Exploring edge compute runtimes with SQLite in Node 24. The sub-millisecond query latencies without spinning up heavy external services is an absolute game changer.',
      null,
      "2026-09-17 20:00:00"
    );

    // Seed Likes
    const insertLike = db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)');
    insertLike.run(1, 2); // Sophia likes Alex's post
    insertLike.run(1, 3); // Marcus likes Alex's post
    insertLike.run(2, 1); // Alex likes Sophia's post
    insertLike.run(3, 1); // Alex likes Marcus's post
    insertLike.run(3, 2); // Sophia likes Marcus's post

    // Seed Comments
    const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)');
    insertComment.run(1, 2, 'The contrast and blur effect look incredibly sleek! Great job Alex!', "2026-09-17 15:00:00");
    insertComment.run(1, 3, 'Agreed, buttery smooth animations.', "2026-09-17 16:20:00");
    insertComment.run(2, 1, 'Stunning shot Sophia! The lighting is immaculate.', "2026-09-17 18:45:00");
    insertComment.run(3, 1, 'Native SQLite in Node is easily one of the best recent additions.', "2026-09-17 20:45:00");
  }
}

initSchema();

module.exports = db;
