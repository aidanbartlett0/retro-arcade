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
    const response = await fetch('/api/v1/users/whoami');
    const userjson = await response.json();
    console.log('User state:', userjson);
    
    const isLoggedIn = userjson.status === 'loggedin' && userjson.userInfo;

    if(isLoggedIn) {
        try {
            const createLobbyResponse = await fetch('/api/v1/lobbies/create', {
                method: "POST"
            });

            if (!createLobbyResponse.ok) {
                alert('Failed to create lobby on the server. Please try again.');
                return;
            }

            const lobbyInfo = await createLobbyResponse.json();
            window.location.href = `/index.html?lobbyId=${lobbyInfo.lobbyId}&pin=${lobbyInfo.pin}`;

        } catch (error) {
            console.error('Error in MakeLobby function:', error);
            alert('An error occurred while creating the lobby.');
        }
    }else {
        alert('Please login first to make a lobby')
    }
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

function startGame() {
    window.location.href = '/index.html';
}

function viewFriends() {
    alert('Friends feature coming soon!');
    // window.location.href = '/friends.html';
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
        console.log('match history:', matchjson);  
        let history = document.getElementById('match_history') 
        if (matchjson.matches && matchjson.matches.length > 0) {
            history.innerText = matchjson.matches.map(m => 
                `${m.player1} vs ${m.player2} | Score: ${m.score.player1}-${m.score.player2} | Winner: ${m.winner || 'TBD'}`
            ).join('\n');
        } else {
            history.innerText = 'No games yet';
        }
    } catch(error){
        let history = document.getElementById('match_history') 
        history.Text = 'No games yet';
        console.log({error: error})
        alert(error)
    }

}

window.addEventListener('DOMContentLoaded', () => {
    userState();
});


