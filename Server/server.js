var websocket = require('ws');

var wss = new websocket.Server({ port: 6790 });

wss.on("connection", function(ws) {
    ws.on("message", function(message) {
        console.log("Received: %s", message);
        var parsedData = JSON.parse(message);
        if (parsedData.type === 'getQuizzes') {
            
        }
    });
});

console.log("Server started");