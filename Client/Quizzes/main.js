var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws');
// var wsc = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.split(':')[0] + ':6790');
//The .split(':')[0] is to remove the port number from the hostname.

wsc.onopen = function() {
    console.log("Connected to server!");
}