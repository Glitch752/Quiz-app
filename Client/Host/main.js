// var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws');
var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.split(':')[0] + ':6790');
//The .split(':')[0] is to remove the port number from the hostname.

wsc.onopen = function() {
    console.log("Connected to server!");

    var id = getURLParameter("id");
    if(!id) {
        id = 1;
    }

    wsc.send(JSON.stringify({
        type: 'hostQuiz',
        id: id
    }));
}

wsc.onmessage = function(message) {
    var parsedData = JSON.parse(message.data);
    if (parsedData.type === 'gameCode') {
        var gameCode = document.getElementById('gameCode');
        gameCode.innerHTML = parsedData.gameCode;
    } else if(parsedData.type === 'updateUsers') {
        updateUsers(parsedData.users);
    }
}

function updateUsers(users) {
    var gameUsers = document.getElementById("gameUsers");
    gameUsers.innerHTML = "";

    for(var i = 0; i < users.length; i++) {
        gameUsers.innerHTML += `
            <div class="game-user">${users[i].name}</div>
        `
    }
}

function startGame() {
    
}

function ViewQuiz(id) {
    window.location.href += `View/?id=${id}`;
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}