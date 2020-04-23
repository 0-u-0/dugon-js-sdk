
export default class Codec {
  constructor() {
    this.kind = null;
    this.payload = null;
    this.codecName = null;
    this.codecFullName = null;
    this.clockRate = null;
    this.channels = null;

    /**options */
    this.mid = null;
    this.ssrc = null;
    this.cname = null;

    this.dtx = false;
    this.senderPaused = false;

    // payload, ssrc
    this.rtx = null;

    // [{id,uri}]
    this.extensions = [];
    // {key:value}
    this.parameters = {};
    // [{type,parameter}]
    this.rtcpFeedback = [];

  }
}