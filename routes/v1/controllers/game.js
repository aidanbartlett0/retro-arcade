import express from 'express'
var router = express.Router();


router.post('/start', async function(req, res, next){
    try{
        if(req.session.isAuthenticated){
            console.log('game started')
            req.session.game = {
                playing: true, 
                scores: { left: 0, right: 0 },
                players: { left: 'eviluser', right: req.session.account.username }
            }
            console.log(req.session.game)
            return res.status(200).json({status: 'game started', players: req.session.game.players})
        }else {
            return res.status(401).json({status: 'loggedout', userInfo: 'There is no user for this session'})
        }
    } catch(error){
        res.status(500).json({status: 'error', 'error': error})
        console.log(error)
    }
})

// add the logic to "log in" the evil player and create a fake dynamo user
router.post('/stop', async function(req, res, next){
    try{
        if(req.session.game.playing){
            const leftScore = req.session.game.scores['left'];
            const rightScore = req.session.game.scores['right'];
            const leftPlayer = req.session.game.players['left'];
            const rightPlayer = req.session.game.players['right'];
                                
            // const leftUser = await req.models.User.findOne({ username: leftPlayer });
            const leftUser = await req.models.User.findOne({username: 'eviluser'})
            const rightUser = await req.models.User.findOne({ username: rightPlayer });
            
            let winner = null;
            let winner_username;
            let loser = null;
            let winnerScore = 0;
            let loserScore = 0;
            
            if (leftScore > rightScore){
                winner = leftUser._id
                winner_username = leftUser.username
                loser = rightUser._id
                winnerScore = leftScore;
                loserScore = rightScore;
            }
            else if (rightScore > leftScore){
                winner = rightUser._id;
                winner_username = rightUser.username
                loser = leftUser._id;
                winnerScore = rightScore;
                loserScore = leftScore;
            }

            const matchDoc = new req.models.Match({
              player1: leftUser._id,
              player2: rightUser._id,
              score: { player1: leftScore, player2: rightScore },
              winner: winner,
              date: new Date()
            });
            leftUser.matchHistory.push(matchDoc._id);
            rightUser.matchHistory.push(matchDoc._id);
            
            if (winner) {
                const scoreDifferential = winnerScore - loserScore;
                // Rank change = score differential (larger differential = more rank)
                // If differential is 0 (shouldn't happen with a winner), default to 1
                const rankChange = scoreDifferential > 0 ? scoreDifferential : 1;
                
                // Get the winner and loser user objects
                const winnerUser = winner.equals(leftUser._id) ? leftUser : rightUser;
                const loserUser = loser.equals(leftUser._id) ? leftUser : rightUser;
                
                // Initialize rank if undefined
                if (winnerUser.rank === undefined || winnerUser.rank === null) {
                    winnerUser.rank = 0;
                }
                if (loserUser.rank === undefined || loserUser.rank === null) {
                    loserUser.rank = 0;
                }
                
                // Winner gains rank, loser loses rank (same amount)
                winnerUser.rank += rankChange;
                loserUser.rank -= rankChange;
                
                // Ensure rank doesn't go below 0
                if (loserUser.rank < 0) {
                    loserUser.rank = 0;
                }
            }
            
            await leftUser.save();
            await rightUser.save();
        
            await matchDoc.save();

        
            console.log('game stopped, winner:', winner)
            if (!winner) {
                return res.status(200).json({ status: 'game tied' });
            } else {
                return res.status(200).json({ status: 'game ended', winner: winner_username });
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