# GitHub Profile Analyzer API 🚀

A robust backend service designed to analyze GitHub user profiles, calculate popularity metrics, and persist insights. Built with a flexible architecture that supports both local development and serverless cloud deployment.

## 🎯 Project Overview

This project was built to demonstrate a full-stack backend capable of gracefully handling different environments. It fetches data from the public GitHub API, processes it to generate custom insights (like a `popularity_score`), and stores the historical data for future querying.

### Key Features
- **Profile Analysis**: Fetches and aggregates GitHub user metrics.
- **Dual-Environment Architecture**: Runs as a standard Express.js app locally and as Serverless Functions on Vercel in production.
- **Resilient Data Storage**: Uses a dynamic database connection wrapper that switches between local MySQL, cloud PostgreSQL (Aiven), and an ephemeral JSON fallback.
- **Ready-to-Test**: Includes a fully configured Postman Collection with dynamic variables for seamless testing.

---

## 🏗️ Architecture & Design Decisions

### 1. The Dual Storage Engine
To provide a smooth developer experience without sacrificing production reliability, the data layer (`src/config/db.js`) uses a smart wrapper:
- **Local Development**: Defaults to **MySQL**. It dynamically creates connection pools and handles schema initialization at startup.
- **Production (Vercel)**: Automatically detects the Vercel environment and `DATABASE_URL`, switching the dialect to **PostgreSQL** to connect to an Aiven-hosted database.
- **In-Memory / JSON Fallback**: If a database connection fails or tables are missing, the query wrapper safely intercepts the failure and falls back to a local JSON file store (using `/tmp` on Vercel to bypass read-only filesystem restrictions).

### 2. Serverless vs. Long-Running Server
The project maintains an `app.js` file for traditional Express server routing (great for local testing via `npm run dev`). 
However, for deployment, it uses Vercel's `api/` directory structure. The business logic (`src/services` and `src/models`) is decoupled from the transport layer, allowing the exact same code to be executed by Vercel Serverless Functions and Express routes simultaneously.

### 3. Smart Error Handling
When deployed to serverless environments, debugging database timeouts or missing schemas can be difficult. The API is designed to return detailed stack traces in non-production environments and graceful fallback data when the primary database is unreachable.

---

## 🚀 Live Demo & Testing

- **Live UI & API**: [https://github-analyzer-beta-beryl.vercel.app](https://github-analyzer-beta-beryl.vercel.app)
- **Postman Collection**: A fully configured Postman collection is hosted live at [https://github-analyzer-beta-beryl.vercel.app/postman_collection.json](https://github-analyzer-beta-beryl.vercel.app/postman_collection.json). 
  - *To test: Open Postman → Click Import → Link → Paste the URL above.* It includes a `{{baseUrl}}` variable to easily switch between `localhost:3000` and the Vercel deployment.

---

## 💻 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js (Local) / Vercel Serverless Functions (Prod)
- **Databases**: MySQL (Local), PostgreSQL via Aiven (Prod)
- **HTTP Client**: Axios (for GitHub API requests)
- **Database Drivers**: `mysql2`, `pg`

---

## 🛠️ Setup Instructions (Local Development)

### 1. Clone & Install
```bash
git clone <repo-url>
cd Assigment
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=github_profile_analyzer
# Leave blank for local MySQL, or add Aiven connection string for Postgres
DATABASE_URL=
```

### 3. Database Initialization
Ensure your local MySQL server is running. The application will **automatically create the necessary `profiles` table** when you start the server.
```bash
brew services start mysql
```

### 4. Start the Server
```bash
npm run dev
```
The local server will run at `http://localhost:3000`.

---

## 🌐 API Endpoints

The endpoints are identical across both local and production environments:

| Method | Endpoint | Description | Body / Params |
|--------|----------|-------------|---------------|
| `POST` | `/api/profiles` | Fetches GitHub data, analyzes it, and stores the profile. | `{ "username": "torvalds" }` |
| `GET`  | `/api/profiles` | Returns all historically analyzed profiles, sorted by date. | *None* |
| `GET`  | `/api/profiles/:username` | Retrieves a specific profile from the database. | URL Param: `username` |

---

## 🧠 Challenges Overcome During Development

1. **Vercel Read-Only Filesystem**: The initial database fallback mechanism attempted to write to `src/data/profiles.json`. On Vercel, serverless functions execute in a read-only environment, causing 500 errors. This was resolved by detecting the Vercel environment (`process.env.VERCEL`) and dynamically routing fallback writes to the `/tmp` directory.
2. **Schema Synchronization**: Because Vercel does not run the `app.js` entry point, the automatic table creation logic (`initializeDb`) isn't triggered on deployment. To fix this, the Aiven database schema was initialized separately using a direct script execution against the production URL.
3. **Cross-Dialect Querying**: MySQL and PostgreSQL handle JSON inserts differently (Strings vs. JSONB). The `profileModel` was enhanced to conditionally serialize `raw_data` based on the active SQL dialect, ensuring data integrity across both databases.
