import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sessions from 'express-session'
import models from './models.js';
import enableWs from 'express-ws'
import crypto from 'crypto';
import WebAppAuthProvider from 'msal-node-wrapper'
import dotenv from 'dotenv';
dotenv.config({ path: '.env.dev' });


export const lobbies = {}
export const pin_to_lobby = {}

const authConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: process.env.CLOUD_INSTANCE + process.env.TENANT_ID,
        clientSecret: process.env.CLIENT_SECRET,

        // clientId: "{App Registration -> Overview: Application (Client) ID}",
        // authority: "https://login.microsoftonline.com/{App Registration -> Overview: Directory (tenant) ID}",
        // clientSecret: "{App Registration -> Certificates and Secrets -> Client Secrets: Value}",
        redirectUri: "/redirect"
        // The redirect needs to be the correct URL that is getting pointed to by "/". When running locally, you just need "/redirect", but when running in azure through an external domain name, it needs to be "https://custom.domain/redirect"
        // The redirects need to be registered with Azrue App Registrations -> Authentication -> Redirect URI
        // https://retro-arcade-g6fnhabshze3ejeg.northcentralus-01.azurewebsites.net/redirect
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
enableWs(app)

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const oneDay = 1000 * 60 * 60 * 24
app.use((req, res, next) => {
    req.models = models;
    next();
});

app.use(sessions({
    secret: process.env.EXPRESS_SESSION_SECRET,
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
}))

const authProvider = await WebAppAuthProvider.WebAppAuthProvider.initialize(authConfig);
app.use(authProvider.authenticate());

app.use('/api/v1', apiRouter);

// Route handler for home page - must come before static middleware
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Static middleware - serves other static files (but won't override the '/' route)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/signin', (req, res, next) => {
    return req.authContext.login({
            postLoginRedirectUri: "/", // redirect here after login
        })(req, res, next);
});

app.get('/signout', (req, res, next) => {
    return req.authContext.logout({
        postLogoutRedirectUri: "/", // redirect here after logout
    })(req, res, next);

});




// WebSocket endpoint for the game
app.ws('/gameSocket', (ws, req) => {
    
    if (!req.session.isAuthenticated) {
        console.log('Unauthorized WebSocket connection attempt closed.');
        ws.close(1008, 'User not authenticated');
        return;
    }

    ws.playerId = req.session.account.username;
    console.log(`Player ${ws.playerId} established a WebSocket connection.`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Message from ${ws.playerId}:`, data);

            
            switch (data.action) {
                case 'createLobby':
                case 'joinLobby':
                    const lobby = lobbies[data.lobbyId];
                    if (lobby) {
                        const player = lobby.players.find(p => p.playerId === ws.playerId);
                        if (player) {
                            player.ws = ws;
                            console.log(`Player ${ws.playerId} successfully linked to lobby ${data.lobbyId}.`);
                        }

                        // Check if the lobby is now full and ready to start
                        const isLobbyFull = lobby.players.length === 2;
                        const arePlayersConnected = lobby.players.every(p => p.ws && p.ws.readyState === 1); 

                        if (isLobbyFull && arePlayersConnected) {
                            console.log(`Lobby ${lobby.lobbyId} is full. Starting game.`);
                            // Notify both players that the game is starting
                            lobby.players.forEach(p => {
                                p.ws.send(JSON.stringify({ type: 'gameStart' }));
                            });
                        } else {
                            console.log(`Lobby ${lobby.lobbyId} is waiting for players. Current count: ${lobby.players.length}`);
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error(`Failed to process message from ${ws.playerId}:`, e);
        }
    });

    // 4. CLEANUP: Handle disconnection.
    ws.on('close', () => {
        console.log(`Player ${ws.playerId} disconnected.`);
        // Find which lobby the player was in and remove them
        for (const lobbyId in activeLobbies) {
            const lobby = activeLobbies[lobbyId];
            const playerIndex = lobby.players.findIndex(p => p.playerId === ws.playerId);

            if (playerIndex !== -1) {
                console.log(`Removing player ${ws.playerId} from lobby ${lobbyId}.`);
                lobby.players.splice(playerIndex, 1);

                // If the lobby is now empty, delete it
                if (lobby.players.length === 0) {
                    delete activeLobbies[lobbyId];
                    delete pinToLobbyMap[lobby.pin];
                    console.log(`Lobby ${lobbyId} is empty and has been deleted.`);
                } else {
                    // Notify the remaining player
                    const remainingPlayer = lobby.players[0];
                    if (remainingPlayer.ws && remainingPlayer.ws.readyState === 1) {
                        remainingPlayer.ws.send(JSON.stringify({ type: 'opponentDisconnected' }));
                    }
                }
                break; // Exit loop once player is found and handled
            }
        }
    });
});








app.use(authProvider.interactionErrorHandler());

// This needs to be 8080 for Azure to containerize and host it
let PORT = 8080
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });


export default app;
