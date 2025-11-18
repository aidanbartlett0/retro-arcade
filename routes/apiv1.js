import express from 'express';
var router = express.Router();

import identityRouter from './v1/controllers/users.js';

router.use('/users', identityRouter)

export default router;