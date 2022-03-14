// var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws');
var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.split(':')[0] + ':6790');
//The .split(':')[0] is to remove the port number from the hostname.

wsc.onopen = function() {
    console.log("Connected to server!");
}

var currentGameCode = "";

wsc.onmessage = function(message) {
    console.log(message.data);
    var parsedData = JSON.parse(message.data);
    if (parsedData.type === 'codeExists') {
        var gameCodeElem = document.getElementById('joinCodeContainer');
        var nameElem = document.getElementById('nameContainer');

        gameCodeElem.style.display = "none";
        nameElem.style.display = "flex";
        
        currentGameCode = parsedData.gameCode;
    } else if (parsedData.type === 'codeError') {
        shakeElement(document.getElementById('joinCode'));
    } else if (parsedData.type === 'nameError') {
        shakeElement(document.getElementById('nameInput'));
    } else if (parsedData.type === 'nameSet') {
        var nameElem = document.getElementById('nameContainer');
        var gameElem = document.getElementById('gameContainer');

        nameElem.style.display = "none";
        gameElem.style.display = "inline-block";

        var gameCode = document.getElementById('gameCode');
        gameCode.innerHTML = parsedData.gameCode;

        updateUsers(parsedData.users);
    } else if (parsedData.type === 'updateUsers') {
        updateUsers(parsedData.users);
    } else if (parsedData.type === 'hostLeft') {
        var gameElem = document.getElementById('gameContainer');
        var joinCodeElem = document.getElementById('joinCodeContainer');

        gameElem.style.display = "none";
        joinCodeElem.style.display = "flex";
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

function joinGame(gameCode) {
    var gameCode = gameCode.trim();

    if (gameCode === "") {
        shakeElement(document.getElementById('joinCode'));
        return;
    }

    wsc.send(JSON.stringify({
        type: 'joinGame',
        gameCode: gameCode
    }));
}

function setName(name) {
    var name = name.trim();

    if(name.length === 0) {
        shakeElement(document.getElementById('nameInput'));
        return;
    }

    wsc.send(JSON.stringify({
        type: 'setName',
        name: name,
        gameCode: currentGameCode
    }));
}

function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(function() {
        element.classList.remove('shake');
    }, 1000);
}