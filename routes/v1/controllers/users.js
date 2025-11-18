import express from 'express';

var router = express.Router();

router.get('/whoami', async function(req, res, next){
  try{
    if(req.session.isAuthenticated){
      console.log('logged in')
        res.json({status: "loggedin", 
            userInfo: {
               name: req.session.account.name, 
               username: req.session.account.username, 
               isAuthenticated: req.session.isAuthenticated
            }
         })
      } else {
        res.json({status: 'loggedout', userInfo: 'There is no user for this session'})
      }
  } catch(error){
    res.status(500).json({status: 'error', 'error': error})
    console.log(error)
  }
})

export default router;
