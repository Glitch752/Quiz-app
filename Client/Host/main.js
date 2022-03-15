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

var currentGameCode = "";

var totalQuestionReplies = 0, questionReplyAmount = 0;

wsc.onmessage = function(message) {
    var parsedData = JSON.parse(message.data);
    if (parsedData.type === 'gameCode') {
        var gameCode = document.getElementById('gameCode');
        gameCode.innerHTML = parsedData.gameCode;
        currentGameCode = parsedData.gameCode;
    } else if(parsedData.type === 'updateUsers') {
        updateUsers(parsedData.users);
    } else if(parsedData.type === 'question') {
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
                <div class="question-answer">${answers[i].text}</div>
            `;
        }

        totalQuestionReplies = 0;

        updateReplies();
    } else if(parsedData.type === 'questionReply') {
        totalQuestionReplies = parsedData.replies;

        updateReplies();
    }
}

function updateReplies() {
    var questionAnswerCounterText = document.getElementById('questionAnswerCounterText');
    var questionAnswerCounterTotal = document.getElementById('questionAnswerCounterTotal');

    questionAnswerCounterText.innerHTML = totalQuestionReplies;
    questionAnswerCounterTotal.innerHTML = questionReplyAmount;
}

function updateUsers(users) {
    var gameUsers = document.getElementById("gameUsers");
    gameUsers.innerHTML = "";

    questionReplyAmount = users.length;

    for(var i = 0; i < users.length; i++) {
        gameUsers.innerHTML += `
            <div class="game-user">${users[i].name}</div>
        `
    }
}

function startGame() {
    wsc.send(JSON.stringify({
        type: 'startGame',
        gameCode: currentGameCode
    }));
}

function ViewQuiz(id) {
    window.location.href += `View/?id=${id}`;
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}