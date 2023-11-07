//MOVE {"x":1,"y":0} {"x":0,"y":1}

const dgram = require('dgram');
const readline = require('readline');
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
    prompt: 'Enter command (MOVE, QUIT, ENTER): '
});

reader.prompt();

reader.on('line', (line) => {
    line = line.trim();
    if (/^MOVE/.test(line) || line === 'QUIT' || line === 'ENTER') {
        const message = Buffer.from(line);
        client.send(message, serverPort, serverHost, (err) => {
            if (err) {
                console.error(`Send error: ${err}`);
                client.close();
            } else {
                console.log("Message sent successfully.");
            }
        });

        if (line === 'QUIT') {
            reader.close();
        }
    } else {
        console.log("Invalid command. Valid commands are MOVE, QUIT, and ENTER.");
        reader.prompt();
    }
});

reader.on('close', () => {
    console.log('Closing client.');
    client.close();
});