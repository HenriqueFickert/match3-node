const REQUEST_TYPES = require('./request-type');
const Package = require('./package');

class ClientManager {

    constructor(senderInfo, server) {
        this.rinfo = senderInfo;
        this.server = server;
        this.packagesSent = [];
        this.packagesRecived = [];
        this.localPackageSequenceNumberSent = 0;
        this.latestPackageNumerRecieved = 0;
        this.messageBuffered = '';
    }

    recievedMessage(message) {
        if (!this.recievedMessageBufferHandler(message))
            return;

        var recievedObject = this.packagesRecived[this.packagesRecived - 1];

        if (recievedObject.sequence > this.latestPackageNumerRecieved)
            this.latestPackageNumerRecieved = recievedObject.sequence;

        var object = new Package(0, 0, 'bigStringReturn()', REQUEST_TYPES.REQ);
        this.sendMessage(object);
        //Criar a logica de quando perder a mensagem e chegar uma nova solicitar a antiga 
    }

    recievedMessageBufferHandler(message) {
        this.messageBuffered += message;

        if (this.messageBuffered.endsWith('|')) {
            console.log("messageBuffered: ", this.messageBuffered);
            this.messageBuffered = this.messageBuffered.slice(0, -1);
            let validMessage = this.DiscartableMessageHandler();
            this.messageBuffered = '';
            return validMessage;
        }

        return false;
    }

    DiscartableMessageHandler() {
        let object = JSON.parse(this.messageBuffered);

        console.log(object.protocolId !== 'MRQST');
        console.log(!object.protocolId);
        console.log(!object.sequence);
        console.log(!object.ack);

        if (!object.protocolId || object.protocolId !== 'MRQST' || object.sequence >= 0 || object.ack >= 0)
            return false;

        this.packagesRecived.push(this.messageBuffered);
        return true;
    }

    sendMessage(message) {
        const msgBuffer = this.sendMessageBufferHandler(message);

        this.server.send(msgBuffer, 0, msgBuffer.length, this.rinfo.port, this.rinfo.address, (err) => {
            if (err) {
                console.error(`Error sending message to ${this.rinfo.address}:${this.rinfo.port}: ${err}`);
            } else {
                this.packagesSent.push[message];
                this.localPackageSequenceNumberSent++;
            }
        });
    }

    sendMessageBufferHandler(message) {
        let content = Buffer.from(`${message}|`);
        return content;
    }
}

module.exports = ClientManager;