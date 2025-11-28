import express from 'express'
import crypto from 'crypto'
import { lobbies, pin_to_lobby } from '../../../app.js'

var router = express.Router();


router.post('/create', (req,res) => {

    if (req.session.isAuthenticated) {
        const playerId = req.session.account.username;
        const lobbyId = crypto.randomUUID();
        let pin;
        do {
         pin = Math.floor(100000 + Math.random() * 900000).toString();
        } while (pin_to_lobby[pin]);

        pin_to_lobby[pin] = lobbyId;
        lobbies[lobbyId] = {
            lobbyId: lobbyId,
            pin: pin,
            players: [{ playerId: playerId, ws: null }], // Add creator, ws will be added later
            gameState: { /* initial game state can go here */ }
        };
 
        console.log(`Lobby created: ID=${lobbyId}, PIN=${pin}`);
        console.log(lobbies);
        console.log(pin_to_lobby);
 
        // Send the PIN and lobbyId back to the client
        res.status(201).json({ pin: pin, lobbyId: lobbyId });
    }



})

router.post('/join', (req,res) => {
    if (req.session.isAuthenticated) {
            const pin = req.body.pin
            res.status(200).json({lobbyId: pin_to_lobby[pin]})
            console.log("join lobby request successful")
            console.log(lobbies);
            console.log(pin_to_lobby);
    }
})



export default router;