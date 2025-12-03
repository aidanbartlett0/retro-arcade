import express from 'express'
import crypto from 'crypto'
import { activeLobbies, pinToLobbyMap } from '../../../app.js'

var router = express.Router();


router.post('/create', (req,res) => {

    if (req.session.isAuthenticated) { // Temporarily commented out for testing
        const playerId = req.session.account.username; // Using session ID for temporary player ID
        // const playerId = req.session.account.username;
        const lobbyId = crypto.randomUUID();
        let pin;
        do {
         pin = Math.floor(100000 + Math.random() * 900000).toString();
        } while (pinToLobbyMap[pin]);

        pinToLobbyMap[pin] = lobbyId;

        // Define the full initial state of the game
        const canvasWidth = 750;
        const canvasHeight = 585;
        const grid = 15;
        const paddleHeight = grid * 5;

        activeLobbies[lobbyId] = {
            lobbyId: lobbyId,
            pin: pin,
            players: [{ playerId: playerId, ws: null, paddle: 'left' }],
            gameState: {
                leftPaddle: {
                    x: grid * 2,
                    y: canvasHeight / 2 - paddleHeight / 2,
                    width: grid,
                    height: paddleHeight,
                    dy: 0
                },
                rightPaddle: {
                    x: canvasWidth - grid * 3,
                    y: canvasHeight / 2 - paddleHeight / 2,
                    width: grid,
                    height: paddleHeight,
                    dy: 0
                },
                ball: {
                    x: canvasWidth / 2,
                    y: canvasHeight / 2,
                    width: grid,
                    height: grid,
                    resetting: false,
                    dx: 5,
                    dy: -5
                },
                score: {
                    player1: 0,
                    player2: 0
                },
                gameplay: {
                    is_playing: false, 
                    winning_player: null
                }
            }
        };
 
        console.log(`Lobby created: ID=${lobbyId}, PIN=${pin}, payersInLobby=${JSON.stringify(activeLobbies[lobbyId].players)}`);
        console.log(activeLobbies[lobbyId].players[0])
        // Send the PIN and lobbyId back to the client
        res.status(201).json({ pin: pin, lobbyId: lobbyId });
     } else {
         res.status(401).json({ error: 'User not authenticated' });
     }
})

router.post('/join', (req,res) => {
    // if (req.session.isAuthenticated) { // Temporarily commented out for testing
        const { pin } = req.body;
        console.log(`---`);
        console.log(`Join attempt with PIN: "${pin}"`);
        console.log('Current pinToLobbyMap state:', pinToLobbyMap);

        const lobbyId = pinToLobbyMap[pin];

        if (!lobbyId || !activeLobbies[lobbyId]) {
            console.log(`Lobby not found for PIN: "${pin}"`);
            return res.status(404).json({ error: 'Lobby not found' });
        }

        const lobby = activeLobbies[lobbyId];

        if (lobby.players.length >= 2) {
            return res.status(403).json({ error: 'Lobby is full' });
        }

        const playerId = req.session.account.username; // Using session ID for temporary player ID
        
        if (lobby.players.some(p => p.playerId === playerId)) {
            return res.status(409).json({ error: 'You are already in this lobby' });
        }
        
        lobby.players.push({ playerId: playerId, ws: null, paddle: 'right' }); 

        console.log(`Player ${playerId} joined lobby ${lobbyId}`);
        
        // Respond with the lobbyId
        res.status(200).json({ lobbyId: lobbyId });
    // } else {
    //     res.status(401).json({ error: 'User not authenticated' });
    // }
})



export default router;