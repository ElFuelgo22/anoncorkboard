# Gazelvouer Academy - Anonymous Corkboard

A modern, anonymous posting platform built with Supabase and vanilla JavaScript.

## Features

- Anonymous posting with nicknames
- Real-time updates
- Admin panel for moderation
- Responsive design
- Character limits for posts

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your Supabase credentials
4. Start the development server: `npm start`
5. Open http://localhost:3131

## Deployment to Vercel

### Prerequisites
- Vercel account
- Supabase project set up

### Steps

1. **Set up environment variables in Vercel:**
   Go to your Vercel project settings and add these environment variables:
   
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ADMIN_USERNAME=your_admin_username
   ADMIN_PASSWORD=your_admin_password
   ```

2. **Deploy:**
   - Connect your repository to Vercel
   - Vercel will automatically use the `vercel.json` configuration
   - The serverless function in `api/index.js` will handle all requests

### Environment Variables Required:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `ADMIN_USERNAME`: Username for admin access
- `ADMIN_PASSWORD`: Password for admin access

## Project Structure

- `api/index.js` - Vercel serverless function (production)
- `server.js` - Express server (local development)
- `public/` - Static files (HTML, CSS, JS)
- `vercel.json` - Vercel deployment configuration

## Database Setup

Make sure your Supabase database has the required tables and RLS policies set up. Check the `db/` folder for schema files.
