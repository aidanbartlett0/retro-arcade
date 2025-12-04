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
        // console.log('User state:', userjson);
        
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
    addFriendBtn.textContent = 'Sending...';

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
            messageDiv.textContent = result.message || 'Friend request sent!';
            messageDiv.className = 'message success';
            usernameInput.value = '';
            
            await loadFriends();
        } else {
            messageDiv.textContent = result.error || 'Failed to send friend request';
            messageDiv.className = 'message error';
        }
    } catch (error) {
        messageDiv.textContent = 'Error sending friend request. Please try again.';
        messageDiv.className = 'message error';
        console.error('Error sending friend request:', error);
    } finally {
        addFriendBtn.disabled = false;
        addFriendBtn.textContent = 'Send Friend Request';
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
                            <button onclick="removeFriend('${friend.id}')" class="remove-friend-btn">Remove</button>
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

async function loadFriendRequests() {
    const requestsListDiv = document.getElementById('friend-requests-list');
    const requestsAlert = document.getElementById('friend-requests-alert');
    
    try {
        const response = await fetch('/api/v1/users/friends/requests');
        const result = await response.json();

        if (result.status === 'success') {
            const requests = result.requests || [];
            
            if (requests.length > 0) {
                if (requestsAlert) {
                    requestsAlert.style.display = 'block';
                    requestsAlert.textContent = `You have ${requests.length} pending friend request${requests.length > 1 ? 's' : ''}!`;
                }
            } else {
                if (requestsAlert) {
                    requestsAlert.style.display = 'none';
                }
            }
            
            if (requests.length === 0) {
                requestsListDiv.innerHTML = '<p class="no-friends">No pending friend requests</p>';
            } else {
                requestsListDiv.innerHTML = requests.map(request => {
                    const fullName = request.firstName && request.lastName 
                        ? `${request.firstName} ${request.lastName}`
                        : request.username;
                    return `
                        <div class="friend-request-item">
                            <div class="friend-info">
                                <span class="friend-username">${request.username}</span>
                                ${request.firstName || request.lastName ? `<span class="friend-name">(${fullName})</span>` : ''}
                            </div>
                            <div class="friend-request-actions">
                                <button onclick="acceptFriendRequest('${request.id}')" class="accept-btn">Accept</button>
                                <button onclick="denyFriendRequest('${request.id}')" class="deny-btn">Deny</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            requestsListDiv.innerHTML = '<p class="error">Error loading friend requests. Please refresh the page.</p>';
        }
    } catch (error) {
        requestsListDiv.innerHTML = '<p class="error">Error loading friend requests. Please refresh the page.</p>';
        console.error('Error loading friend requests:', error);
    }
}

async function acceptFriendRequest(userId) {
    try {
        const response = await fetch('/api/v1/users/friends/requests/accept', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userId })
        });

        const result = await response.json();

        if (result.status === 'success') {
            await loadFriendRequests();
            await loadFriends();
            const messageDiv = document.getElementById('add-friend-message');
            messageDiv.textContent = 'Friend request accepted!';
            messageDiv.className = 'message success';
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }, 3000);
        } else {
            alert(result.error || 'Failed to accept friend request');
        }
    } catch (error) {
        alert('Error accepting friend request. Please try again.');
        console.error('Error accepting friend request:', error);
    }
}

async function denyFriendRequest(userId) {
    try {
        const response = await fetch('/api/v1/users/friends/requests/deny', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userId })
        });

        const result = await response.json();

        if (result.status === 'success') {
            await loadFriendRequests();
            const messageDiv = document.getElementById('add-friend-message');
            messageDiv.textContent = 'Friend request denied';
            messageDiv.className = 'message success';
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }, 3000);
        } else {
            alert(result.error || 'Failed to deny friend request');
        }
    } catch (error) {
        alert('Error denying friend request. Please try again.');
        console.error('Error denying friend request:', error);
    }
}

async function removeFriend(userId) {
    if (!confirm('Are you sure you want to remove this friend?')) {
        return;
    }

    try {
        const response = await fetch('/api/v1/users/friends/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userId })
        });

        const result = await response.json();

        if (result.status === 'success') {
            await loadFriends();
            const messageDiv = document.getElementById('add-friend-message');
            messageDiv.textContent = 'Friend removed successfully';
            messageDiv.className = 'message success';
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }, 3000);
        } else {
            alert(result.error || 'Failed to remove friend');
        }
    } catch (error) {
        alert('Error removing friend. Please try again.');
        console.error('Error removing friend:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    userState();
    loadFriends();
    loadFriendRequests();
    
    const usernameInput = document.getElementById('friend-username-input');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addFriend();
            }
        });
    }
});

