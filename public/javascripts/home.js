async function login(){
    window.location = "/signin";
}

async function logout(){
    window.location = "/signout";
}


function showJoinLobbyInput() {
    document.getElementById('join-lobby-btn').style.display = 'none';
    document.getElementById('pinInputContainer').style.display = 'block';
    document.getElementById('pinInput').value = '';
    document.getElementById('pinInput').focus();
}

function hideJoinLobbyInput() {
    document.getElementById('join-lobby-btn').style.display = 'block';
    document.getElementById('pinInputContainer').style.display = 'none';
}

async function submitJoinLobbyPin() {
    const pin = document.getElementById('pinInput').value;
    if (!pin || pin.length !== 6) {
        alert('Please enter a valid 6-digit PIN.');
        return;
    }

    try {
        const response = await fetch('/api/v1/users/whoami');
        const joinLobbyResponse = await fetch('/api/v1/lobbies/join', {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pin })
        });

        if (!joinLobbyResponse.ok) {
            alert('Failed to join lobby. The PIN may be invalid or the lobby is full.');
            return;
        }

        const lobbyInfo = await joinLobbyResponse.json();
        // Immediately redirect to the game page
        window.location.href = `/index.html?lobbyId=${lobbyInfo.lobbyId}`;

    } catch (error) {
        console.error('Error in submitJoinLobbyPin:', error);
        alert('An error occurred while joining the lobby.');
    }
}


async function MakeLobby() {
    try {
        const createLobbyResponse = await fetch('/api/v1/lobbies/create', {
            method: "POST"
        });

        if (!createLobbyResponse.ok) {
            alert('Failed to create lobby on the server. Please try again.');
            return;
        }

        const lobbyInfo = await createLobbyResponse.json();
        // Immediately redirect to the game page, passing both lobbyId and pin
        window.location.href = `/index.html?lobbyId=${lobbyInfo.lobbyId}&pin=${lobbyInfo.pin}`;

    } catch (error) {
        console.error('Error in MakeLobby function:', error);
        alert('An error occurred while creating the lobby.');
    }
}

async function userState(){
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    
    try {
        const response = await fetch('/api/v1/users/whoami');
        const userjson = await response.json();
        
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

function startGame() {
    window.location.href = '/local.html';
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

async function load_matches(){
    try{
        userState()
        let response = await fetch('/api/v1/users/whoami');
        const userjson = await response.json();
        const username = userjson.userInfo.username
    
        response = await fetch(`/api/v1/matches/history`)
        const matchjson = await response.json();
        // console.log('match history:', matchjson);  
        
        let statsContainer = document.getElementById('match-stats-container');
        if (matchjson.matches && matchjson.matches.length > 0) {
            const completedMatches = matchjson.matches.filter(m => m.winner);
            const gamesPlayed = completedMatches.length;
            const gamesWon = completedMatches.filter(m => m.won).length;
            const gamesLost = gamesPlayed - gamesWon;
            const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
            
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card stat-total">
                        <div class="stat-label">Games Played</div>
                        <div class="stat-value">${gamesPlayed}</div>
                    </div>
                    <div class="stat-card stat-won">
                        <div class="stat-label">Wins</div>
                        <div class="stat-value">${gamesWon}</div>
                    </div>
                    <div class="stat-card stat-lost">
                        <div class="stat-label">Losses</div>
                        <div class="stat-value">${gamesLost}</div>
                    </div>
                    <div class="stat-card stat-rate">
                        <div class="stat-label">Win Rate</div>
                        <div class="stat-value">${winRate}%</div>
                    </div>
                </div>
            `;
        } else {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card stat-total">
                        <div class="stat-label">Games Played</div>
                        <div class="stat-value">0</div>
                    </div>
                    <div class="stat-card stat-won">
                        <div class="stat-label">Wins</div>
                        <div class="stat-value">0</div>
                    </div>
                    <div class="stat-card stat-lost">
                        <div class="stat-label">Losses</div>
                        <div class="stat-value">0</div>
                    </div>
                    <div class="stat-card stat-rate">
                        <div class="stat-label">Win Rate</div>
                        <div class="stat-value">0%</div>
                    </div>
                </div>
            `;
        }
        
        let historyContainer = document.getElementById('match-history-container') 
        if (matchjson.matches && matchjson.matches.length > 0) {
            historyContainer.innerHTML = matchjson.matches.map(match => {
                const matchDate = match.date ? new Date(match.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Date unknown';
                
                let resultClass = '';
                let resultText = '';
                if (match.winner) {
                    resultClass = match.won ? 'match-won' : 'match-lost';
                    resultText = match.won ? 'Victory' : 'Defeat';
                } else {
                    resultClass = 'match-pending';
                    resultText = 'No Winner';
                }
                
                const isPlayer1Winner = match.winner && match.player1 === match.winner;
                const isPlayer2Winner = match.winner && match.player2 === match.winner;
                const isPlayer1Current = match.player1 === username;
                const isPlayer2Current = match.player2 === username;
                
                return `
                    <div class="match-item ${resultClass}">
                        <div class="match-players">
                            <span class="player-name ${isPlayer1Winner ? 'winner' : ''} ${isPlayer1Current ? 'current-user' : ''}">${match.player1}</span>
                            <span class="vs-separator">vs</span>
                            <span class="player-name ${isPlayer2Winner ? 'winner' : ''} ${isPlayer2Current ? 'current-user' : ''}">${match.player2}</span>
                        </div>
                        <div class="match-score">
                            <span class="score-value">${match.score?.player1 || 0}</span>
                            <span class="score-separator">-</span>
                            <span class="score-value">${match.score?.player2 || 0}</span>
                        </div>
                        <div class="match-result">
                            ${match.winner ? `<span class="result-badge ${resultClass}">${resultText}</span>` : ''}
                            ${match.winner ? `<span class="winner-name">Winner: ${match.winner}</span>` : '<span class="winner-name">Match incomplete</span>'}
                        </div>
                        <div class="match-date">${matchDate}</div>
                    </div>
                `;
            }).join('');
        } else {
            historyContainer.innerHTML = '<div class="no-matches">No match history yet. Play a game to see your matches here!</div>';
        }
    } catch(error){
        let historyContainer = document.getElementById('match-history-container') 
        historyContainer.innerHTML = '<div class="no-matches">Unable to load match history. Please try again later.</div>';
        console.log({error: error})
    }

}

window.addEventListener('DOMContentLoaded', () => {
    userState();
});


