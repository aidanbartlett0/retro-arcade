import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sessions from 'express-session';
import http from 'http';
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import models from './models.js';

import WebAppAuthProvider from 'msal-node-wrapper';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.dev' });

// Active games storage
export const activeLobbies = {};
export const pinToLobbyMap = {};

const authConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: process.env.CLOUD_INSTANCE + process.env.TENANT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: "/redirect"
    },
	system: {
    	loggerOptions: {
        	loggerCallback(loglevel, message, containsPii) {
            	console.log(message);
        	},
        	piiLoggingEnabled: false,
        	logLevel: 3,
    	}
	}
};

import apiRouter from './routes/apiv1.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const oneDay = 1000 * 60 * 60 * 24;
app.use((req, res, next) => {
    req.models = models;
    next();
});

const sessionMiddleware = sessions({
    secret: process.env.EXPRESS_SESSION_SECRET,
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
});
app.use(sessionMiddleware);

const authProvider = await WebAppAuthProvider.WebAppAuthProvider.initialize(authConfig);
app.use(authProvider.authenticate());

app.use('/api/v1', apiRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/signin', (req, res, next) => {
    return req.authContext.login({
        postLoginRedirectUri: "/",
    })(req, res, next);
});

app.get('/signout', (req, res, next) => {
    return req.authContext.logout({
        postLogoutRedirectUri: "/",
    })(req, res, next);
});

app.use(authProvider.interactionErrorHandler());

// HTTP and WebSocket servers
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
    // Parse session from request
    sessionMiddleware(request, {}, () => {
        // FIXME: AUTH BYPASS
        // Use session ID as player ID.
        if (!request.session.isAuthenticated) { // CHANGED
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        
        console.log("HEREEEEEEE")
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
        console.log("HEREEEEEEE2")

    });
});

// WebSocket connection handler
wss.on('connection', (ws, request) => {

    const playerId = request.session.account.username; // Original MSAL line
    ws.playerId = playerId;
    console.log(`Player ${playerId} established a WebSocket connection.`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Message from ${ws.playerId}:`, data);

            switch (data.action) {
                case 'createLobby':
                case 'joinLobby':
                case 'joinGame': 
                    const lobby = activeLobbies[data.lobbyId];
                    if (lobby) {
                        const player = lobby.players.find(p => p.playerId === ws.playerId);
                        if (player) {
                            player.ws = ws; 
                            console.log(`Player ${ws.playerId} successfully linked to lobby ${data.lobbyId} for action ${data.action}.`);
                        } else {
                            console.log(`Player ${ws.playerId} not found in lobby ${data.lobbyId} during ${data.action}.`);
                        }

                        const isLobbyFull = lobby.players.length === 2;
                        const arePlayersConnected = lobby.players.every(p => p.ws && p.ws.readyState === 1); 

                        if (isLobbyFull && arePlayersConnected) {
                            // Ensure the game state is marked as playing
                            lobby.gameState.gameplay.is_playing = true;
                            console.log(`Lobby ${lobby.lobbyId} is full and all players connected. Starting game.`);
                            // Notify both players that the game is starting
                            lobby.players.forEach(p => {
                                p.ws.send(JSON.stringify({ type: 'gameStart' }));
                            });
                        } else {
                            console.log(`Lobby ${lobby.lobbyId} is waiting for players. Current count: ${lobby.players.length}. Connected: ${lobby.players.filter(p => p.ws && p.ws.readyState === 1).length}`);
                        }
                    } else {
                        console.log(`Lobby ${data.lobbyId} not found for player ${ws.playerId}.`);
                    }
                    break;
                
                case 'movePaddle':
                    const paddleLobby = activeLobbies[data.lobbyId];
                    if (paddleLobby) {
                        const player = paddleLobby.players.find(p => p.playerId === ws.playerId);
                        if (player) {
                            const paddleSpeed = 15;
                            let newDy = 0;
                            if (data.direction === 'up') {
                                newDy = -paddleSpeed;
                            } else if (data.direction === 'down') {
                                newDy = paddleSpeed;
                            } 

                            if (player.paddle === 'left') {
                                paddleLobby.gameState.leftPaddle.dy = newDy;
                            } else if (player.paddle === 'right') {
                                paddleLobby.gameState.rightPaddle.dy = newDy;
                            }
                            console.log(`Player ${ws.playerId} (${player.paddle}) set dy to ${newDy}. Lobby: ${data.lobbyId}`);
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error(`Failed to process message from ${ws.playerId}:`, e);
        }
    });

    ws.on('close', () => {
        console.log(`Player ${ws.playerId} disconnected.`);
        // Find which lobby the player was in and mark them as disconnected.
        for (const lobbyId in activeLobbies) {
            const lobby = activeLobbies[lobbyId];
            const player = lobby.players.find(p => p.playerId === ws.playerId);

            if (player) {
                console.log(`Marking player ${ws.playerId} as disconnected in lobby ${lobbyId}.`);
                player.ws = null; 

                const otherPlayer = lobby.players.find(p => p.playerId !== ws.playerId);
                if (otherPlayer && otherPlayer.ws && otherPlayer.ws.readyState === 1) {
                }
                
                break;
            }
        }
    });
});


// This needs to be 8080 for Azure to containerize and host it
let PORT = 8080;

// A helper function for collision detection
function collides(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y;
}

async function saveMatchResult(lobbyId, winner, score, player1Id, player2Id) {
    try {
        await fetch ('http://localhost:8080/api/v1/matches/saveGame', 
            {
                method: 'POST',
                body: JSON.stringify({
                    lobbyId: lobbyId,
                    winner: winner,
                    score: score,
                    player1: player1Id,
                    player2: player2Id
                })
            }
        )

    } catch (err) {
        console.error('Error saving match result:', err);
    }
}


// The main Authoritative Game Loop
const gameLoop = setInterval(() => {
    const canvasWidth = 750;
    const canvasHeight = 585;
    const grid = 15;
    const paddleHeight = grid * 5;
    const maxPaddleY = canvasHeight - grid - paddleHeight;

    // Iterate over all active lobbies
    for (const lobbyId in activeLobbies) {
        const lobby = activeLobbies[lobbyId];
        const state = lobby.gameState;

        if (!state.gameplay.is_playing) {  
            continue;
        }

        const arePlayersConnected = lobby.players.every(p => p.ws && p.ws.readyState === 1);

        // More robust check: only run the loop if 2 players are present AND fully connected via WebSocket
        if (lobby.players.length < 2 || !arePlayersConnected) {
            continue;
        }


        state.leftPaddle.y += state.leftPaddle.dy;
        state.rightPaddle.y += state.rightPaddle.dy;

        [state.leftPaddle, state.rightPaddle].forEach(paddle => {
            if (paddle.y < grid) {
                paddle.y = grid;
            } else if (paddle.y > maxPaddleY) {
                paddle.y = maxPaddleY;
            }
        });

        if (state.ball.resetting) continue;

        state.ball.x += state.ball.dx;
        state.ball.y += state.ball.dy;

        // Ball collision with top/bottom walls
        if (state.ball.y < grid || state.ball.y + grid > canvasHeight - grid) {
            state.ball.dy *= -1;
        }

        // Ball collision with paddles
        if (collides(state.ball, state.leftPaddle)) {
            state.ball.dx *= -1;
            state.ball.x = state.leftPaddle.x + state.leftPaddle.width;
        } else if (collides(state.ball, state.rightPaddle)) {
            state.ball.dx *= -1;
            state.ball.x = state.rightPaddle.x - state.ball.width;
        }
        
        if (state.ball.x < 0 || state.ball.x > canvasWidth) {
            if (state.ball.x > canvasWidth) {
                state.score.player1++;
            } else {
                state.score.player2++;
            }

            if (state.score.player1 >= 2) {
                state.winning_player = lobby.players[0].playerId;
                state.gameplay.is_playing = false;
            }

            if (state.score.player2 >= 2) {
                state.winning_player = lobby.players[1].playerId;
                state.gameplay.is_playing = false;
            }

            

            state.ball.resetting = true;
            state.ball.x = canvasWidth / 2;
            state.ball.y = canvasHeight / 2;
            
            state.ball.dx *= -1; 
            
            setTimeout(() => {
                if (activeLobbies[lobbyId]) {
                    activeLobbies[lobbyId].gameState.ball.resetting = false;
                }
            }, 500);
        }
        if (!state.gameplay.is_playing && state.winning_player) {
                try {
                    const ending_game_state = {
                        lobbyId: lobbyId, 
                        winning_player: state.winning_player, 
                        score: state.score, 
                        player1: lobby.players[0].playerId,
                        player2: lobby.players[1].playerId,
                        ball: state.ball
                }
                const newState = JSON.stringify(ending_game_state);
                lobby.players.forEach(player => {
                if (player.ws && player.ws.readyState === 1) {
                    player.ws.send(newState);
                }
                
            }
        );
            } catch(err) {
                console.error('Error saving match result:', err);
            }
        } else {
        const newState = JSON.stringify(state);
        lobby.players.forEach(player => {
            if (player.ws && player.ws.readyState === 1) {
                player.ws.send(newState);
            }
        });
    }
    }
}, 1000 / 60);


server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

export default app;
