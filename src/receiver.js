export default class Receiver {
  constructor(senderId, tokenId, receiverId, kind, rtpParameters, metadata) {
    this.senderId = senderId;
    this.tokenId = tokenId;
    this.receiverId = receiverId;
    this.rtpParameters = rtpParameters;

    this.kind = kind;

    this.metadata = metadata;

    this.active = false;
  }
}
