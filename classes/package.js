class Package {
    constructor(sequence, ack, data, type){
        this.protocolId = "MRQST";
        this.sequence = sequence;
        this.ack = ack;
        this.type = type;
        this.packageData = data;
    }
}

module.exports = Package;