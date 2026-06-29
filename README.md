# GitHub Profile Analyzer API

A backend service that analyzes GitHub user profiles, stores insights in a local SQL database for development, and supports Aiven PostgreSQL in production with Vercel deployment.

## Features

- Analyze GitHub profiles using the public GitHub API
- Store useful profile insights in PostgreSQL
- Retrieve all stored analyses
- Retrieve a single stored profile by username
- Shared service layer supports Express and Vercel API routes

## Tech Stack

- Node.js
- Express.js
- MySQL (local development)
- PostgreSQL (Aiven / production)
- GitHub API
- Axios
- Vercel serverless functions

## Setup Instructions

1. Clone the repository

```bash
git clone <repo-url>
cd Assigment
```

2. Install dependencies

```bash
npm install
```

3. Start your local SQL server

For local development, the project uses MySQL by default.

```bash
brew services start mysql
# or use your preferred MySQL service manager
```

4. Create the database

Create the local database before running the app:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS github_profile_analyzer;"
```

The application automatically creates the `profiles` table at startup.

If you prefer to create the table manually for local MySQL, you can run:

```bash
mysql -u root -p github_profile_analyzer < schema.sql
```

5. Configure environment variables

Create a `.env` file in the project root from `.env.example`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=github_profile_analyzer
DATABASE_URL=
DB_SSL=false
```

If you use a hosted provider like Aiven, set `DATABASE_URL` to the full connection string and leave the other database fields blank.

6. Start the Express API locally

```bash
npm run dev
```

The local server will run at `http://localhost:3000`.

## Local API Endpoints

- `POST /api/profiles/analyze`
  - Body: `{ "username": "github_username" }`
- `GET /api/profiles`
- `GET /api/profiles/:username`

## Vercel Deployment

The repository includes serverless routes under `api/` and a `vercel.json` deployment configuration.

### Required environment variables on Vercel

- `DATABASE_URL`

For Aiven Postgres, use a connection string like:

```env
DATABASE_URL=postgres://avnadmin:YOUR_PASSWORD@pg-20c7c710-lpu-5ad9.l.aivencloud.com:27070/defaultdb?sslmode=require
```

### Recommended hosted PostgreSQL providers

- Aiven
- Railway
- ElephantSQL
- Amazon RDS

> Use a remote PostgreSQL database for Vercel deployment. Local `localhost` is not accessible from Vercel.

### Deploying to Vercel

1. Push your repo to GitHub
2. Import the repository into the Vercel dashboard
3. Add the required environment variables in Vercel
4. Deploy

Your live API URL will be `https://<your-app>.vercel.app`

## Vercel API Endpoints

- `POST /api/profiles/analyze`
  - Body: `{ "username": "github_username" }`
- `GET /api/profiles`
- `GET /api/profiles/:username`

## Example Requests

### Analyze a profile locally

```bash
curl -X POST http://localhost:3000/api/profiles/analyze \
  -H "Content-Type: application/json" \
  -d '{"username":"octocat"}'
```

### Analyze a profile on Vercel

```bash
curl -X POST https://<your-app>.vercel.app/api/profiles/analyze \
  -H "Content-Type: application/json" \
  -d '{"username":"octocat"}'
```

### Fetch all analyzed profiles

```bash
curl http://localhost:3000/api/profiles
```

### Fetch a single profile

```bash
curl http://localhost:3000/api/profiles/octocat
```

## Notes

- This service uses the GitHub public API and is subject to rate limits.
- The shared service layer enables reuse across local Express and Vercel serverless functions.
- For production, use a remote PostgreSQL host and configure `DATABASE_URL` in Vercel.
