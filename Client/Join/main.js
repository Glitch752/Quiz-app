// var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws');
var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.split(':')[0] + ':6790');
//The .split(':')[0] is to remove the port number from the hostname.

wsc.onopen = function() {
    console.log("Connected to server!");
}

var currentGameCode = "";

var answerSelected = false;
var canAnswer = false;

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
        var questionsElement = document.getElementById('questions');

        gameElem.style.display = "none";
        questionsElement.style.display = "none";
        joinCodeElem.style.display = "flex";
    } else if(parsedData.type === 'question') {
        answerSelected = false;

        var gameContainer = document.getElementById('gameContainer');
        var questionContainer = document.getElementById('questionContainer');

        gameContainer.style.display = "none";
        questionContainer.style.display = "inline-block";

        var questionText = document.getElementById('questionText');
        questionText.innerHTML = parsedData.question.text;

        var questionAnswers = document.getElementById('questionAnswers');
        questionAnswers.innerHTML = "";

        var answers = parsedData.question.answers;
        for(var i = 0; i < answers.length; i++) {
            questionAnswers.innerHTML += `
                <div class="question-answer" onclick="SelectAnswer(${i})" id="answer${i}">${answers[i].text}</div>
            `;
        }

        canAnswer = true;
    } else if(parsedData.type === "questionFinished") {
        var answers = parsedData.answers;

        for(var i = 0; i < answers.length; i++) {
            var answer = answers[i];
            var answerElem = document.getElementById('answer' + i);

            if(answer) {
                answerElem.classList.add('correct');
            } else {
                answerElem.classList.add('wrong');
            }
        }

        canAnswer = false;
    }
}

function SelectAnswer(index) {
    if(!canAnswer) return
    if(answerSelected === false) {
        answerSelected = index;
        wsc.send(JSON.stringify({
            type: 'selectAnswer',
            answer: index,
            gameCode: currentGameCode
        }));
        var answerElem = document.getElementById('answer' + index);
        answerElem.classList.add('selected');
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