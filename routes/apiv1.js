import express from 'express';
var router = express.Router();

import identityRouter from './v1/controllers/users.js';
import gameRouter from './v1/controllers/game.js';
import matchRouter from './v1/controllers/matches.js';
import lobbiesRouter from './v1/controllers/lobbies.js';

router.use('/lobbies', lobbiesRouter)

router.use('/users', identityRouter)
router.use('/game', gameRouter)
router.use('/matches', matchRouter)


export default router;