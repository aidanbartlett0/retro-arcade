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

let scores = { left: 0, right: 0 };

router.post('/score', async function(req, res, next){
    try{
        let side = req.body.paddle_side
        scores[side] += 1
        console.log(side, 'just scored')
        return res.json({player:side})
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})

router.get('/getScore', async function(req, res, next){
    try{
        console.log('getting scores: ', scores)
        return res.json(scores)
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})


export default router