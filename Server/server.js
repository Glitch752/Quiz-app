var websocket = require('ws');

var wss = new websocket.Server({ port: 6790 });

const admin = require('firebase-admin');

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
            
            currentGames[gameCode].clients.push({ws: ws, name: name});

            updateUsers(currentGames[gameCode], ws);

            ws.send(JSON.stringify({
                type: 'nameSet',
                name: name,
                users: clients.map(function(client) {return {name: client.name, score: 0}}),
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

            currentGames[serverCode] = {clients: [], quizId: id, host: {ws: ws}};

            ws.send(JSON.stringify({
                type: 'gameCode',
                gameCode: serverCode
            }));
        }
    });
    ws.on('close', function() {
        var gameCode = removeClient(ws);
        if(gameCode !== false) {
            updateUsers(currentGames[gameCode]);
        }
    });
});

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
    server.host.ws.send(JSON.stringify({
        type: 'updateUsers',
        users: users
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