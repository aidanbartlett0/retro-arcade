import express from 'express';

var router = express.Router();


router.get('/history', async function(req, res, next) {
    try {
      if (!req.session.isAuthenticated) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const username = req.session.account.username;
      let user = await req.models.User.findOne({ username: username });
      if (!user) {
        return res.status(404).json({ error: "User doesnt exist" });
      }
      const matches = [];
      for (const matchId of user.matchHistory) {
        const match = await req.models.Match.findOne({_id: matchId});
        const leftUser = await req.models.User.findOne({_id: match.player1});
        const rightUser = await req.models.User.findOne({_id: match.player2});
        const winnerUser = match.winner ? await req.models.User.findById(match.winner) : null;
        match.player1 = leftUser
        match.player2 = rightUser
        match.winner = winnerUser
        matches.push(match);
      }
  
      const formatted = matches.map(match => ({
        match_id: match._id,
        player1: match.player1?.username || "Unknown",
        player2: match.player2?.username || "Unknown",
        score: match.score,
        winner: match.winner?.username || null,
        date: match.date,
        won: String(match.winner?._id) === String(user._id)
      }));
        
      return res.status(200).json({ matches: formatted });
        
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Server error", detail: error });
    }
  });

// router.post('/saveGame', async (req,res) => {
    
//     try {
//         const {player1, player2, winner} = req.body
//         const score_1 = req.body.score.player1
//         const score_2 = req.body.score.player2
//         console.log(`player1: ${player1}, player2: ${player2}, score: ${JSON.stringify(score)}, winner: ${winner}`)
//         const leftUser = await req.models.User.findOne({username: player1})
//         const rightUser = await req.models.User.findOne({ username: player2 });
            
//         const matchDoc = new req.models.Match({
//               player1: leftUser._id,
//               player2: rightUser._id,
//               score: { player1: score_1, player2: score_2 },
//               winner: winner,
//               date: new Date()
//         });
//         leftUser.matchHistory.push(matchDoc._id);
//         rightUser.matchHistory.push(matchDoc._id);
//         await leftUser.save();
//         await rightUser.save();
        
//         await matchDoc.save();

//     } catch (err) {
//         console.log('Error saving match:', err);
//     }

// })

export default router;