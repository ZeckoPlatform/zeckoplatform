# Migration Guide: Replit to GitHub/Heroku

## Files to Export
1. Configuration Files:
   - package.json
   - vite.config.ts
   - tsconfig.json
   - drizzle.config.ts
   - Procfile
   - .env.example
   - .gitignore

2. Source Code:
   - /client directory
   - /server directory
   - /db directory

## Required Local Changes

### 1. Package.json Modifications
Current scripts section needs these adjustments for Heroku:
```json
{
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  }
}
```

### 2. Environment Variables
Update the following in your local .env file:
```env
# Server configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration (Update for your PostgreSQL instance)
DATABASE_URL=your_database_url

# Optional: Stripe configuration (if using payment features)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 3. Database Configuration
The drizzle.config.ts is already set up correctly for both environments. Ensure you:
1. Create a PostgreSQL database for your application
2. Update DATABASE_URL in your environment variables
3. Run migrations using `npm run db:push`

### 4. Running the project
- The workflow named 'Start application' is already setup and runs `npm run dev` which starts an Express server for the backend and a Vite server for the frontend.
- After making edits, the workflow will automatically be restarted for you.

## Heroku Deployment Steps
1. Create a new Heroku app
2. Add PostgreSQL addon: `heroku addons:create heroku-postgresql:hobby-dev`
3. Set environment variables in Heroku dashboard
4. Deploy using Git: `git push heroku main`

## Local Development Setup
1. Clone the repository from GitHub
2. Install dependencies: `npm install`
3. Copy .env.example to .env and update variables
4. Run development server: `npm run dev`
5. Build for production: `npm run build`

## Important Notes
- Remove all Replit-specific configurations before pushing to GitHub
- Ensure all sensitive data is moved to environment variables
- Test the application locally before deploying to Heroku
- The Procfile is already configured for Heroku deployment