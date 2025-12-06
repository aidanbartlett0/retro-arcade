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
export const publicLobbies = {};
export const pinToLobbyMap = {};

const authConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: process.env.CLOUD_INSTANCE + process.env.TENANT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: "/redirect"
        // redirectUri: "https://retro-arcade-g6fnhabshze3ejeg.northcentralus-01.azurewebsites.net/redirect"
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

// Session middleware for WebSockets
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

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
    // Parse session from request
    sessionMiddleware(request, {}, () => {

        if (!request.session.isAuthenticated) {
            socket.write('Unathorized\r\n');
            socket.destroy();
            return;
        }
        
        // Upgrade to WebSocket
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

// WebSocket connection handler
wss.on('connection', (ws, request) => {
    // Tag WebSocket with player ID
    const playerId = request.session.account.username; 
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
                        lobby.lastActivity = Date.now();
                        const player = lobby.players.find(p => p.playerId === ws.playerId);
                        if (player) {
                            player.ws = ws; 
                            console.log(`Player ${ws.playerId} successfully linked to lobby ${data.lobbyId} for action ${data.action}.`);
                        } else {
                            console.log(`Player ${ws.playerId} not found in lobby ${data.lobbyId} during ${data.action}.`);
                        }

                        // Check if the lobby is now full and ready to start
                        const isLobbyFull = lobby.players.length === 2;
                        const arePlayersConnected = lobby.players.every(p => p.ws && p.ws.readyState === 1); 
                        if (isLobbyFull) {
                            delete publicLobbies[lobby.lobbyId]; // Remove from public lobbies
                        }

                        if (isLobbyFull && arePlayersConnected) {
                            console.log(`Lobby ${lobby.lobbyId} is full and all players connected. Starting game.`);
                            // Notify both players that the game is starting
                            const leftPlayer = lobby.players.find(p => p.paddle === "left");
                            const rightPlayer = lobby.players.find(p => p.paddle === "right");
                            lobby.players.forEach(p => {
                                p.ws.send(JSON.stringify({
                                    type: "countdown",
                                    seconds: 5,
                                    leftPlayer: leftPlayer.playerId ,
                                    rightPlayer: rightPlayer.playerId 
                                }));
                            });
                            setTimeout(() => {
                                // Ensure the game state is marked as playing
                                lobby.gameState.gameplay.is_playing = true;
                                // state.gameplay.time_left = 60
                                lobby.players.forEach(p => {
                                    p.ws.send(JSON.stringify({ type: "gameStart" }));
                                });
                            }, 5000);
                                                                                        

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
        for (const lobbyId in activeLobbies) {
            const lobby = activeLobbies[lobbyId];
            const player = lobby.players.find(p => p.playerId === ws.playerId);
            const playerIndex = lobby.players.findIndex(p => p.playerId === ws.playerId);
            if (playerIndex !== -1) {
                console.log(`Removing player ${ws.playerId} from lobby ${lobbyId}.`);
                lobby.players.splice(playerIndex, 1); // remove from array
    
                if (lobby.players.length === 0) {
                    delete activeLobbies[lobbyId];
                    delete publicLobbies[lobbyId]; // remove from public if applicable
                    console.log(`Lobby ${lobbyId} deleted because it is empty.`);
                }
                break
            }
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

async function saveMatchResult(lobby) {
    try {
        const player1Id = lobby.players[0].playerId;
        const player2Id = lobby.players[1].playerId;
        const winningPlayerUsername = lobby.gameState.gameplay.winning_player;

        let winner_id = await models.User.findOne({ username: winningPlayerUsername });
        winner_id = winner_id._id

        let p1 = await models.User.findOne({ username: player1Id });
        let p1_id = p1._id
        let p2 = await models.User.findOne({ username: player2Id });
        let p2_id = p2._id

        const match_history_before = await models.Match.find({})
        console.log(`mathc history before: ${JSON.stringify(match_history_before)}`)
        console.log(player1Id)
        const all = await models.User.find({});
        console.log('All users in DB:', all.map(u => u.username));
        console.log(`player 1 username: ${player1Id}, player 2 username: ${player2Id}, winner username: ${winningPlayerUsername}`);
        console.log(`player 1 id: ${p1_id}, player 2 id: ${p2_id}, winner id: ${winner_id}`);

        if (!p1 || !p2) {
            console.error(`Could not find one or both users to save match result. Player1: ${player1Id}, Player2: ${player2Id}`);
            return;
        }


        const matchDoc = new models.Match({
            player1: p1._id,
            player2: p2._id,
            score: lobby.gameState.score,
            winner: winner_id,
            date: new Date()
        });

        p1.matchHistory.push(matchDoc._id);
        p2.matchHistory.push(matchDoc._id);

        await p1.save();
        await p2.save();
        await matchDoc.save();
        const match_history = await models.Match.find({})
        console.log(`mathc history: ${JSON.stringify(match_history)}`)
        console.log('All matches in DB:', match_history);
        console.log(`Match result for lobby ${lobby.lobbyId} saved successfully.`);

    } catch (err) {
        console.error('Error saving match result:', err);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

async function countdown(n, started = false) {
const timer = document.getElementById('match-timer');
for (let i = n; i > 0; i--) {
    timer.innerText = i;
    await sleep(1000);
}
if(!started){
    timer.innerText = 'PLAY';
    await sleep(1000);
}
}
  

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

        const arePlayersConnected = lobby.players.every(p => p.ws && p.ws.readyState === 1);

        if (lobby.players.length < 2 || !arePlayersConnected) {
            continue;
        }

        if (!state.gameplay.is_playing) {
            continue;
        }

        // 1. UPDATE PADDLE POSITIONS
        state.leftPaddle.y += state.leftPaddle.dy;
        state.rightPaddle.y += state.rightPaddle.dy;

        // Prevent paddles from going through walls
        [state.leftPaddle, state.rightPaddle].forEach(paddle => {
            if (paddle.y < grid) {
                paddle.y = grid;
            } else if (paddle.y > maxPaddleY) {
                paddle.y = maxPaddleY;
            }
        });

        // 2. UPDATE BALL POSITION
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
        
        // 3. HANDLE SCORING
        if (state.ball.x < 0 || state.ball.x > canvasWidth) {
            if (state.ball.x > canvasWidth) {
                state.score.player1++;
            } else {
                state.score.player2++;
            }

            state.ball.resetting = true;
            state.ball.x = canvasWidth / 2;
            state.ball.y = canvasHeight / 2;
            
            state.ball.dx *= -1; // Serve to the other player
        
        if (state.score.player1 >= 3) {
            state.gameplay.is_playing = false;
            state.gameplay.winning_player = lobby.players[0].playerId
            saveMatchResult(lobby);
         } else if (state.score.player2 >= 3) {
            state.gameplay.is_playing = false;
            state.gameplay.winning_player = lobby.players[1].playerId
            saveMatchResult(lobby);
         }
            setTimeout(() => {
                if (activeLobbies[lobbyId]) {
                    activeLobbies[lobbyId].gameState.ball.resetting = false;
                }
            }, 500);
        }
        // if (!state.gameplay.is_playing && state.winning_player) {
        //         // try {
        //             const ending_game_state = {
        //                 lobbyId: lobbyId, 
        //                 winning_player: state.winning_player, 
        //                 score: state.score, 
        //                 player1: lobby.players[0].playerId,
        //                 player2: lobby.players[1].playerId,
        //                 ball: state.ball
        //         }
        //         saveMatchResult(lobby);
        //     // } catch(err) {
        //     //     console.error('Error saving match result:', err);
        //     // }
        // } 
        const newState = JSON.stringify(state);
        lobby.players.forEach(player => {
            if (player.ws && player.ws.readyState === 1) {
                player.ws.send(newState);
            }
        });
    
    }
}, 1000 / 60);


server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

export default app;
