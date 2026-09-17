# CodeAlpha Task 2: Full-Stack Social Media Platform (Pulse)

A dynamic, modern social media web application built for the **CodeAlpha Full Stack Development Internship**.

---

## 🚀 Features

1. **User Profiles (`profile.html`)**:
   - Comprehensive creator profiles featuring custom cover banners, profile avatars, display name, handle `@username`, bio, location, personal website link, and account creation date.
   - Live real-time stats counter: Posts count, Followers count, and Following count.
   - Interactive **Edit Profile** modal to update profile metadata in real-time.
   - Tabbed view showing the creator's authored posts.

2. **Posts & Media**:
   - Create and publish thoughts and updates with optional high-resolution media attachments.
   - Smart hashtag (`#`) and `@mention` auto-highlighting in posts and comments.
   - Relative timestamps ("just now", "15m ago", "2h ago").
   - Post authors can delete their own posts with immediate live UI re-rendering.

3. **Interactive Comment System**:
   - Collapsible comment drawer attached directly to every post card.
   - Add new comments with live counter increment.
   - Comment authors can delete their own comments.

4. **Like System**:
   - Instant heart/like toggle with animated feedback and live like count updates.
   - Optimistic UI updates synchronized with the backend.

5. **Follow / Unfollow System**:
   - Follow and unfollow other creators across profile views and the "Who to Follow" widget.
   - Dynamic Dual Feed Tabs:
     - **For You**: Global stream of all community updates.
     - **Following Feed**: Personalized stream exclusively showing posts from creators you follow!

6. **Authentication & Multi-Account Switcher**:
   - JSON Web Token (JWT) session security with `bcryptjs` password hashing.
   - Registration and Sign-In forms with pre-configured 1-click demo accounts for seamless review:
     - `@alexrivera` (Alex Rivera - Full-stack engineer)
     - `@sophiachen` (Sophia Chen - AI Researcher)
     - `@marcusvance` (Marcus Vance - Cloud Architect)

7. **Database Architecture**:
   - SQLite database (`social.db`) with tables for `users`, `posts`, `comments`, `likes`, and `follows` with foreign key cascade support.
   - Pre-seeded with rich sample creators, posts, comments, and follower connections.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Modern dark mode, responsive 3-column layout, glassmorphic card design), Vanilla JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (Node.js native driver).
- **Security & Auth**: `bcryptjs` for password hashing, `jsonwebtoken` (JWT) for authentication tokens, CORS enabled.

---

## 📦 Installation & Setup

1. Open your terminal and navigate to the project directory:
   ```bash
   cd Task2_Social_Media_Platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3002
   ```

---

## 🔑 Demo Creators

| Username | Full Name | Password |
|---|---|---|
| `alexrivera` | Alex Rivera | `password123` |
| `sophiachen` | Sophia Chen | `password123` |
| `marcusvance` | Marcus Vance | `password123` |

*(You can also click any creator name under the "Quick Switch Demo Creators" section inside the sign-in modal)*

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in and receive JWT token |
| `GET` | `/api/auth/me` | Fetch active user profile |
| `GET` | `/api/auth/demo-accounts` | List pre-seeded accounts |
| `GET` | `/api/posts` | Get posts feed (`?feed=all` or `?feed=following` or `?username=`) |
| `POST` | `/api/posts` | Create a new post |
| `DELETE` | `/api/posts/:id` | Delete own post |
| `POST` | `/api/posts/:id/like` | Toggle like/unlike on a post |
| `GET` | `/api/posts/:id/comments` | Fetch comments for a post |
| `POST` | `/api/posts/:id/comments` | Add a comment to a post |
| `DELETE` | `/api/comments/:id` | Delete own comment |
| `GET` | `/api/users/:username` | Fetch user profile and stats |
| `PUT` | `/api/users/profile` | Update profile information |
| `POST` | `/api/users/:id/follow` | Toggle follow/unfollow user |
| `GET` | `/api/users/suggested` | Fetch suggested accounts to follow |
