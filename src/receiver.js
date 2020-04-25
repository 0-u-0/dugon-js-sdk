import Media from './media';

export default class Receiver {
  constructor(mid, senderId, tokenId, receiverId, codec, metadata, iceParameters, iceCandidates) {
    this.senderId = senderId;
    this.tokenId = tokenId;
    this.receiverId = receiverId;
    this.codec = codec;

    this.metadata = metadata;

    this.active = false;
    this.mid = mid;

    this.media = Media.create(mid, codec, iceParameters, iceCandidates, receiverId);
  }

  get kind() {
    return this.codec.kind;
  }

  get senderPaused() {
    return this.codec.senderPaused;
  }

  toSdp(iceParameters, candidates) {
    return this.media.toSdp(iceParameters, candidates, this.active, this.receiverId);
  }

}
