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
          matchHistory: [],
          friends: []
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

router.post('/friends/add', async function(req, res, next){
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({status: 'error', error: 'Not authenticated'});
    }

    const username = req.session.account.username;
    const friendUsername = req.body.username;

    if (!friendUsername) {
      return res.status(400).json({status: 'error', error: 'Username is required'});
    }

    if (username === friendUsername) {
      return res.status(400).json({status: 'error', error: 'Cannot add yourself as a friend'});
    }

    let user = await req.models.User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({status: 'error', error: 'User not found'});
    }

    const friendUser = await req.models.User.findOne({ username: friendUsername });
    if (!friendUser) {
      return res.status(404).json({status: 'error', error: 'Friend user not found'});
    }

    if (!user.friends) {
      user.friends = [];
    }

    if (user.friends.some(friendId => String(friendId) === String(friendUser._id))) {
      return res.status(400).json({status: 'error', error: 'User is already your friend'});
    }

    user.friends.push(friendUser._id);
    await user.save();

    res.json({status: 'success', message: `Added ${friendUsername} as a friend`});
  } catch(error) {
    res.status(500).json({status: 'error', error: error.message});
    console.log(error);
  }
})

router.get('/friends', async function(req, res, next){
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({status: 'error', error: 'Not authenticated'});
    }

    const username = req.session.account.username;
    let user = await req.models.User.findOne({ username: username }).populate('friends');

    if (!user) {
      return res.status(404).json({status: 'error', error: 'User not found'});
    }

    if (!user.friends) {
      user.friends = [];
    }

    const friendsList = user.friends.map(friend => ({
      id: friend._id,
      username: friend.username,
      firstName: friend.firstName,
      lastName: friend.lastName
    }));

    res.json({status: 'success', friends: friendsList});
  } catch(error) {
    res.status(500).json({status: 'error', error: error.message});
    console.log(error);
  }
})

export default router;
