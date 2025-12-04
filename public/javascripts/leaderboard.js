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
            const userName = userjson.userInfo.username ;
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

async function viewFriends() {
    const response = await fetch('/api/v1/users/whoami');
    const userjson = await response.json();
    if (userjson.status === 'loggedin'){
        window.location.href = '/friends.html';
    }
    else{
        alert('You must log in first!')
    }
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

async function loadLeaderboard(){
    try{
        userState();
        
        const response = await fetch('/api/v1/users/leaderboard');
        const leaderboardJson = await response.json();
        console.log('Leaderboard:', leaderboardJson);
        
        let leaderboardContainer = document.getElementById('leaderboard-container');
        
        if (leaderboardJson.leaderboard && leaderboardJson.leaderboard.length > 0) {
            let currentUsername = null;
            try {
                const userResponse = await fetch('/api/v1/users/whoami');
                const userJson = await userResponse.json();
                if (userJson.status === 'loggedin') {
                    currentUsername = userJson.userInfo.username;
                }
            } catch (error) {
                console.log('Could not fetch current user info');
            }
            
            leaderboardContainer.innerHTML = `
                <div class="leaderboard-header">
                    <div class="leaderboard-header-item">Rank</div>
                    <div class="leaderboard-header-item">Username</div>
                    <div class="leaderboard-header-item">Score</div>
                </div>
                ${leaderboardJson.leaderboard.map(entry => {
                    const isCurrentUser = currentUsername && entry.username === currentUsername;
                    const rankClass = entry.rank === 1 ? 'rank-gold' : entry.rank === 2 ? 'rank-silver' : entry.rank === 3 ? 'rank-bronze' : '';
                    const userClass = isCurrentUser ? 'current-user-entry' : '';
                    
                    return `
                        <div class="leaderboard-entry ${rankClass} ${userClass}">
                            <div class="leaderboard-rank">
                                ${entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                            </div>
                            <div class="leaderboard-username">${entry.username}</div>
                            <div class="leaderboard-score">${entry.score.toFixed(2)}</div>
                        </div>
                    `;
                }).join('')}
            `;
        } else {
            leaderboardContainer.innerHTML = '<div class="no-leaderboard">No rankings yet. Play games to see the leaderboard!</div>';
        }
    } catch(error){
        let leaderboardContainer = document.getElementById('leaderboard-container');
        leaderboardContainer.innerHTML = '<div class="no-leaderboard">Unable to load leaderboard. Please try again later.</div>';
        console.log({error: error});
    }
}

window.addEventListener('DOMContentLoaded', () => {
    userState();
});

