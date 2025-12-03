async function login(){
    window.location = "/signin";
}

async function logout(){
    window.location = "/signout";
}

async function userState(){
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    
    try {
        const response = await fetch('/api/v1/users/whoami');
        const userjson = await response.json();
        console.log('User state:', userjson);
        
        const isLoggedIn = userjson.status === 'loggedin' && userjson.userInfo;
        
        loginBtn.style.display = isLoggedIn ? 'none' : 'block';
        logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
        
        if (isLoggedIn) {
            const userName = userjson.userInfo.username;
            userInfo.innerHTML = `<span class="user-name">Welcome, ${userName}!</span>`;
            userInfo.style.display = 'block';
        } else {
            userInfo.innerHTML = '';
            userInfo.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching user state:', error);
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
    }
}

function goHome() {
    window.location.href = '/home.html';
}

async function viewMatchHistory() {
    const response = await fetch('/api/v1/users/whoami');
    const userjson = await response.json();
    if (userjson.status === 'loggedin'){
        window.location.href = '/match-history.html';
    }
    else{
        alert('You must log in first!')
    }
}

async function addFriend() {
    const usernameInput = document.getElementById('friend-username-input');
    const username = usernameInput.value.trim();
    const messageDiv = document.getElementById('add-friend-message');
    const addFriendBtn = document.getElementById('add-friend-btn');

    if (!username) {
        messageDiv.textContent = 'Please enter a username';
        messageDiv.className = 'message error';
        return;
    }

    addFriendBtn.disabled = true;
    addFriendBtn.textContent = 'Adding...';

    try {
        const response = await fetch('/api/v1/users/friends/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: username })
        });

        const result = await response.json();

        if (result.status === 'success') {
            messageDiv.textContent = result.message || 'Friend added successfully!';
            messageDiv.className = 'message success';
            usernameInput.value = '';
            
            await loadFriends();
        } else {
            messageDiv.textContent = result.error || 'Failed to add friend';
            messageDiv.className = 'message error';
        }
    } catch (error) {
        messageDiv.textContent = 'Error adding friend. Please try again.';
        messageDiv.className = 'message error';
        console.error('Error adding friend:', error);
    } finally {
        addFriendBtn.disabled = false;
        addFriendBtn.textContent = 'Add Friend';
    }
}

async function loadFriends() {
    const friendsListDiv = document.getElementById('friends-list');
    
    try {
        const response = await fetch('/api/v1/users/friends');
        const result = await response.json();

        if (result.status === 'success') {
            const friends = result.friends || [];
            
            if (friends.length === 0) {
                friendsListDiv.innerHTML = '<p class="no-friends">You have no friends yet. Add some friends above!</p>';
            } else {
                friendsListDiv.innerHTML = friends.map(friend => {
                    const fullName = friend.firstName && friend.lastName 
                        ? `${friend.firstName} ${friend.lastName}`
                        : friend.username;
                    return `
                        <div class="friend-item">
                            <div class="friend-info">
                                <span class="friend-username">${friend.username}</span>
                                ${friend.firstName || friend.lastName ? `<span class="friend-name">(${fullName})</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            friendsListDiv.innerHTML = '<p class="error">Error loading friends. Please refresh the page.</p>';
        }
    } catch (error) {
        friendsListDiv.innerHTML = '<p class="error">Error loading friends. Please refresh the page.</p>';
        console.error('Error loading friends:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    userState();
    loadFriends();
    
    const usernameInput = document.getElementById('friend-username-input');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addFriend();
            }
        });
    }
});

