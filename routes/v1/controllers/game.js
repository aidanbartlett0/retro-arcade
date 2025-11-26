import express from 'express'
var router = express.Router();


router.post('/start', async function(req, res, next){
    try{
        if(req.session.isAuthenticated){
            console.log('game started')
            req.session.game = {
                playing: true, 
                scores: { left: 0, right: 0 },
                players: { left: '(evil) ' + req.session.account.name, right: req.session.account.name }
            }
            console.log(req.session.game)
            return res.status(200).json({status: 'game started'})
        }else {
            return res.status(401).json({status: 'loggedout', userInfo: 'There is no user for this session'})
        }
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})


router.post('/stop', async function(req, res, next){
    try{
        if(req.session.game.playing){
            console.log('game stopped')
            if (req.session.game.scores['left'] > req.session.game.scores['right']){
                return res.status(200).json({status: 'game ended', winner: req.session.game.players['left']})
            }
            else if(req.session.game.scores['right'] > req.session.game.scores['left']){
                return res.status(200).json({status: 'game ended', winner: req.session.game.players['right']})
            }
            else{
                return res.status(200).json({status: 'game tied'})
            }
        }else {
            return res.status(500).json({error: 'the game hasnt started'})
        }
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})


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
        let side = req.body.paddle_side
        req.session.game.scores[side] += 1
        console.log(side, 'just scored')
        return res.json({player:side})
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})

router.get('/getScore', async function(req, res, next){
    try{
        console.log('getting scores: ', req.session.game.scores)
        return res.json(req.session.game.scores)
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})


export default router