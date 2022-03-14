// var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws');
var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.split(':')[0] + ':6790');
//The .split(':')[0] is to remove the port number from the hostname.

wsc.onopen = function() {
    console.log("Connected to server!");
    wsc.send(JSON.stringify({
        type: 'getQuizzes',
    }));
}

wsc.onmessage = function(message) {
    var parsedData = JSON.parse(message.data);
    if (parsedData.type === 'quizzes') {
        var quizzes = parsedData.quizzes;

        var contentMenu = document.getElementById('contentMenu');

        contentMenu.innerHTML = "";
        for(var i = 0; i < quizzes.length; i++) {
            var quiz = quizzes[i];
            contentMenu.innerHTML += `
                <div class="quiz">
                    <span class="quiz-name">${quiz.name}</span>
                    <span class="quiz-description">${quiz.description}</span>
                    <div class="quiz-options">
                        <button class="quiz-button quiz-view" onclick="ViewQuiz('${quiz.id}')">View</button>
                        <button class="quiz-button quiz-host" onclick="HostQuiz('${quiz.id}')">Host</button>
                    </div>
                </div>
            `;
        }
    }
}

function ViewQuiz(id) {
    window.location.href += `View/?id=${id}`;
}

function HostQuiz(id) {
    window.location.href += `Host/?id=${id}`;
}