const Package = require('./classes/package');
const REQUEST_TYPES = require('./classes/request-type');
const utf8EncodeText = new TextEncoder();

const readline = require('readline');
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const serverHost = '127.0.0.1';
const serverPort = 3000;

client.on('message', (msg) => {
    console.log(`Server: ${msg.toString()}`);
});

client.on('error', (err) => {
    console.error(`Client error: ${err.stack}`);
    client.close();
    process.exit();
});

client.on('close', () => {
    console.log('Socket closed.');
    process.exit();
});

const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter command:'
});

reader.prompt();

reader.on('line', (line) => {
    var object = new Package(0, 0, bigStringReturn(), REQUEST_TYPES.REQ);
    const message = Buffer.from(JSON.stringify(object));
    sendMessage(message);
});

function sendMessage(message) {
    const msgBuffer = sendMessageBufferHandler(message);

    client.send(msgBuffer, 0, msgBuffer.length, serverPort, serverHost, (err) => {
        if (err) {
            console.error(`Error sending message to ${serverHost}:${serverHost}: ${err}`);
        } else {
            console.log("Message sent successfully.");
        }
    });
}

function sendMessageBufferHandler(message) {
    let content = Buffer.from(`${message}|`);
    console.log(content);
    return content;
}

reader.on('close', () => {
    console.log('Closing client.');
    client.close();
});

function bigStringReturn() {
    return `1`
}