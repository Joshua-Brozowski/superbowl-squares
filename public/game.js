// Game state
let gameState = null;
let currentPlayer = localStorage.getItem('player');
let adminMode = false;
let selectedQuarter = null;
let lastNumbersAssignedState = false;

// Zoom and pan state
let scale = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let lastPanX = 0;
let lastPanY = 0;

// Touch zoom state
let initialPinchDistance = 0;
let initialScale = 1;

// Check if player is logged in
if (!currentPlayer) {
    window.location.href = 'index.html';
}

// API endpoint
const API_URL = '/api';

// DOM Elements
const viewport = document.getElementById('gridViewport');
const container = document.getElementById('gridContainer');
const stickyTop = document.getElementById('stickyTop');
const stickyNumbersRow = document.getElementById('stickyNumbersRow');
const stickyLeft = document.getElementById('stickyLeft');

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
        initZoomPan();

        // Poll for updates every 2 seconds
        setInterval(fetchGameState, 2000);
    } catch (error) {
        console.error('Error initializing:', error);
        alert('Failed to connect to server. Please refresh the page.');
    }
}

// Initialize zoom and pan
function initZoomPan() {
    // Mouse drag
    viewport.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch drag and pinch zoom
    viewport.addEventListener('touchstart', onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd);

    // Mouse wheel zoom
    viewport.addEventListener('wheel', onWheel, { passive: false });

    // Zoom buttons
    document.getElementById('zoomIn').addEventListener('click', () => zoomBy(0.2));
    document.getElementById('zoomOut').addEventListener('click', () => zoomBy(-0.2));
    document.getElementById('zoomReset').addEventListener('click', resetZoom);

    // Initial fit
    fitGridToViewport();
}

function fitGridToViewport() {
    const viewportRect = viewport.getBoundingClientRect();
    const gridWidth = 500; // Approximate grid width
    const gridHeight = 500; // Approximate grid height

    const scaleX = viewportRect.width / gridWidth;
    const scaleY = viewportRect.height / gridHeight;
    scale = Math.min(scaleX, scaleY, 1) * 0.9;

    panX = 0;
    panY = 0;

    applyTransform();
}

function onMouseDown(e) {
    if (e.target.classList.contains('square')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    lastPanX = panX;
    lastPanY = panY;
    viewport.classList.add('dragging');
}

function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panX = lastPanX + dx;
    panY = lastPanY + dy;
    applyTransform();
}

function onMouseUp() {
    isDragging = false;
    viewport.classList.remove('dragging');
}

function onTouchStart(e) {
    if (e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault();
        initialPinchDistance = getPinchDistance(e.touches);
        initialScale = scale;
    } else if (e.touches.length === 1) {
        if (e.target.classList.contains('square')) return;
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lastPanX = panX;
        lastPanY = panY;
    }
}

function onTouchMove(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e.touches);
        const scaleChange = currentDistance / initialPinchDistance;
        scale = Math.max(0.5, Math.min(3, initialScale * scaleChange));
        applyTransform();
    } else if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        panX = lastPanX + dx;
        panY = lastPanY + dy;
        applyTransform();
    }
}

function onTouchEnd() {
    isDragging = false;
    initialPinchDistance = 0;
}

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomBy(delta);
}

function zoomBy(delta) {
    scale = Math.max(0.5, Math.min(3, scale + delta));
    applyTransform();
}

function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
}

function applyTransform() {
    container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    document.getElementById('zoomLevel').textContent = Math.round(scale * 100) + '%';

    // Update sticky headers
    updateStickyHeaders();
}

function updateStickyHeaders() {
    // Scale the sticky headers to match
    const patriotsCell = stickyTop.querySelector('.team-name-cell.patriots');
    const numbersRow = stickyNumbersRow.querySelector('.numbers-row');
    const seahawksCell = stickyLeft.querySelector('.team-name-cell.seahawks');
    const numbersCol = stickyLeft.querySelector('.numbers-col');

    if (patriotsCell) {
        patriotsCell.style.transform = `scaleX(${scale})`;
        patriotsCell.style.transformOrigin = 'left center';
    }
    if (numbersRow) {
        numbersRow.style.transform = `scaleX(${scale})`;
        numbersRow.style.transformOrigin = 'left center';
    }
    if (seahawksCell) {
        seahawksCell.style.transform = `scaleY(${scale})`;
        seahawksCell.style.transformOrigin = 'top center';
    }
    if (numbersCol) {
        numbersCol.style.transform = `scaleY(${scale})`;
        numbersCol.style.transformOrigin = 'top center';
    }

    // Adjust sticky positions based on pan
    const leftOffset = 90 + panX;
    stickyTop.style.paddingLeft = Math.max(90, leftOffset) + 'px';
    stickyNumbersRow.style.paddingLeft = Math.max(90, leftOffset) + 'px';

    const topOffset = 80 + panY;
    stickyLeft.style.top = Math.max(80, topOffset) + 'px';
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
                alert('Numbers revealed! Someone has 11+ squares - time to strategize your final picks!');
            } else {
                alert('All squares are filled! Numbers have been assigned. Good luck!');
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
    updateNumbers();
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

            square.addEventListener('click', (e) => {
                e.stopPropagation();
                handleSquareClick(i);
            });

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
    const stickyPatriotsRow = document.getElementById('stickyPatriotsNumbers');
    const stickySeahawksCol = document.getElementById('stickySeahawksNumbers');

    // Get number cells
    const patriotsCells = patriotsRow.querySelectorAll('.number-cell');
    const seahawksCells = seahawksCol.querySelectorAll('.number-cell');
    const stickyPatriotsCells = stickyPatriotsRow.querySelectorAll('.number-cell');
    const stickySeahawksCells = stickySeahawksCol.querySelectorAll('.number-cell');

    if (gameState.numbersAssigned) {
        // Show actual numbers
        gameState.patriotsNumbers.forEach((num, i) => {
            patriotsCells[i].textContent = num;
            stickyPatriotsCells[i].textContent = num;
        });

        gameState.seahawksNumbers.forEach((num, i) => {
            seahawksCells[i].textContent = num;
            stickySeahawksCells[i].textContent = num;
        });
    } else {
        // Show question marks
        for (let i = 0; i < 10; i++) {
            patriotsCells[i].textContent = '?';
            seahawksCells[i].textContent = '?';
            stickyPatriotsCells[i].textContent = '?';
            stickySeahawksCells[i].textContent = '?';
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
                    alert('Numbers revealed! Someone has 11+ squares - time to strategize your final picks!');
                } else {
                    alert('All squares are filled! Numbers have been assigned. Good luck!');
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
        btn.textContent = 'Admin';
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
