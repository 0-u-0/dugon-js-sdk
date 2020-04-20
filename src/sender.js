export default class Sender {
  constructor(track, transceiver) {
    this.track = track;
    this.transceiver = transceiver;

    this.senderId = 0;
    
    this.media = null;
  }

  get id() {
    return this.track.id;
  }

  get kind() {
    return this.track.kind;
  }

  // defined after setLocalDescription
  get mid() {
    return this.transceiver.mid;
  }

  get available() {
    return !(this.transceiver.direction === 'inactive');
  }

  get isStopped() {
    return this.transceiver.stopped;
  }

  toSdp(iceParameters, candidates){
    return this.media.toSdp2(iceParameters, candidates,this.available);
  }

}