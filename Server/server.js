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
        }
    });
});

console.log("Server started");