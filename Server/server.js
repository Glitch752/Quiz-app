var websocket = require('ws');

var wss = new websocket.Server({ port: 6790 });

const admin = require('firebase-admin');
const { parse } = require('dotenv');

require('dotenv').config();

// Initialize Firebase
admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // replace `\` and `n` character pairs w/ single `\n` character
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

const quizzesRef = db.ref('/quizzes');

var currentGames = {};

wss.on("connection", function(ws) {
    ws.on("message", function(message) {
        var parsedData = JSON.parse(message);
        if (parsedData.type === 'getQuizzes') {
            quizzesRef.once('value', (snapshot) => {
                var quizzes = snapshot.val();
                var parsedQuizzes = quizzes.filter(quiz => quiz.public);
                ws.send(JSON.stringify({
                    type: 'quizzes',
                    quizzes: parsedQuizzes
                }));
            }, (errorObject) => {
                console.log('The read failed: ' + errorObject.name);
            });
        } else if(parsedData.type === "getQuestions") {
            var quizId = parsedData.id;
            var quizRef = db.ref('/questions/' + quizId);
            quizRef.once('value', (snapshot) => {
                var questions = snapshot.val();
                ws.send(JSON.stringify({
                    type: 'questions',
                    questions: questions
                }));
            }, (errorObject) => {
                console.log('The read failed: ' + errorObject.name);
            });
        } else if(parsedData.type === "joinGame") {
            var gameCode = parsedData.gameCode;

            if(!currentGames[gameCode]) {
                ws.send(JSON.stringify({
                    type: 'codeError'
                }));
                return;
            }

            if(!currentGames[gameCode].canJoin) {
                ws.send(JSON.stringify({
                    type: 'codeError'
                }));
                return;
            }

            ws.send(JSON.stringify({
                type: 'codeExists',
                gameCode: gameCode
            })); 
        } else if(parsedData.type === "setName") {
            var name = parsedData.name;
            var gameCode = parsedData.gameCode;

            //Check if name doesn't already exist
            var clients = currentGames[gameCode].clients;
            var clientNames = clients.map(client => client.name);

            if(clientNames.includes(name)) {
                ws.send(JSON.stringify({
                    type: 'nameError'
                }));
                return;
            }
            
            currentGames[gameCode].clients.push({ws: ws, name: name, score: 0, startTimestamp: null});

            updateUsers(currentGames[gameCode], ws);

            ws.send(JSON.stringify({
                type: 'nameSet',
                name: name,
                users: clients.map(function(client) {return {name: client.name, score: client.score}}),
                gameCode: gameCode
            }));
        } else if(parsedData.type === "hostQuiz") {
            var id = parsedData.id;
            
            //generate random 8-digit game code with letters and numbers
            var serverCode = '';
            for (var i = 0; i < 8; i++) {
                var char = Math.floor(Math.random() * 36).toString(36);
                if (i === 0 && char === '0') {
                    char = '1';
                }
                serverCode += char;
            }

            currentGames[serverCode] = {clients: [], quizId: id, host: {ws: ws}, canJoin: true, questionIndex: 0, questions: []};

            ws.send(JSON.stringify({
                type: 'gameCode',
                gameCode: serverCode
            }));
        } else if (parsedData.type === "startGame") {
            currentGames[parsedData.gameCode].canJoin = false;

            var clients = currentGames[parsedData.gameCode].clients;
            var quizId = currentGames[parsedData.gameCode].quizId;
            var quizRef = db.ref('/questions/' + quizId);
            quizRef.once('value', (snapshot) => {
                var questions = snapshot.val();
                var shuffledQuestions = shuffle(questions);

                currentGames[parsedData.gameCode].questions = shuffledQuestions;

                askQuestion(parsedData.gameCode);
            }, (errorObject) => {
                console.log('The read failed: ' + errorObject.name);
            });
        } else if (parsedData.type === "selectAnswer") {
            var clientIndex = currentGames[parsedData.gameCode].clients.findIndex(client => client.ws === ws);
            var client = currentGames[parsedData.gameCode].clients[clientIndex];

            currentGames[parsedData.gameCode].host.ws.send(JSON.stringify({
                type: 'answerSelected',
                answer: parsedData.answer,
                questionTime: new Date().getTime() - client.startTimestamp,
                user: clientIndex
            }));
        } else if (parsedData.type === "newQuestion") {
            //Check if the client is the host
            if(currentGames[parsedData.gameCode] !== undefined) {
                if(currentGames[parsedData.gameCode].host.ws !== ws) {
                    return
                }
                askQuestion(parsedData.gameCode);
            }
        } else if (parsedData.type === "updateScores") {
            var scores = parsedData.scores;
            var server = currentGames[parsedData.gameCode];

            for(user in server.clients) {
                server.clients[user].score = scores[user];
            }
        } else if (parsedData.type === "finishQuestion") {
            var server = currentGames[parsedData.gameCode];
            var clients = server.clients;

            for(client in clients) {
                clients[client].ws.send(JSON.stringify({
                    type: 'questionFinished',
                    answers: server.questions[server.questionIndex - 1].answers.map(function(question) {return question.correct})
                }));
            }
        }
    });
    ws.on('close', function() {
        var gameCode = removeClient(ws);
        if(gameCode !== false) {
            updateUsers(currentGames[gameCode]);
        }
    });
});

function askQuestion(serverCode) {
    var currentGame = currentGames[serverCode];
    var question = currentGame.questions[currentGame.questionIndex];
    var clients = currentGame.clients;

    currentGame.questionIndex++;

    if(currentGame.questionIndex === currentGame.questions.length) {
        endGame(serverCode);
        return;
    }

    //Make sure NOT to send the clients the correct answer
    var parsedQuestion = {
        text: question.text,
        answers: question.answers.map(answer => {return {text: answer.text}})
    }

    clients.forEach(function(client) {
        client.startTimestamp = new Date().getTime();
        client.ws.send(JSON.stringify({
            type: 'question',
            question: parsedQuestion
        }));
    });

    currentGame.host.ws.send(JSON.stringify({
        type: 'question',
        question: question
    }));
}

function endGame(serverCode) {
    var currentGame = currentGames[serverCode];
    var clients = currentGame.clients;
    var scores = clients.map(function(client) {
        return {name: client.name, score: client.score};
    });

    clients.forEach(function(client) {
        client.ws.send(JSON.stringify({
            type: 'endGame',
            scores: scores
        }));
    });

    currentGame.host.ws.send(JSON.stringify({
        type: 'endGame',
        scores: scores
    }));

    delete currentGames[serverCode];
}

function shuffle(array) {
    return array.sort(() => Math.random());
}

function updateUsers(server, discludeUser = false) {
    var clients = server.clients;
    var users = clients.map(function(client) {return {name: client.name, score: 0}});
    clients.forEach(function(client) {
        if(client.ws !== discludeUser) {
            client.ws.send(JSON.stringify({
                type: 'updateUsers',
                users: users
            }));
        }
    });
    var hostUsers = clients.map(function(client) {return {name: client.name, score: 0, answer: null}});
    server.host.ws.send(JSON.stringify({
        type: 'updateUsers',
        users: hostUsers
    }));
}

//This function removes the client from the server it's in
function removeClient(client) {
    for(var gameCode in currentGames) {
        var clients = currentGames[gameCode].clients;
        var index = clients.findIndex(c => c.ws === client);
        if(index !== -1) {
            clients.splice(index, 1);
            return gameCode;
        }

        if(currentGames[gameCode].host.ws === client) {
            delete currentGames[gameCode];
            for(var i = 0; i < clients.length; i++) {
                clients[i].ws.send(JSON.stringify({
                    type: 'hostLeft'
                }));
            }
            return false;
        }
    }
    return false;
}

console.log("Server started");