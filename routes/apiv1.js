import express from 'express';
var router = express.Router();

import identityRouter from './v1/controllers/users.js';
import gameRouter from './v1/controllers/game.js';
import matchRouter from './v1/controllers/matches.js';

router.use('/users', identityRouter)
router.use('/game', gameRouter)
router.use('/matches', matchRouter)


export default router;