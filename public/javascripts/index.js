async function init(){
    userState()
}


async function login(){

    window.location = "/signin";
    userState();

}

async function logout(){
    window.location = "/signout";
    userState();
}


async function userState(){
    let whoami = await fetch('/api/v1/users/whoami')
    console.log(whoami)
    userjson = await whoami.json();
    console.log(userjson)
    document.getElementById('userState').innerText = JSON.stringify(userjson)
}

