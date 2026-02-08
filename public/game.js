// Game state
let gameState = null;
let currentPlayer = localStorage.getItem('player');
let adminMode = false;
let selectedQuarter = null;
let lastNumbersAssignedState = false;

// Zoom state
let scale = 1;

// Check if player is logged in
if (!currentPlayer) {
    window.location.href = 'index.html';
}

// API endpoint
const API_URL = '/api';

// DOM Elements
const scroller = document.getElementById('gridScroller');
const table = document.getElementById('squaresTable');

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

        buildGrid();
        updateUI();
        initZoom();
        initAdminControls();
        fitToViewport();

        // Poll for updates every 1.5 seconds for faster sync
        setInterval(fetchGameState, 1500);

        // Refit on resize
        window.addEventListener('resize', fitToViewport);
    } catch (error) {
        console.error('Error initializing:', error);
        alert('Failed to connect to server. Please refresh the page.');
    }
}

// Build the grid table
function buildGrid() {
    const tbody = document.getElementById('gridBody');
    tbody.innerHTML = '';

    for (let row = 0; row < 10; row++) {
        const tr = document.createElement('tr');

        // First cell: Seahawks team header (only in first row, spans all rows)
        if (row === 0) {
            const th = document.createElement('th');
            th.className = 'team-header seahawks';
            th.rowSpan = 10;
            th.textContent = 'SEAHAWKS';
            tr.appendChild(th);
        }

        // Second cell: Seahawks number
        const numCell = document.createElement('td');
        numCell.className = 'row-number-cell';
        numCell.id = `sn${row}`;
        numCell.textContent = '?';
        tr.appendChild(numCell);

        // Spacer cell between numbers and squares
        const spacer = document.createElement('td');
        spacer.className = 'grid-spacer';
        tr.appendChild(spacer);

        // 10 square cells
        for (let col = 0; col < 10; col++) {
            const td = document.createElement('td');
            td.className = 'square';
            const index = row * 10 + col;
            td.dataset.index = index;
            td.addEventListener('click', () => handleSquareClick(index));
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }
}

// Initialize admin controls
function initAdminControls() {
    // Lock/Unlock board button
    document.getElementById('lockBoardBtn').addEventListener('click', toggleBoardLock);

    // Score input button
    document.getElementById('setScoreBtn').addEventListener('click', setScore);

    // Show score inputs when quarter selected
    document.querySelectorAll('.quarter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quarter-btn').forEach(b =>
                b.classList.remove('selected')
            );
            btn.classList.add('selected');
            selectedQuarter = btn.dataset.quarter;

            // Show score inputs and populate current values
            document.getElementById('scoreInputs').style.display = 'block';
            const scores = gameState.scores && gameState.scores[selectedQuarter];
            document.getElementById('patriotsScoreInput').value = scores?.patriots ?? '';
            document.getElementById('seahawksScoreInput').value = scores?.seahawks ?? '';
        });
    });
}

// Toggle board lock
async function toggleBoardLock() {
    const action = gameState.locked ? 'unlockBoard' : 'lockBoard';

    if (!gameState.locked) {
        // Check if everyone has 16 squares
        const allComplete = Object.values(gameState.players).every(count => count === 16);
        if (!allComplete) {
            const proceed = confirm('Not everyone has picked 16 squares yet. Lock anyway?');
            if (!proceed) return;
        }
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });

        gameState = await response.json();
        updateUI();
        alert(gameState.locked ? 'Board is now LOCKED!' : 'Board is now UNLOCKED!');
    } catch (error) {
        console.error('Error toggling lock:', error);
        alert('Failed to toggle board lock.');
    }
}

// Set score for selected quarter
async function setScore() {
    if (!selectedQuarter) {
        alert('Please select a quarter first!');
        return;
    }

    const patriots = parseInt(document.getElementById('patriotsScoreInput').value) || 0;
    const seahawks = parseInt(document.getElementById('seahawksScoreInput').value) || 0;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'setScore',
                quarter: selectedQuarter,
                patriots,
                seahawks
            })
        });

        gameState = await response.json();
        updateUI();
        alert(`Score set for ${selectedQuarter}: Patriots ${patriots} - Seahawks ${seahawks}`);
    } catch (error) {
        console.error('Error setting score:', error);
        alert('Failed to set score.');
    }
}

// Initialize zoom functionality
function initZoom() {
    // Zoom buttons
    document.getElementById('zoomIn').addEventListener('click', () => zoom(0.15));
    document.getElementById('zoomOut').addEventListener('click', () => zoom(-0.15));
    document.getElementById('zoomReset').addEventListener('click', fitToViewport);

    // Mouse wheel zoom
    scroller.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoom(e.deltaY > 0 ? -0.1 : 0.1);
        }
    }, { passive: false });

    // Pinch zoom
    let initialDistance = 0;
    let initialScale = 1;

    scroller.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = getDistance(e.touches);
            initialScale = scale;
        }
    }, { passive: true });

    scroller.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = getDistance(e.touches);
            const newScale = initialScale * (dist / initialDistance);
            setScale(Math.max(0.5, Math.min(1.5, newScale)));
        }
    }, { passive: false });
}

function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function zoom(delta) {
    setScale(Math.max(0.5, Math.min(1.5, scale + delta)));
}

function setScale(newScale) {
    scale = newScale;
    table.style.transform = `scale(${scale})`;
    document.getElementById('zoomLevel').textContent = Math.round(scale * 100) + '%';
}

function fitToViewport() {
    const viewport = document.getElementById('gridViewport');
    const viewportRect = viewport.getBoundingClientRect();

    // Get table natural size (at scale 1)
    table.style.transform = 'scale(1)';
    const tableRect = table.getBoundingClientRect();

    // Calculate scale to fit
    const scaleX = (viewportRect.width - 20) / tableRect.width;
    const scaleY = (viewportRect.height - 20) / tableRect.height;
    const fitScale = Math.min(scaleX, scaleY, 1.5);

    setScale(Math.max(0.5, fitScale));

    // Center the scroll
    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
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

        // Check if numbers just got assigned AND this player can now see them
        const myNewCount = newState.players[currentPlayer] || 0;
        if (newState.numbersAssigned && myNewCount >= 11) {
            const myOldCount = gameState ? (gameState.players[currentPlayer] || 0) : 0;
            // Alert only if player just crossed the 11 threshold
            if (myOldCount < 11) {
                alert('Numbers revealed! You have 11+ squares - time to strategize your final picks!');
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

    // Update numbers
    updateNumbers();

    // Update admin panel if visible
    if (adminMode) {
        updateAdminPanel();
    }
}

// Update admin panel
function updateAdminPanel() {
    // Update player status
    const statusDiv = document.getElementById('playerStatus');
    statusDiv.innerHTML = '';

    Object.entries(gameState.players).forEach(([name, count]) => {
        const item = document.createElement('div');
        item.className = `player-status-item ${count === 16 ? 'complete' : 'incomplete'}`;
        item.textContent = `${name}: ${count}/16`;
        statusDiv.appendChild(item);
    });

    // Update lock button
    const lockBtn = document.getElementById('lockBoardBtn');
    if (gameState.locked) {
        lockBtn.textContent = 'UNLOCK BOARD';
        lockBtn.classList.add('locked');
    } else {
        lockBtn.textContent = 'LOCK BOARD';
        lockBtn.classList.remove('locked');
    }
}

// Update winners banner
function updateWinnersBanner() {
    ['Q1', 'Q2', 'Q3', 'Final'].forEach(quarter => {
        const winner = gameState.winners[quarter];
        const scores = gameState.scores && gameState.scores[quarter];

        const winnerElement = document.getElementById(quarter.toLowerCase() + 'Winner');
        const scoreElement = document.getElementById(quarter.toLowerCase() + 'Score');

        // Update score display
        if (scoreElement) {
            if (scores && (scores.patriots !== null || scores.seahawks !== null)) {
                scoreElement.textContent = `${scores.patriots ?? 0}-${scores.seahawks ?? 0}`;
            } else {
                scoreElement.textContent = '-';
            }
        }

        // Update winner display
        if (winner) {
            winnerElement.textContent = winner.player;
            winnerElement.style.color = '#FFD700';
        } else {
            winnerElement.textContent = '-';
            winnerElement.style.color = '#fff';
        }
    });
}

// Update grid squares
function updateGrid() {
    const squares = document.querySelectorAll('td.square');

    gameState.squares.forEach((player, index) => {
        const square = squares[index];
        if (!square) return;

        // Clear previous classes but keep 'square'
        square.className = 'square';

        if (player) {
            square.classList.add('taken', player);
            square.textContent = player;
        } else {
            square.textContent = '';
        }

        // Highlight winner squares
        Object.values(gameState.winners).forEach(winner => {
            if (winner && winner.squareIndex === index) {
                square.classList.add('winner');
            }
        });
    });
}

// Update numbers
function updateNumbers() {
    // Only show numbers if THIS player has 11+ squares
    const mySquareCount = gameState.players[currentPlayer] || 0;
    const canSeeNumbers = gameState.numbersAssigned && mySquareCount >= 11;

    // Patriots numbers (top row)
    for (let i = 0; i < 10; i++) {
        const cell = document.getElementById(`pn${i}`);
        if (cell) {
            cell.textContent = canSeeNumbers ? gameState.patriotsNumbers[i] : '?';
        }
    }

    // Seahawks numbers (left column)
    for (let i = 0; i < 10; i++) {
        const cell = document.getElementById(`sn${i}`);
        if (cell) {
            cell.textContent = canSeeNumbers ? gameState.seahawksNumbers[i] : '?';
        }
    }
}

// Pick square with retry logic for version conflicts
async function pickSquareWithRetry(index, player, maxRetries) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'pickSquare',
                    squareIndex: index,
                    player: player,
                    expectedVersion: gameState.version
                })
            });

            const result = await response.json();

            // Handle version conflict - update state and retry
            if (response.status === 409 && result.code === 'VERSION_CONFLICT') {
                console.log(`Version conflict, retrying (attempt ${attempt + 1}/${maxRetries})`);
                gameState = result.currentState;
                updateUI();

                // Check if square is still available
                if (gameState.squares[index] !== null && gameState.squares[index] !== player) {
                    alert(`Square was just taken by ${gameState.squares[index]}!`);
                    return;
                }

                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            if (!response.ok) {
                // Update state if server sent it
                if (result.currentState) {
                    gameState = result.currentState;
                    updateUI();
                }
                alert(result.error || 'Failed to pick square');
                return;
            }

            // Success!
            const myNewCount = result.players[player] || 0;
            const myOldCount = gameState.players[player] || 0;
            if (result.numbersAssigned && myNewCount >= 11 && myOldCount < 11) {
                alert('Numbers revealed! You have 11+ squares - time to strategize your final 5 picks!');
            }

            gameState = result;
            lastNumbersAssignedState = gameState.numbersAssigned;
            updateUI();
            return;

        } catch (error) {
            console.error('Error picking square:', error);
            if (attempt === maxRetries - 1) {
                alert('Failed to pick square. Please try again.');
            }
        }
    }
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
            const confirmChange = window.confirm(
                `${selectedQuarter} already has a winner (${gameState.winners[selectedQuarter].player}). ` +
                `Do you want to change it to ${player}?`
            );

            if (!confirmChange) return;
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

            alert(`${player} wins ${selectedQuarter}!`);
        } catch (error) {
            console.error('Error setting winner:', error);
            alert('Failed to set winner. Please try again.');
        }
    } else {
        // Check if board is locked
        if (gameState.locked) {
            alert('Board is locked! No changes allowed.');
            return;
        }

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

        // Try to pick square with retry logic for conflicts
        await pickSquareWithRetry(index, currentPlayer, 3);
    }
}

// Admin toggle
document.getElementById('adminToggle').addEventListener('click', () => {
    adminMode = !adminMode;
    const btn = document.getElementById('adminToggle');
    const panel = document.getElementById('adminPanel');

    if (adminMode) {
        btn.classList.add('active');
        btn.textContent = 'Exit Admin';
        panel.style.display = 'block';
        updateAdminPanel();
    } else {
        btn.classList.remove('active');
        btn.textContent = '⚙️ Admin';
        panel.style.display = 'none';
        selectedQuarter = null;
        document.querySelectorAll('.quarter-btn').forEach(b =>
            b.classList.remove('selected')
        );
        document.getElementById('scoreInputs').style.display = 'none';
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('player');
    window.location.href = 'index.html';
});

// Reset Board
document.getElementById('resetBoardBtn').addEventListener('click', async () => {
    const firstConfirm = confirm('Are you sure you want to RESET THE ENTIRE BOARD?\n\nThis will clear ALL selections from ALL players!');
    if (!firstConfirm) return;

    const secondConfirm = confirm('THIS CANNOT BE UNDONE!\n\nType "RESET" in the next prompt to confirm.');
    if (!secondConfirm) return;

    const typed = prompt('Type RESET to confirm:');
    if (typed !== 'RESET') {
        alert('Reset cancelled - you did not type RESET correctly.');
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset' })
        });

        if (response.ok) {
            alert('Board has been reset!');
            window.location.reload();
        } else {
            alert('Failed to reset board.');
        }
    } catch (error) {
        console.error('Error resetting board:', error);
        alert('Failed to reset board.');
    }
});

// Check for unread chat messages
async function checkUnreadMessages() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getMessages' })
        });
        const data = await response.json();
        const messages = data.messages || [];

        const lastReadTime = parseInt(localStorage.getItem('lastReadMessageTime') || '0');
        const notification = document.getElementById('chatNotification');

        // Check if there are any messages newer than our last read time
        const hasUnread = messages.some(msg => new Date(msg.timestamp).getTime() > lastReadTime);

        if (hasUnread) {
            notification.style.display = 'block';
        } else {
            notification.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking messages:', error);
    }
}

// Check for unread messages every 5 seconds
setInterval(checkUnreadMessages, 5000);
checkUnreadMessages();

// Initialize on load
init();
