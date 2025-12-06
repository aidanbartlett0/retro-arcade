import express from 'express';

var router = express.Router();

router.get('/whoami', async function(req, res, next){
  try{
    if(req.session.isAuthenticated){
      console.log('logged in')
      console.log('session account:', req.session.account)
      if (!req.session.account.email) {
        req.session.account.email = req.session.account.username;
      }
      const email = req.session.account.email;
      const name = req.session.account.name
      const [firstName, ...rest] = name.split(" ")
      const lastName = rest.join(" ")
      let user = await req.models.User.findOne({email})

      if (!user) {
        user = await req.models.User.create({
          username: email.split("@")[0], 
          email: email,
          firstName: firstName,
          lastName: lastName,
          matchHistory: [],
          friends: [],
          friendRequests: []
        })
        console.log("CREATED NEW USER:", user.username)
      }
      req.session.account.username = user.username
      req.session.mongoId = user._id;
  
        res.json({status: "loggedin", 
            userInfo: {
               name: name, 
               username: user.username, 
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


router.post('/changeUsername', async function (req, res) {
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({
        status: 'error',
        error: 'You must be logged in to change your username'
      });
    }
    const newName = req.body.username.trim();
    const userId = req.session.mongoId;
    if (!newName) {
      return res.status(400).json({
        status: 'error',
        error: 'Username is required'
      });
    }
    const valid = /^[A-Za-z0-9_]{5,15}$/.test(newName);
    if (!valid) {
      return res.status(400).json({
        status: 'error',
        error: 'Username may only contain letters, numbers, and underscores, and must be 5-10 characters long'
      });
    }
    const existingUser = await req.models.User.findOne({ username: newName });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        error: 'Username is already taken'
      });
    }

    const user = await req.models.User.findOne({ _id: userId });
    user.username = newName;
    await user.save();
    req.session.account.username = newName;
    req.session.save();
    return res.json({
      status: 'success',
      message: 'Username updated successfully',
      username: newName
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
});

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
    if (!friendUser.friendRequests) {
      friendUser.friendRequests = [];
    }

    if (user.friends.some(friendId => String(friendId) === String(friendUser._id))) {
      return res.status(400).json({status: 'error', error: 'User is already your friend'});
    }

    if (friendUser.friendRequests.some(requestId => String(requestId) === String(user._id))) {
      return res.status(400).json({status: 'error', error: 'Friend request already sent'});
    }

    if (user.friendRequests && user.friendRequests.some(requestId => String(requestId) === String(friendUser._id))) {
      return res.status(400).json({status: 'error', error: 'This user has already sent you a friend request. Please accept or deny it first.'});
    }

    friendUser.friendRequests.push(user._id);
    await friendUser.save();

    res.json({status: 'success', message: `Friend request sent to ${friendUsername}`});
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

router.post('/friends/remove', async function(req, res, next){
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({status: 'error', error: 'Not authenticated'});
    }

    const username = req.session.account.username;
    const friendUserId = req.body.userId;

    if (!friendUserId) {
      return res.status(400).json({status: 'error', error: 'User ID is required'});
    }

    let user = await req.models.User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({status: 'error', error: 'User not found'});
    }

    if (!user.friends) {
      user.friends = [];
    }

    const friendIndex = user.friends.findIndex(friendId => String(friendId) === String(friendUserId));
    if (friendIndex === -1) {
      return res.status(400).json({status: 'error', error: 'User is not your friend'});
    }

    user.friends.splice(friendIndex, 1);
    await user.save();

    const friendUser = await req.models.User.findOne({ _id: friendUserId });
    if (friendUser) {
      if (!friendUser.friends) {
        friendUser.friends = [];
      }
      const userIndex = friendUser.friends.findIndex(friendId => String(friendId) === String(user._id));
      if (userIndex !== -1) {
        friendUser.friends.splice(userIndex, 1);
        await friendUser.save();
      }
    }

    res.json({status: 'success', message: 'Friend removed successfully'});
  } catch(error) {
    res.status(500).json({status: 'error', error: error.message});
    console.log(error);
  }
})

router.get('/friends/requests', async function(req, res, next){
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({status: 'error', error: 'Not authenticated'});
    }

    const username = req.session.account.username;
    let user = await req.models.User.findOne({ username: username }).populate('friendRequests');

    if (!user) {
      return res.status(404).json({status: 'error', error: 'User not found'});
    }

    if (!user.friendRequests) {
      user.friendRequests = [];
    }

    const requestsList = user.friendRequests.map(request => ({
      id: request._id,
      username: request.username,
      firstName: request.firstName,
      lastName: request.lastName
    }));

    res.json({status: 'success', requests: requestsList});
  } catch(error) {
    res.status(500).json({status: 'error', error: error.message});
    console.log(error);
  }
})

router.post('/friends/requests/accept', async function(req, res, next){
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({status: 'error', error: 'Not authenticated'});
    }

    const username = req.session.account.username;
    const requestUserId = req.body.userId;

    if (!requestUserId) {
      return res.status(400).json({status: 'error', error: 'User ID is required'});
    }

    let user = await req.models.User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({status: 'error', error: 'User not found'});
    }

    if (!user.friendRequests) {
      user.friendRequests = [];
    }
    if (!user.friends) {
      user.friends = [];
    }

    const requestIndex = user.friendRequests.findIndex(requestId => String(requestId) === String(requestUserId));
    if (requestIndex === -1) {
      return res.status(400).json({status: 'error', error: 'Friend request not found'});
    }

    user.friendRequests.splice(requestIndex, 1);

    if (!user.friends.some(friendId => String(friendId) === String(requestUserId))) {
      user.friends.push(requestUserId);
    }

    await user.save();

    const requester = await req.models.User.findOne({ _id: requestUserId });
    if (requester) {
      if (!requester.friends) {
        requester.friends = [];
      }
      if (!requester.friends.some(friendId => String(friendId) === String(user._id))) {
        requester.friends.push(user._id);
      }
      await requester.save();
    }

    res.json({status: 'success', message: 'Friend request accepted'});
  } catch(error) {
    res.status(500).json({status: 'error', error: error.message});
    console.log(error);
  }
})

router.post('/friends/requests/deny', async function(req, res, next){
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({status: 'error', error: 'Not authenticated'});
    }

    const username = req.session.account.username;
    const requestUserId = req.body.userId;

    if (!requestUserId) {
      return res.status(400).json({status: 'error', error: 'User ID is required'});
    }

    let user = await req.models.User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({status: 'error', error: 'User not found'});
    }

    if (!user.friendRequests) {
      user.friendRequests = [];
    }

    const requestIndex = user.friendRequests.findIndex(requestId => String(requestId) === String(requestUserId));
    if (requestIndex === -1) {
      return res.status(400).json({status: 'error', error: 'Friend request not found'});
    }

    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    res.json({status: 'success', message: 'Friend request denied'});
  } catch(error) {
    res.status(500).json({status: 'error', error: error.message});
    console.log(error);
  }
})

router.get('/leaderboard', async function(req, res, next){
  try {
    const users = await req.models.User.find({})
      .sort({ rank: -1 })
      .limit(10) 
      .select('username firstName lastName rank');
    
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      score: user.rank || 0
    }));
    
    res.json({status: 'success', leaderboard: leaderboard});
  } catch(error) {
    res.status(500).json({status: 'error', error: error.message});
    console.log(error);
  }
})



export default router;
