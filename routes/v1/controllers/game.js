import express from 'express'
var router = express.Router();


router.post('/collision', async function(req, res, next){
    try{
        console.log(req.body.paddle_side, 'just hit the ball')
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})

router.post('/score', async function(req, res, next){
    try{
        console.log(req.body.paddle_side, 'just scored')
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})

export default router