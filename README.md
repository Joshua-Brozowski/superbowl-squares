# Super Bowl LX Squares Game

A real-time Super Bowl Squares game for Patriots vs Seahawks - February 8, 2026

## 🆕 NEW FEATURES

### 1. **Deselect Squares**
- Click your own square again to deselect it
- Helps fix mistakes before the game starts

### 2. **Strategic Number Reveal**
- Numbers are revealed when **anyone** reaches 11 squares (5 remaining)
- Last 5 picks can be strategic based on visible numbers
- Adds excitement and strategy to the final picks

### 3. **Mobile-Optimized**
- Compact header and scoreboard
- Everything fits on mobile screens
- Navigation arrows (▼ and ►) show team directions
- Responsive text sizing

## Features

- 6 players: Joshua, AJ, Sharon, Jim, Patia, Kim
- 10x10 grid (100 squares)
- 16 squares max per player (96 total, 4 dead squares for Toby)
- Smart number reveal at 11 squares OR when all 96 filled
- Click to select, click again to deselect
- 4 quarter winners (Q1, Q2, Q3, Final)
- Admin mode to select winners
- Real-time updates across devices
- No authentication needed (family game)

## Quick Deploy to Vercel

### 1. Prerequisites
- Vercel account
- MongoDB Atlas account (free tier works)

### 2. Set up MongoDB Atlas
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs (0.0.0.0/0) for quick deployment
5. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/`)

### 3. Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Navigate to project directory
cd superbowl-squares

# Deploy
vercel

# Add MongoDB environment variable when prompted
# Or add it later in Vercel dashboard
```

**Option B: Using Vercel Dashboard**
1. Push this code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Add environment variable:
   - Key: `MONGODB_URI`
   - Value: Your MongoDB connection string
5. Click Deploy

### 4. Add Environment Variable (if not done during deployment)
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add:
   - Name: `MONGODB_URI`
   - Value: `mongodb+srv://username:password@cluster.mongodb.net/superbowl`
4. Redeploy if needed

## How to Play

1. **Login**: Each player selects their name from the login screen
2. **Pick Squares**: Click on empty squares to claim them (max 16 per player)
   - Click your own square again to deselect it
3. **Number Reveal**: When anyone reaches 11 squares, numbers are revealed
   - Last 5 picks can be strategic!
4. **Watch the Game**: Winners are determined by the last digit of each team's score at the end of each quarter
5. **Admin Controls**: Anyone can toggle admin mode, choose a quarter, and click a square to mark it as winner

## Game Rules

- 10x10 grid = 100 squares
- Patriots on top (horizontal axis)
- Seahawks on left (vertical axis)
- Each player can claim up to 16 squares
- 4 dead squares remain unclaimed (for Toby the dog)
- Numbers (0-9) are randomly assigned when:
  - Someone picks their 11th square (reveals early for strategy), OR
  - All 96 squares are filled
- Winner is determined by last digit of each team's score
- Example: If Patriots have 17 and Seahawks have 14 at Q1 end, the square at Patriots "7" and Seahawks "4" wins Q1

## Admin Features

- Toggle admin mode with button
- Select which quarter (Q1, Q2, Q3, Final)
- Click on the winning square to mark it
- Can edit/change winners if mistakes are made
- Winners display in the banner at the top

## Technical Stack

- Frontend: Vanilla JavaScript, HTML, CSS
- Backend: Node.js serverless functions
- Database: MongoDB Atlas
- Hosting: Vercel

## Data Persistence

- Game state stored in MongoDB
- Each player's session persists via localStorage (name only)
- No authentication required - simple name selection
- State syncs across all devices every 2 seconds
- All players see updates in real-time

## File Structure

```
superbowl-squares/
├── api/
│   └── index.js          # Backend API with MongoDB
├── public/
│   ├── index.html        # Login page
│   ├── game.html         # Main game page
│   ├── styles.css        # Mobile-friendly styling
│   └── game.js           # Frontend logic
├── package.json
├── vercel.json           # Vercel config
└── README.md
```

## Local Development

```bash
# Install dependencies
npm install

# Run locally (requires Vercel CLI)
vercel dev

# Access at http://localhost:3000
```

## Support

For issues or questions during the game tomorrow, refresh the page or check your MongoDB connection if updates aren't syncing.

**Go Pats! Go Hawks! 🏈**
