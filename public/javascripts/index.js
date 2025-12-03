// ==================================
//          CLIENT-SIDE GAME CODE
// ==================================

// This variable will hold the most recent game state from the server
let latestGameState = {};
let ws; // Will hold our WebSocket connection
let lobbyId; // Will hold our lobby ID

// Get the canvas and its context
const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
const grid = 15;

// This function starts the whole process
function init() {
    // 1. GET LOBBY ID AND PIN FROM URL
    const urlParams = new URLSearchParams(window.location.search);
    lobbyId = urlParams.get('lobbyId'); // Assign to the global variable
    const pin = urlParams.get('pin'); // Get the pin if it exists

    if (!lobbyId) {
        alert('Could not find lobby ID. Returning to home page.');
        window.location.href = '/home.html';
        return;
    }

    // If a pin is in the URL, this is the creator. Display a waiting message.
    if (pin) {
        const matchInfo = document.getElementById('match-info');
        if (matchInfo) {
            matchInfo.innerText = `Waiting for opponent... Share PIN: ${pin}`;
        }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${window.location.host}/gameSocket`);

    ws.onopen = () => {
        console.log('Connected to game server!');
        ws.send(JSON.stringify({
            action: 'joinGame', 
            lobbyId: lobbyId
        }));
    };

    ws.onmessage = (event) => {
        console.log('Received data from server:', event.data);

        const message = JSON.parse(event.data);

        // Check for special message types
        if (message.type === 'gameStart') {
            const matchInfo = document.getElementById('match-info');
            if (matchInfo) {
                matchInfo.innerText = 'ROUND 1';
            }
        } else if (message.type === 'opponentDisconnected') {
            alert('Your opponent has disconnected.');
            window.location.href = '/home.html';
        } else {
            latestGameState = message;
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from game server.');
        alert('Connection lost. Returning to home page.');
        window.location.href = '/home.html';
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    requestAnimationFrame(loop);
}


function loop() {
    requestAnimationFrame(loop);
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!latestGameState.ball) {
        return;
    }
    const leftScore = document.getElementById('player-left-score');
    const rightScore = document.getElementById('player-right-score');
    if (leftScore) leftScore.innerText = latestGameState.score.player1;
    if (rightScore) rightScore.innerText = latestGameState.score.player2;

    // GAME IS EDNED HERE SO WE SAVE THE GAME AND REDIRECT TO HOME
    if (latestGameState.winning_player) {
        document.getElementById('match-info').innerText = `GAME FINISHED - CONGRATS ${latestGameState.winning_player.toUpperCase()}! YOU WIN!`;
            setTimeout(() => {
                window.location.href = '/home.html';
            }, 2000);
        };
        return;
    }


    context.fillStyle = 'white';
    context.fillRect(
        latestGameState.leftPaddle.x,
        latestGameState.leftPaddle.y,
        latestGameState.leftPaddle.width,
        latestGameState.leftPaddle.height
    );

    // Draw the right paddle using coordinates from the server
    context.fillRect(
        latestGameState.rightPaddle.x,
        latestGameState.rightPaddle.y,
        latestGameState.rightPaddle.width,
        latestGameState.rightPaddle.height
    );

    // Draw the ball using coordinates from the server
    context.fillRect(
        latestGameState.ball.x,
        latestGameState.ball.y,
        latestGameState.ball.width,
        latestGameState.ball.height
    );

    
    context.fillStyle = 'lightgrey';
    context.fillRect(0, 0, canvas.width, grid);
    context.fillRect(0, canvas.height - grid, canvas.width, canvas.height);
    for (let i = grid; i < canvas.height - grid; i += grid * 2) {
        context.fillRect(canvas.width / 2 - grid / 2, i, grid, grid);
    }
}


const keysPressed = {
    up: false,
    down: false
};

document.addEventListener('keydown', function(e) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    let keyChanged = false;
    // up arrow or w key
    if (e.which === 38 || e.which === 87) {
        if (!keysPressed.up) {
            keysPressed.up = true;
            keyChanged = true;
        }
    }
    // down arrow or s key
    else if (e.which === 40 || e.which === 83) {
        if (!keysPressed.down) {
            keysPressed.down = true;
            keyChanged = true;
        }
    }

    // If a relevant key was pressed, determine the direction and send it
    if (keyChanged) {
        let direction = 'stop';
        if (keysPressed.up) {
            direction = 'up';
        } else if (keysPressed.down) {
            direction = 'down';
        }
        ws.send(JSON.stringify({ action: 'movePaddle', direction: direction, lobbyId: lobbyId }));
    }
});

document.addEventListener('keyup', function(e) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    let keyChanged = false;
    // up arrow or w key
    if (e.which === 38 || e.which === 87) {
        if (keysPressed.up) {
            keysPressed.up = false;
            keyChanged = true;
        }
    }
    // down arrow or s key
    else if (e.which === 40 || e.which === 83) {
        if (keysPressed.down) {
            keysPressed.down = false;
            keyChanged = true;
        }
    }

    // If a relevant key was released, determine the new direction
    if (keyChanged) {
        let direction = 'stop';
        // If the other key is still held, move in that direction
        if (keysPressed.up) {
            direction = 'up';
        } else if (keysPressed.down) {
            direction = 'down';
        }
        ws.send(JSON.stringify({ action: 'movePaddle', direction: direction, lobbyId: lobbyId }));
    }
});


// Start the game initialization process when the page loads
init();