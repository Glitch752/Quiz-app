var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws');
// var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.split(':')[0] + ':6790');
//The .split(':')[0] is to remove the port number from the hostname.

wsc.onopen = function() {
    console.log("Connected to server!");
}

var questions = [];
var quizId = null;

wsc.onmessage = function(message) {
    var parsedData = JSON.parse(message.data);
    if(parsedData.type === "quizCreated") {
        console.log(parsedData.id);
        var createQuizContainer = document.getElementById("createQuizContainer");
        var quizCreationContainer = document.getElementById("quizCreationContainer");

        createQuizContainer.style.display = "none";
        quizCreationContainer.style.display = "inline-block";

        var quizCreationTopName = document.getElementById("quizCreationTopName");
        quizCreationTopName.innerHTML = parsedData.name;

        var quizCreationTopDescription = document.getElementById("quizCreationTopDescription");
        quizCreationTopDescription.innerHTML = parsedData.description;

        quizId = parsedData.id;
    }
}

function createQuiz() {
    var isPublic = document.getElementById('quizIsPublic').checked;
    var quizName = document.getElementById('createQuizName').value;
    var quizDescription = document.getElementById('createQuizDescription').value;

    var quizName = quizName.trim();
    var quizDescription = quizDescription.trim();

    if(quizName === "") {
        shakeElement(document.getElementById('createQuizName'));
        if(quizDescription === "") {
            shakeElement(document.getElementById('createQuizDescription'));
        }
        return;
    }
    if(quizDescription === "") {
        shakeElement(document.getElementById('createQuizDescription'));
        return;
    }

    wsc.send(JSON.stringify({
        type: 'createQuiz',
        name: quizName,
        description: quizDescription,
        public: isPublic
    }));
}

function updateQuestions() {
    var quizCreationQuestions = document.getElementById("quizCreationQuestions");

    quizCreationQuestions.innerHTML = "";
    for(var i = 0; i < questions.length; i++) {
        quizCreationQuestions.innerHTML += `
            <div class="quiz-creation-question">
                <input type="text" class="quiz-creation-question-text" iD="quiz${i}QuestionText" value="${questions[i].text}" placeholder="Enter question text" maxlength="50" onchange="updateQuestionName(${i})">
                <span class="quiz-creation-question-delete" onclick="deleteQuestion(${i})">X</span>
                <div class="quiz-creation-answers">
                    ${questions[i].answers.map(function(answer, index) {
                        return `
                            <div class="quiz-creation-answer">
                                <input type="text" class="quiz-creation-answer-input" id="quiz${i}Answer${index}" value="${answer.text}" placeholder="Enter answer text" maxlength="50" onchange="updateAnswer(${i}, ${index})">
                                ${
                                    answer.correct ? 
                                    `<input type="checkbox" class="quiz-creation-answer-correct" id="quiz${i}Correct${index}" name="quiz${i}Correct${index}" onchange="updateAnswer(${i}, ${index})" checked>` : 
                                    `<input type="checkbox" class="quiz-creation-answer-correct" id="quiz${i}Correct${index}" name="quiz${i}Correct${index}" onchange="updateAnswer(${i}, ${index})">`
                                }
                                <label for="quiz${i}Correct${index}">Correct</label>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }
}

function saveQuiz() {
    wsc.send(JSON.stringify({
        type: 'saveQuiz',
        questions: questions,
        quizId: quizId
    }));
}

function addQuestion() {
    var newQuestion = {
        text: "Question " + (questions.length + 1),
        answers: [
            {text: "Answer 1", correct: false},
            {text: "Answer 2", correct: false},
            {text: "Answer 3", correct: false},
            {text: "Answer 4", correct: false},
        ]
    };
    questions.push(newQuestion);
    updateQuestions();
    saveQuiz();
}

function updateAnswer(questionIndex, answerIndex) {
    var answer = questions[questionIndex].answers[answerIndex];
    answer.text = document.getElementById(`quiz${questionIndex}Answer${answerIndex}`).value;
    answer.correct = document.getElementById(`quiz${questionIndex}Correct${answerIndex}`).checked;
    saveQuiz();
}

function updateQuestionName(questionIndex) {
    questions[questionIndex].text = document.getElementById(`quiz${questionIndex}QuestionText`).value;
    saveQuiz();
}

function deleteQuestion(index) {
    questions.splice(index, 1);
    updateQuestions();
    saveQuiz();
}

function shakeElement(element) {
    element.classList.add("shake");
    setTimeout(function() {
        element.classList.remove("shake");
    }, 1000);
}