import express from 'express';

var router = express.Router();

router.get('/whoami', async function(req, res, next){
  try{
    if(req.session.isAuthenticated){
      console.log('logged in')
      const username = req.session.account.username
      const name = req.session.account.name
      const [firstName, ...rest] = name.split(" ")
      const lastName = rest.join(" ")
      let user = await req.models.User.findOne({ username: username })

      if (!user) {
        user = await req.models.User.create({
          username: username, 
          email: username,
          firstName: firstName,
          lastName: lastName,
          matchHistory: []
        })
        console.log("CREATED NEW USER:", user.username)
      }
      req.session.mongoId = user._id;
  
        res.json({status: "loggedin", 
            userInfo: {
               name: name, 
               username: username, 
               mongoId: user._id,
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
