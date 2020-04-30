import Media from './media';

export default class Receiver {
  constructor(mid, senderId, tokenId, receiverId, codec, metadata, media) {
    this.senderId = senderId;
    this.tokenId = tokenId;
    this.receiverId = receiverId;
    this.codec = codec;

    this.metadata = metadata;

    this.mid = mid;

    this.media = media;

    this.transceiver = null;
  }

  get kind() {
    return this.codec.kind;
  }

  get senderPaused() {
    return this.codec.senderPaused;
  }


}
