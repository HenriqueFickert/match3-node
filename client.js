const Package = require('./classes/package');
const REQUEST_TYPES = require('./classes/request-type');

const readline = require('readline');
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const serverHost = '127.0.0.1';
const serverPort = 3000;

var packagesSent = [];
var packagesReceived = [];
var packageSequence = 1;
var latestAck = 0;
var messageBuffered = '';

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
    let object = new Package(packageSequence, latestAck, line, REQUEST_TYPES.REQ);
    sendMessage(JSON.stringify(object));
});

function sendMessage(message) {
    const msgBuffer = sendMessageBufferHandler(message);

    console.log(message);

    client.send(msgBuffer, 0, msgBuffer.length, serverPort, serverHost, (err) => {
        if (err) {
            console.error(`Error sending message to ${serverHost}:${serverHost}: ${err}`);
        } else {
            packagesSent.push(JSON.parse(message));
            packageSequence++;
        }
    });
}

client.on('message', (msg) => {
    receivedMessage(msg);
});

function receivedMessage(message) {
    if (!receivedMessageBufferHandler(message))
        return;

    if (!packagesReceived[packagesReceived.length - 1])
        return;

    console.log("Server: ", packagesReceived[packagesReceived.length - 1]);
}

function receivedMessageBufferHandler(message) {
    messageBuffered += message;

    if (messageBuffered.includes('|')) {
        let messageParts = messageBuffered.split('|');
        messageBuffered = messageParts.pop();

        messageParts.forEach(part => {
            if (!discartableMessageHandler(part))
                return false;
        });

        return true;
    }
    return false;
}

function discartableMessageHandler(messagePart) {
    try {
        let object = JSON.parse(messagePart);

        if (!object.protocolId || object.protocolId !== 'MRQST')
            return false;

        if (object.type === REQUEST_TYPES.RESEND) {
            resendPackage(object.ack);
            return false;
        }

        if (object.sequence === latestAck + 1) {
            latestAck = object.sequence;
            addToReceivedPackages(object);
        } else if (object.sequence > latestAck + 1) {
            requestMissingPackage();
            return false;
        }

        return true;
    } catch (e) {
        console.error('Error parsing message:', e);
        return false;
    }
}

function addToReceivedPackages(object) {
    if (!packagesReceived.some(item => item.sequence === object.sequence)) {
        packagesReceived.push(object);
        packagesReceived.sort((a, b) => a.sequence - b.sequence);
    }
}

function requestMissingPackage() {
    let requestResend = new Package(packageSequence, latestAck, '', REQUEST_TYPES.RESEND);
    sendMessage(JSON.stringify(requestResend));
}

function resendPackage(ack) {
    if (packagesSent.length > 0) {
        let lostPackage = packagesSent.find(x => x.sequence === ack + 1);
        console.log(lostPackage);
        sendMessage(JSON.stringify(lostPackage));
    }
}

function sendMessageBufferHandler(message) {
    let content = Buffer.from(`${message}|`);
    return content;
}