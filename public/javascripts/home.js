async function login(){
    window.location = "/signin";
}

async function logout(){
    window.location = "/signout";
}


// ?? test that theh ws is being made and uses the pin to make a lobby var lobbies = {}
// var pin_to_lobby = {} with schema `lobbies` dictionary: {'lobby_id_123': {players: [...], gameState: {...}}}
//    * `pin_to_lobby` dictionary: {'56789': 'lobby_id_123'}

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
        const whoamiResponse = await fetch('/api/v1/users/whoami');
        const userjson = await whoamiResponse.json();
        if (!userjson.userInfo) {
            alert('You must be logged in to join a lobby.');
            return;
        }

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
        const { lobbyId } = lobbyInfo;
        
        hideJoinLobbyInput(); // Hide the input on success
        alert(`Successfully joined lobby! Waiting for game to start...`);

        const socketURL = ((window.location.protocol === "https:") ? "wss:" : "ws:") + "//" + window.location.host + "/gameSocket";
        const webSocket = new WebSocket(socketURL);

        webSocket.onopen = () => {
            webSocket.send(JSON.stringify({ action: 'joinLobby', lobbyId: lobbyId, pin: pin }));
        };

        // webSocket.onmessage = (event) => {
        //     const message = JSON.parse(event.data);
        //     if (message.type === 'gameStart') {
        //         window.location.href = `/index.html?lobbyId=${lobbyId}`;
        //     }
        // };

    } catch (error) {
        console.error('Error in submitJoinLobbyPin:', error);
        alert('An error occurred while joining the lobby.');
    }
}


async function MakeLobby() {

    try {
        const whoamiResponse = await fetch('/api/v1/users/whoami');
        const userjson = await whoamiResponse.json();
        const isLoggedIn = userjson.status === 'loggedin' && userjson.userInfo;
        if (!isLoggedIn) {
            alert('You must be logged in to create a lobby.');
            return;
        }
        const createLobbyResponse = await fetch('/api/v1/lobbies/create', {
            method: "POST"
        });
        if (!createLobbyResponse.ok) {
            alert('Failed to create lobby on the server. Please try again.');
            return;
        }
        const lobbyInfo = await createLobbyResponse.json(); // Expects { pin: "...", lobbyId: "..." }
        const { pin, lobbyId } = lobbyInfo;
        alert(`Lobby created! Share this PIN with your friend to join: ${pin}`);
        // 2. Open WebSocket
        const socketURL = ((window.location.protocol === "https:") ? "wss:" : "ws:")
                        + "//" + window.location.host + "/gameSocket";
        const webSocket = new WebSocket(socketURL);



        webSocket.onopen = () => {
            console.log('WebSocket connected. Sending createLobby action.');
            webSocket.send(JSON.stringify({
                action: 'createLobby',
                lobbyId: lobbyId
            }));

        };



        webSocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message from server:', message);
            if (message.type === 'gameStart') {
                console.log('Game is starting! Navigating to game page.');
                // Redirect to the game page, passing the lobbyId so the game client knows which game it's in
                window.location.href = `/index.html?lobbyId=${lobbyId}`;

            }

        };



        webSocket.onclose = () => console.log('WebSocket disconnected.');

        webSocket.onerror = (error) => console.error('WebSocket error:', error);



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

