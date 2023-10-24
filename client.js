//MOVE {"x":1,"y":0} {"x":0,"y":1}

const net = require('net');
const readline = require('readline');

const client = new net.Socket();
client.connect(3000, '127.0.0.1', () => {
    console.log('Conectado ao servidor!');
});

client.on('data', (data) => {
    console.log(data.toString());
});

client.on('close', () => {
    console.log('Conexão encerrada.');
    process.exit();
});

const reader = readline.createInterface({ input: process.stdin })
reader.on("line", (line) => {

    if (/^MOVE/.test(line) || line === "QUIT") {
        client.write(`${line}\n`);
    } else {
        console.log("Invalid command.")
    }

})

reader.on("close", () => {
    client.end();
})