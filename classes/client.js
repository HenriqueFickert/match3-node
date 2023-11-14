const REQUEST_TYPES = require('./request-type');
const Package = require('./package');

class Client {
    constructor(senderInfo, server) {
        this.rinfo = senderInfo;
        this.server = server;
        this.packagesSent = [];
        this.packagesRecived = [];
        this.packageSequence = 0;
        this.latestAck = 0;
        this.messageBuffered = '';
    }

    receivedMessage(message) {
        if (!this.receivedMessageBufferHandler(message))
            return;

        let receivedObject = this.packagesRecived[this.packagesRecived.length - 1];

        if (receivedObject.sequence > this.latestAck)
            this.latestAck = receivedObject.sequence;

        this.packagesRecived.sort(function (x, y) {
            return x.sequence - y.sequence;
        });

        console.log(this.latestAck);
        console.log(this.packageSequence);

        let object = new Package(this.packageSequence, this.latestAck, '123', REQUEST_TYPES.RES);
        this.sendMessage(JSON.stringify(object));

        // Criar a logica de quando perder a mensagem e chegar uma nova solicitar a antiga 
    }

    receivedMessageBufferHandler(message) {
        this.messageBuffered += message;

        if (this.messageBuffered.endsWith('|')) {
            this.messageBuffered = this.messageBuffered.slice(0, -1);
            let validMessage = this.DiscartableMessageHandler();
            this.messageBuffered = '';
            return validMessage;
        }

        return false;
    }

    DiscartableMessageHandler() {
        let object = JSON.parse(this.messageBuffered);

        if (!object.protocolId || object.protocolId !== 'MRQST')
            return false;

        this.packagesRecived.push(object);
        return true;
    }

    sendMessage(message) {
        const msgBuffer = this.sendMessageBufferHandler(message);

        this.server.send(msgBuffer, 0, msgBuffer.length, this.rinfo.port, this.rinfo.address, (err) => {
            if (err) {
                console.error(`Error sending message to ${this.rinfo.address}:${this.rinfo.port}: ${err}`);
            } else {
                this.packagesSent.push(message);
                this.packageSequence++;
            }
        });
    }

    sendMessageBufferHandler(message) {
        let content = Buffer.from(`${message}|`);
        return content;
    }
}

module.exports = Client;