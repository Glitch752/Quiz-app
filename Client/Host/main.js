var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws');
// var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.split(':')[0] + ':6790');
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

var gameUsers = [];
var gameAnswers = [];

var questionTime = 5000;

var questionTimerInterval = false, inBetweenQuestionInterval = false;

//In milliseconds, how long to wait before decrementing the timer left. All numbers add up to the same time, but smaller numbers are more accurate.
var timerStep = 20; 

wsc.onmessage = function(message) {
    var parsedData = JSON.parse(message.data);
    if (parsedData.type === 'gameCode') {
        var gameCode = document.getElementById('gameCode');
        gameCode.innerHTML = parsedData.gameCode;
        currentGameCode = parsedData.gameCode;
    } else if(parsedData.type === 'updateUsers') {
        updateUsers(parsedData.users);
    } else if(parsedData.type === 'question') {
        clearInterval(inBetweenQuestionInterval);
        inBetweenQuestionInterval = false;

        var gameContainer = document.getElementById('gameContainer');
        var questionContainer = document.getElementById('questionContainer');
        var inBetweenQuestionsElement = document.getElementById('inBetweenQuestionsContainer');

        gameContainer.style.display = "none";
        inBetweenQuestionsElement.style.display = "none";
        questionContainer.style.display = "inline-block";

        var questionText = document.getElementById('questionText');
        questionText.innerHTML = parsedData.question.text;

        var questionAnswers = document.getElementById('questionAnswers');
        questionAnswers.innerHTML = "";

        var answers = parsedData.question.answers;

        gameAnswers = answers;

        for(var i = 0; i < answers.length; i++) {
            questionAnswers.innerHTML += `
                <div class="question-answer">${answers[i].text}</div>
            `;
        }

        //Reset the answer of each user
        for(var i = 0; i < gameUsers.length; i++) {
            gameUsers[i].answer = null;
        }

        var timerLeft = document.getElementById('questionTime');

        timerLeft.style.setProperty('--timer-left', 1);

        questionTimerInterval = setInterval(function() {
            timerLeft.style.setProperty('--timer-left', (timerLeft.style.getPropertyValue('--timer-left') - (timerStep / questionTime)));

            if(timerLeft.style.getPropertyValue('--timer-left') <= 0) {
                timerLeft.style.setProperty('--timer-left', 0);
                clearInterval(questionTimerInterval);

                if(inBetweenQuestionInterval === false) {
                    finishQuestion();
                }
            }
        }, timerStep);

        totalQuestionReplies = 0;

        updateReplies();
    } else if(parsedData.type === 'answerSelected') {
        gameUsers[parsedData.user].answer = parsedData.answer;
        gameUsers[parsedData.user].questionTime = parsedData.questionTime;

        totalQuestionReplies++;

        updateReplies();
    } else if(parsedData.type === 'endGame') {
        var questionsElement = document.getElementById('questionContainer');
        var endGameElement = document.getElementById('endGameContainer');
        var inBetweenQuestionsElement = document.getElementById('inBetweenQuestionsContainer');

        questionsElement.style.display = "none";
        inBetweenQuestionsElement.style.display = "none";
        endGameElement.style.display = "inline-block";

        var podiumFirst = document.getElementById('podiumFirst');
        var podiumSecond = document.getElementById('podiumSecond');
        var podiumThird = document.getElementById('podiumThird');
        var endGameScoresList = document.getElementById('endGameScoresList');

        var scores = parsedData.scores;

        podiumFirst.style.display = "inline-block";
        podiumSecond.style.display = "none";
        podiumThird.style.display = "none";
        endGameScoresList.style.display = "none";

        document.getElementById('podiumFirstName').innerHTML = scores[0]?.name;
        document.getElementById('podiumFirstScore').innerHTML = scores[0]?.score;

        if(scores.length > 1) {
            podiumSecond.style.display = "inline-block";
            document.getElementById('podiumSecondName').innerHTML = scores[1].name;
            document.getElementById('podiumSecondScore').innerHTML = scores[1].score;
        }
        if(scores.length > 2) {
            podiumThird.style.display = "inline-block";
            document.getElementById('podiumThirdName').innerHTML = scores[2].name;
            document.getElementById('podiumThirdScore').innerHTML = scores[2].score;
        }
        if(scores.length > 3) {
            endGameScoresList.style.display = "block";

            var otherScores = scores.slice(3);

            for(var i = 0; i < otherScores.length; i++) {
                endGameScoresList.innerHTML += `
                    <div class="end-game-score">
                        <div class="end-game-score-place">${ordinalNumber(i + 4)}</div>
                        <div class="end-game-score-name">${otherScores[i].name}</div>
                        <div class="end-game-score-score">${otherScores[i].score}</div>
                    </div>
                `;
            }
        }
    }
}

function ordinalNumber(n) {
    return n+(["st","nd","rd"][((n+90)%100-10)%10-1]||"th");
}

function updateReplies() {
    var questionAnswerCounterText = document.getElementById('questionAnswerCounterText');
    var questionAnswerCounterTotal = document.getElementById('questionAnswerCounterTotal');

    questionAnswerCounterText.innerHTML = totalQuestionReplies;
    questionAnswerCounterTotal.innerHTML = questionReplyAmount;

    if(totalQuestionReplies >= questionReplyAmount) {
        finishQuestion();
    }
}

function finishQuestion() {
    clearInterval(questionTimerInterval);
    questionTimerInterval = false;

    wsc.send(JSON.stringify({
        type: 'finishQuestion',
        gameCode: currentGameCode
    }));

    //Loop through each user and add to their score based on their answer
    for(var i = 0; i < gameUsers.length; i++) {
        if(gameUsers[i].answer !== null) {
            var answer = gameUsers[i].answer;
            var questionAnswer = gameAnswers[answer];

            console.log(gameUsers[i]);

            var scoreIncrease = 0;

            if(questionAnswer.correct) {
                var time = gameUsers[i].questionTime;

                scoreIncrease = Math.round(100 - ((time / questionTime) * 100));
            }
            gameUsers[i].score += scoreIncrease;
        }
    }

    updateScores(gameUsers);

    var inBetweenQuestionsScoresElement = document.getElementById('inBetweenQuestionsScores');
    var questionsElement = document.getElementById('questionContainer');
    var inBetweenQuestionsElement = document.getElementById('inBetweenQuestionsContainer');

    questionsElement.style.display = "none";
    inBetweenQuestionsElement.style.display = "inline-block";
    
    var scores = gameUsers.sort(function(a, b) {return b.score - a.score;});
        
    inBetweenQuestionsScoresElement.innerHTML = "";

    for(var i = 0; i < scores.length; i++) {
        inBetweenQuestionsScoresElement.innerHTML += `
            <div class="in-between-questions-score">
                <div class="in-between-questions-score-place">${ordinalNumber(i + 1)}</div>
                <div class="in-between-questions-score-name">${scores[i].name}</div>
                <div class="in-between-questions-score-score">${scores[i].score}</div>
            </div>
        `;
    }

    var timerLength = 5000;

    var timerLeft = document.getElementById('inBetweenQuestionsTimer');

    timerLeft.style.setProperty('--timer-left', 1);

    inBetweenQuestionInterval = setInterval(function() {
        timerLeft.style.setProperty('--timer-left', (timerLeft.style.getPropertyValue('--timer-left') - (timerStep / timerLength)));

        if(timerLeft.style.getPropertyValue('--timer-left') <= 0) {
            clearInterval(inBetweenQuestionInterval);

            if(questionTimerInterval === false) {
                timerLeft.style.setProperty('--timer-left', 0);

                wsc.send(JSON.stringify({
                    type: 'newQuestion',
                    gameCode: currentGameCode
                }));
            }
        }
    }, timerStep);
}

function updateUsers(users) {
    var gameUsersElem = document.getElementById("gameUsers");
    gameUsersElem.innerHTML = "";

    questionReplyAmount = users.length;

    gameUsers = users;

    for(var i = 0; i < users.length; i++) {
        gameUsersElem.innerHTML += `
            <div class="game-user">${users[i].name}</div>
        `
    }
}

function updateScores(users) {
    wsc.send(JSON.stringify({
        type: 'updateScores',
        scores: users.map(function(user) {return user.score}),
        gameCode: currentGameCode
    }));
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