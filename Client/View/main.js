// var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws');
var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.split(':')[0] + ':6790');
//The .split(':')[0] is to remove the port number from the hostname.

wsc.onopen = function() {
    console.log("Connected to server!");

    var id = getURLParameter('id');

    if(!id) {
        id = "1";
    }

    wsc.send(JSON.stringify({
        type: 'getQuestions',
        id: id
    }));
}

wsc.onmessage = function(message) {
    var parsedData = JSON.parse(message.data);
    if (parsedData.type === 'questions') {
        var questions = parsedData.questions;
        console.log(questions);
        var contentMenu = document.getElementById('questionList');
        contentMenu.innerHTML = "";

        for(var i = 0; i < questions.length; i++) {
            var question = questions[i];
            contentMenu.innerHTML += `
                <div class="question">
                    <div class="question-title">${question.text}</div>
                    <div class="question-answers">
                        ${question.answers.map(answer => `<div class="question-answer ${answer.correct ? "correct" : ""}">${answer.text}</div>`).join('')}
                    </div>
                </div>
            `;
        }
    }
}

function hostQuiz() {
    var id = getURLParameter('id');

    if(!id) {
        id = "1";
    }

    var currentHREF = window.location.href;
    currentHREF = currentHREF.split('?')[0];
    if(currentHREF.endsWith('/')) currentHREF = currentHREF.substring(0, currentHREF.length - 1);
    window.location.href = currentHREF.split('/').slice(0, -1).join('/') + '/Host?id=' + id;
}

//Gets the value of a parameter from the URL.
function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}