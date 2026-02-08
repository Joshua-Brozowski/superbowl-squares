import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action } = req.body || {};
    const GAME_KEY = 'superbowl2026';

    // Initialize game state
    if (action === 'init') {
      const existingGame = await kv.get(GAME_KEY);

      if (!existingGame) {
        const gameState = {
          gameId: 'superbowl2026',
          version: 1,
          squares: Array(100).fill(null),
          players: {
            Joshua: 0,
            AJ: 0,
            Sharon: 0,
            Jim: 0,
            Patia: 0,
            Kim: 0
          },
          numbersAssigned: false,
          patriotsNumbers: [],
          seahawksNumbers: [],
          winners: {
            Q1: null,
            Q2: null,
            Q3: null,
            Final: null
          },
          scores: {
            Q1: { patriots: null, seahawks: null },
            Q2: { patriots: null, seahawks: null },
            Q3: { patriots: null, seahawks: null },
            Final: { patriots: null, seahawks: null }
          },
          locked: false,
          lastUpdated: new Date().toISOString()
        };
        await kv.set(GAME_KEY, gameState);
        return res.json(gameState);
      }

      // Ensure existing games have new fields
      let needsUpdate = false;
      if (existingGame.scores === undefined) {
        existingGame.scores = {
          Q1: { patriots: null, seahawks: null },
          Q2: { patriots: null, seahawks: null },
          Q3: { patriots: null, seahawks: null },
          Final: { patriots: null, seahawks: null }
        };
        needsUpdate = true;
      }
      if (existingGame.locked === undefined) {
        existingGame.locked = false;
        needsUpdate = true;
      }
      if (existingGame.version === undefined) {
        existingGame.version = 1;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await kv.set(GAME_KEY, existingGame);
      }

      return res.json(existingGame);
    }

    // Get game state
    if (action === 'getState') {
      const game = await kv.get(GAME_KEY);
      if (game) {
        // Ensure new fields exist
        if (game.scores === undefined) {
          game.scores = {
            Q1: { patriots: null, seahawks: null },
            Q2: { patriots: null, seahawks: null },
            Q3: { patriots: null, seahawks: null },
            Final: { patriots: null, seahawks: null }
          };
        }
        if (game.locked === undefined) {
          game.locked = false;
        }
        if (game.version === undefined) {
          game.version = 1;
        }
      }
      return res.json(game || {});
    }

    // Pick a square - with optimistic locking
    if (action === 'pickSquare') {
      const { squareIndex, player, expectedVersion } = req.body;

      // Retry logic for optimistic locking
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const game = await kv.get(GAME_KEY);

        // Check version if provided (optimistic locking)
        if (expectedVersion !== undefined && game.version !== expectedVersion) {
          // Version mismatch - return conflict error so client can retry with fresh state
          return res.status(409).json({
            error: 'State changed, please retry',
            code: 'VERSION_CONFLICT',
            currentState: game
          });
        }

        // Check if board is locked
        if (game.locked) {
          return res.status(400).json({ error: 'Board is locked! No changes allowed.' });
        }

        // If clicking own square, deselect it
        if (game.squares[squareIndex] === player) {
          game.squares[squareIndex] = null;
          game.players[player]--;
          game.version = (game.version || 0) + 1;
          game.lastUpdated = new Date().toISOString();

          await kv.set(GAME_KEY, game);
          return res.json(game);
        }

        // Check if square is taken by someone else
        if (game.squares[squareIndex] !== null) {
          return res.status(400).json({
            error: `Square already taken by ${game.squares[squareIndex]}!`,
            currentState: game
          });
        }

        // Check if player has reached limit (16 squares)
        if (game.players[player] >= 16) {
          return res.status(400).json({ error: 'You have already picked 16 squares!' });
        }

        // Update square and player count
        game.squares[squareIndex] = player;
        game.players[player]++;
        game.version = (game.version || 0) + 1;
        game.lastUpdated = new Date().toISOString();

        // Reveal numbers when any player reaches 11 squares (5 remaining)
        if (!game.numbersAssigned) {
          const anyoneAt11OrMore = Object.values(game.players).some(count => count >= 11);
          if (anyoneAt11OrMore) {
            game.patriotsNumbers = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            game.seahawksNumbers = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            game.numbersAssigned = true;
            game.numbersRevealedEarly = true;
          }
        }

        // Check if all 96 squares are filled
        const filledSquares = game.squares.filter(s => s !== null).length;
        if (filledSquares === 96 && !game.numbersAssigned) {
          game.patriotsNumbers = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
          game.seahawksNumbers = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
          game.numbersAssigned = true;
        }

        await kv.set(GAME_KEY, game);
        return res.json(game);
      }

      // If we get here, all retries failed
      return res.status(500).json({ error: 'Failed after multiple retries' });
    }

    // Lock board
    if (action === 'lockBoard') {
      const game = await kv.get(GAME_KEY);
      game.locked = true;
      game.version = (game.version || 0) + 1;
      game.lastUpdated = new Date().toISOString();
      await kv.set(GAME_KEY, game);
      return res.json(game);
    }

    // Unlock board
    if (action === 'unlockBoard') {
      const game = await kv.get(GAME_KEY);
      game.locked = false;
      game.version = (game.version || 0) + 1;
      game.lastUpdated = new Date().toISOString();
      await kv.set(GAME_KEY, game);
      return res.json(game);
    }

    // Set score for a quarter
    if (action === 'setScore') {
      const { quarter, patriots, seahawks } = req.body;

      const game = await kv.get(GAME_KEY);

      if (!game.scores) {
        game.scores = {
          Q1: { patriots: null, seahawks: null },
          Q2: { patriots: null, seahawks: null },
          Q3: { patriots: null, seahawks: null },
          Final: { patriots: null, seahawks: null }
        };
      }

      game.scores[quarter] = {
        patriots: patriots !== undefined ? patriots : null,
        seahawks: seahawks !== undefined ? seahawks : null
      };
      game.version = (game.version || 0) + 1;
      game.lastUpdated = new Date().toISOString();

      await kv.set(GAME_KEY, game);
      return res.json(game);
    }

    // Set winner
    if (action === 'setWinner') {
      const { quarter, squareIndex } = req.body;

      const game = await kv.get(GAME_KEY);
      const player = game.squares[squareIndex];
      game.winners[quarter] = { player, squareIndex };
      game.version = (game.version || 0) + 1;
      game.lastUpdated = new Date().toISOString();

      await kv.set(GAME_KEY, game);
      return res.json(game);
    }

    // Clear winner
    if (action === 'clearWinner') {
      const { quarter } = req.body;

      const game = await kv.get(GAME_KEY);
      game.winners[quarter] = null;
      game.version = (game.version || 0) + 1;
      game.lastUpdated = new Date().toISOString();

      await kv.set(GAME_KEY, game);
      return res.json(game);
    }

    // Reset game
    if (action === 'reset') {
      await kv.del(GAME_KEY);
      return res.json({ success: true });
    }

    res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
