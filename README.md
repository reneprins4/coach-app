# 🏋️ Coach App

AI-powered workout tracker with intelligent coaching feedback.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + RLS)
- **AI:** Anthropic Claude API
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

### Setup

```bash
# Clone
git clone https://github.com/reneprins4/coach-app.git
cd coach-app

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Run the Supabase schema
# Copy supabase/schema.sql into your Supabase SQL Editor and run it

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `ANTHROPIC_API_KEY` | Anthropic API key (for edge functions) |

## Database Schema

### `exercises`
Public library of exercises with name, muscle group, and category.

### `workouts`
Training sessions tied to authenticated users. Includes optional notes.

### `sets`
Individual sets within a workout: exercise, weight (kg), reps, and RPE.

All tables have Row Level Security (RLS) enabled — users can only access their own data.

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy — Vercel auto-detects Vite

## Project Structure

```
coach-app/
├── public/
├── src/
│   ├── lib/
│   │   └── supabase.js      # Supabase client
│   ├── App.jsx               # Main app component
│   ├── App.css
│   ├── index.css             # Tailwind entry
│   └── main.jsx              # React entry
├── supabase/
│   └── schema.sql            # Database schema + seed data
├── .env.example
├── vercel.json
├── vite.config.js
└── package.json
```

## License

MIT
