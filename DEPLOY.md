# QUICK DEPLOYMENT GUIDE

## Get This Running in 10 Minutes!

### Step 1: Set Up MongoDB (5 minutes)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free account)
3. Create a FREE cluster (M0 tier)
4. Click "Connect" → "Drivers"
5. Create a database user (username + password)
6. Whitelist IP: 0.0.0.0/0 (allows all IPs - needed for Vercel)
7. Copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
   ```
8. Replace `<username>` and `<password>` with your actual credentials
9. Add `/superbowl` at the end:
   ```
   mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/superbowl
   ```

### Step 2: Deploy to Vercel (5 minutes)

#### Option 1: GitHub (Recommended)
1. Push this folder to a new GitHub repo
2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. In "Environment Variables" section, add:
   - Name: `MONGODB_URI`
   - Value: (paste your MongoDB connection string from Step 1)
6. Click "Deploy"
7. Done! Share the URL with your players

#### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# In this folder, run:
vercel

# Follow prompts
# When asked for env vars, add MONGODB_URI

# Deploy
vercel --prod
```

### Step 3: Test It!

1. Open the Vercel URL
2. Select a player name
3. Click "Enter"
4. Click some squares
5. Open in another browser/device
6. Select a different player
7. See real-time updates!
8. Pick 11 squares with one player to see numbers reveal early!

### NEW FEATURES TO TEST

**Deselect Squares:**
- Pick a square
- Click it again to deselect it
- Confirms before deselecting

**Strategic Number Reveal:**
- Have someone pick 11 squares (out of 16)
- Numbers will reveal automatically!
- Last 5 picks can be strategic

**Mobile Friendly:**
- Open on phone
- Everything should fit on screen
- Compact design with arrows showing team directions

### Troubleshooting

**"Failed to connect to server"**
- Check your MongoDB connection string
- Make sure you whitelisted 0.0.0.0/0 in MongoDB Atlas
- Verify environment variable in Vercel dashboard

**Squares not updating**
- Wait 2 seconds (auto-refresh interval)
- Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)

**Numbers not appearing**
- Numbers appear when someone reaches 11 squares, OR
- When all 96 squares are picked
- This is a new strategic feature!

**Can't deselect squares**
- Must be your own square
- Confirms before deselecting to prevent accidents

### Game Day Tips

- Share the Vercel URL with all players before the game
- Each person selects their name on login
- Pick strategically once numbers are revealed (at 11 squares)
- Admin mode can be toggled by ANYONE (trust system)
- After each quarter, admin selects the quarter, then clicks winning square
- Winners appear in banner at top
- Can deselect squares before game starts if you change your mind

### NEW STRATEGIC GAMEPLAY

The number reveal at 11 squares adds a fun twist:
- Early pickers go blind (no numbers visible)
- Once someone hits 11 squares, numbers reveal
- Everyone with picks remaining can strategize
- Adds excitement and fairness
- Traditional squares reveal all at once - this is more fun!

### Need Help?

- MongoDB Atlas: https://www.mongodb.com/docs/atlas/
- Vercel Deployment: https://vercel.com/docs
- Check the README.md for more details

**Enjoy the game! 🏈**
