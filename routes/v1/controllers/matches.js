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
      let user_id = user._id
      const matches = await req.models.Match.find({
        _id: { $in: user.matchHistory }
      })
        .populate('player1', 'username')
        .populate('player2', 'username')
        .populate('winner', 'username');
  
      const formatted = matches.map(match => ({
        match_id: match._id,
        player1: match.player1.username,
        player2: match.player2.username,
        score: match.score,
        winner: match.winner.username,
        date: match.date,
        won: String(match.winner._id) === String(user_id)
      }));
  
      return res.status(200).json({ matches: formatted });
        
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Server error", detail: error });
    }
  });
  

export default router;