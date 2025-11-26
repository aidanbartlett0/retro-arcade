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
        let response = await fetch('/api/v1/users/whoami');
        const userjson = await response.json();
        const username = userjson.userInfo.username
    
        response = await fetch(`/api/v1/matches/history`)
        const matchjson = await response.json();
        console.log('match history:', matchjson);  
        let history = document.getElementById('match_history') 
        history.innerTEXT = matchjson;
    } catch(error){
        let history = document.getElementById('match_history') 
        history.innerTEXT = 'No games yet';
        console.log({error: error})
        alert(error)
    }

}

window.addEventListener('DOMContentLoaded', () => {
    userState();
});

