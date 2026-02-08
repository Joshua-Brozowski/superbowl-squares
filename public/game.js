// Game state
let gameState = null;
let currentPlayer = localStorage.getItem('player');
let adminMode = false;
let selectedQuarter = null;
let lastNumbersAssignedState = false;

// Check if player is logged in
if (!currentPlayer) {
    window.location.href = 'index.html';
}

// API endpoint
const API_URL = '/api';

// Initialize game
async function init() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'init' })
        });
        
        gameState = await response.json();
        lastNumbersAssignedState = gameState.numbersAssigned;
        updateUI();
        
        // Poll for updates every 2 seconds
        setInterval(fetchGameState, 2000);
    } catch (error) {
        console.error('Error initializing:', error);
        alert('Failed to connect to server. Please refresh the page.');
    }
}

// Fetch current game state
async function fetchGameState() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getState' })
        });
        
        const newState = await response.json();
        
        // Check if numbers just got assigned
        if (!lastNumbersAssignedState && newState.numbersAssigned) {
            if (newState.numbersRevealedEarly) {
                alert('🎲 Numbers revealed! Someone has 11+ squares - time to strategize your final picks! 🏈');
            } else {
                alert('All squares are filled! Numbers have been assigned. Good luck! 🏈');
            }
        }
        
        gameState = newState;
        lastNumbersAssignedState = gameState.numbersAssigned;
        updateUI();
    } catch (error) {
        console.error('Error fetching state:', error);
    }
}

// Update UI
function updateUI() {
    if (!gameState) return;
    
    // Update player info
    document.getElementById('currentPlayer').textContent = currentPlayer;
    document.getElementById('squareCount').textContent = 
        `${gameState.players[currentPlayer]}/16`;
    
    // Update winners banner
    updateWinnersBanner();
    
    // Update grid
    updateGrid();
    
    // Update numbers if assigned
    if (gameState.numbersAssigned) {
        updateNumbers();
    }
}

// Update winners banner
function updateWinnersBanner() {
    ['Q1', 'Q2', 'Q3', 'Final'].forEach(quarter => {
        const winner = gameState.winners[quarter];
        const element = document.getElementById(quarter.toLowerCase() + 'Winner');
        
        if (winner) {
            element.textContent = winner.player;
            element.style.color = '#FFD700';
        } else {
            element.textContent = '-';
            element.style.color = '#fff';
        }
    });
}

// Update grid
function updateGrid() {
    const grid = document.getElementById('squaresGrid');
    
    if (grid.children.length === 0) {
        // Create grid for first time
        for (let i = 0; i < 100; i++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.dataset.index = i;
            
            square.addEventListener('click', () => handleSquareClick(i));
            
            grid.appendChild(square);
        }
    }
    
    // Update squares
    gameState.squares.forEach((player, index) => {
        const square = grid.children[index];
        
        if (player) {
            square.classList.add('taken', player);
            square.textContent = player;
        } else {
            square.classList.remove('taken');
            square.className = 'square';
            square.textContent = '';
        }
        
        // Highlight winner squares
        square.classList.remove('winner');
        Object.values(gameState.winners).forEach(winner => {
            if (winner && winner.squareIndex === index) {
                square.classList.add('winner');
            }
        });
    });
}

// Update numbers
function updateNumbers() {
    const patriotsRow = document.getElementById('patriotsNumbers');
    const seahawksCol = document.getElementById('seahawksNumbers');
    
    // Update Patriots numbers (horizontal)
    const patriotsCells = patriotsRow.querySelectorAll('.number-cell');
    gameState.patriotsNumbers.forEach((num, i) => {
        patriotsCells[i].textContent = num;
    });
    
    // Update Seahawks numbers (vertical)
    const seahawksCells = seahawksCol.querySelectorAll('.number-cell');
    gameState.seahawksNumbers.forEach((num, i) => {
        seahawksCells[i].textContent = num;
    });
}

// Handle square click
async function handleSquareClick(index) {
    if (adminMode) {
        // Admin mode - set winner
        if (!selectedQuarter) {
            alert('Please select a quarter first!');
            return;
        }
        
        const player = gameState.squares[index];
        if (!player) {
            alert('This square is not claimed by anyone!');
            return;
        }
        
        // Check if this quarter already has a winner
        if (gameState.winners[selectedQuarter]) {
            const confirm = window.confirm(
                `${selectedQuarter} already has a winner (${gameState.winners[selectedQuarter].player}). ` +
                `Do you want to change it to ${player}?`
            );
            
            if (!confirm) return;
        }
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'setWinner',
                    quarter: selectedQuarter,
                    squareIndex: index
                })
            });
            
            gameState = await response.json();
            updateUI();
            
            alert(`${player} wins ${selectedQuarter}! 🎉`);
        } catch (error) {
            console.error('Error setting winner:', error);
            alert('Failed to set winner. Please try again.');
        }
    } else {
        // Normal mode - pick/unpick square
        const squareOwner = gameState.squares[index];
        
        // If clicking own square, deselect it
        if (squareOwner === currentPlayer) {
            if (!confirm('Deselect this square?')) return;
        }
        
        // If square is taken by someone else
        if (squareOwner && squareOwner !== currentPlayer) {
            alert(`This square is already taken by ${squareOwner}!`);
            return;
        }
        
        // If trying to pick and already at limit
        if (!squareOwner && gameState.players[currentPlayer] >= 16) {
            alert('You have already picked 16 squares!');
            return;
        }
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'pickSquare',
                    squareIndex: index,
                    player: currentPlayer
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Failed to pick square');
                return;
            }
            
            const newState = await response.json();
            
            // Check if numbers just got assigned
            if (!lastNumbersAssignedState && newState.numbersAssigned) {
                if (newState.numbersRevealedEarly) {
                    alert('🎲 Numbers revealed! Someone has 11+ squares - time to strategize your final picks! 🏈');
                } else {
                    alert('All squares are filled! Numbers have been assigned. Good luck! 🏈');
                }
            }
            
            gameState = newState;
            lastNumbersAssignedState = gameState.numbersAssigned;
            updateUI();
        } catch (error) {
            console.error('Error picking square:', error);
            alert('Failed to pick square. Please try again.');
        }
    }
}

// Admin toggle
document.getElementById('adminToggle').addEventListener('click', () => {
    adminMode = !adminMode;
    const btn = document.getElementById('adminToggle');
    const panel = document.getElementById('adminPanel');
    
    if (adminMode) {
        btn.classList.add('active');
        btn.textContent = 'Exit Admin Mode';
        panel.style.display = 'block';
    } else {
        btn.classList.remove('active');
        btn.textContent = 'Select Winning Square';
        panel.style.display = 'none';
        selectedQuarter = null;
        document.querySelectorAll('.quarter-btn').forEach(b => 
            b.classList.remove('selected')
        );
    }
});

// Quarter selection
document.querySelectorAll('.quarter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.quarter-btn').forEach(b => 
            b.classList.remove('selected')
        );
        btn.classList.add('selected');
        selectedQuarter = btn.dataset.quarter;
    });
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('player');
    window.location.href = 'index.html';
});

// Initialize on load
init();
