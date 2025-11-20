import express from 'express';
var router = express.Router();

import identityRouter from './v1/controllers/users.js';
import gameRouter from './v1/controllers/game.js';

router.use('/users', identityRouter)
router.use('/game', gameRouter)

export default router;