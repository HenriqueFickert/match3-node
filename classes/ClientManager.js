const utf8EncodeText = new TextEncoder();

class ClientManager {

    constructor(senderInfo, server){
        this.rinfo = senderInfo;
        this.server = server;
        this.packagesSent = [];
        this.packagesRecived = [];
        this.localPackageSequenceNumberSent = 0;
        this.latestPackageNumerRecieved = 0;
        this.messageBuffered = '';
    }

    recievedMessage(message){
        if (!this.recievedMessageBufferHandler(message))
            return;
    
       var recievedObject = this.packagesRecived.slice(-1);

       if (recievedObject.sequence > this.latestPackageNumerRecieved)
        this.latestPackageNumerRecieved = recievedObject.sequence;
    }

    recievedMessageBufferHandler(message){
        this.messageBuffered += message;
        console.log("Message: ",message);

        if (this.messageBuffered.endsWith('MRQST')) //ALTERAR PARA COMPARAR OS BYTES
        {
            console.log("messageBuffered: ", this.messageBuffered);
            this.messageBuffered = this.messageBuffered.slice(0, -5);
            let validMessage = this.DiscartableMessageHandler();
            this.messageBuffered = '';
            return validMessage;
        }

        return false;
    }

    DiscartableMessageHandler(){
        let object = JSON.parse(this.messageBuffered);

        if (!object.protocolId || object.protocolId !== 'MRQST' || !object.sequence || !object.ack)
            return false;
        
        this.packagesRecived.push(this.messageBuffered);
        return true;
    }

    sendMessage(message) {
        const msgBuffer = this.sendMessageBufferHandler(message);
        
        this.server.send(msgBuffer, 0, msgBuffer.length, this.rinfo.port, this.rinfo.address, (err) => {
            if (err) {
                console.error(`Error sending message to ${this.rinfo.address}:${this.rinfo.port}: ${err}`);
            }else {
                this.packagesSent.push[message];
                this.localPackageSequenceNumberSent++;
            }
        });
    }

    sendMessageBufferHandler(message){
        const byteArray = utf8EncodeText.encode(`${message}MRQST`);
        console.log(byteArray);
        let content = Buffer.from(byteArray);
        console.log(content);
        return content;
    }
}

module.exports = ClientManager;