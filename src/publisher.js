import sdpTransform from 'sdp-transform';

import { pubRemoteSdpGen, getDtls, getSenderData } from './utils';
import AsyncQueue from './asyncQueue';
import Sender from './sender';

import Transport from './transport';
import Media from './media';

export default class Publisher extends Transport {
  constructor(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);

    this.senders = [];

    this.asyncQueue = new AsyncQueue();
    // new 0 , initing 1 , inited 2 , ready 3
    this.state = 0;

    this.isGotDtls = false;

    this.localDTLSParameters = null;
  }

  init() {
    //配置重要
    this.pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require', sdpSemantics: "unified-plan" });

    this.pc.onconnectionstatechange = event => {
      switch (this.pc.connectionState) {
        case "connected":
          this.state = 3;
          break;
        case "disconnected":
        case "failed":
          // One or more transports has terminated unexpectedly or in an error
          break;
        case "closed":
          // The connection has been closed
          break;
      }
    }
  }

  checkSender(senderId) {
    for (let sender of this.senders) {
      if ((senderId === sender.senderId) && sender.available) {
        return sender
      }
    }
    return null;
  }

  getLocalSdpData(sender, localSdp, codecCap) {
    let localSdpObj = sdpTransform.parse(localSdp.sdp);

    sender.media = Media.createMedia(sender.mid, 'recv' ,codecCap, localSdpObj);

    if (false === this.isGotDtls) {
      this.isGotDtls = true;

      this.localDTLSParameters = getDtls(localSdpObj);

      this.ondtls(this.localDTLSParameters);
    }
  }

  send() {
    this.asyncQueue.push(this, this._send, [...arguments]);
  }

  async _send(track, codecCap) {
    const transceiver = await this.pc.addTransceiver(track, {
      direction: 'sendonly',
    });
    const sender = new Sender(track, transceiver);
    this.senders.push(sender);

    const localSdp = await this.pc.createOffer();
    await this.pc.setLocalDescription(localSdp);//mid after setLocalSdp

    this.getLocalSdpData(sender, localSdp, codecCap);

    let remoteSdp = pubRemoteSdpGen(this.senders, this.remoteICECandidates, this.remoteICEParameters, this.remoteDTLSParameters);

    await this.pc.setRemoteDescription(remoteSdp);

    console.log(sender.media);
    const producingData = sender.media.toRtpParameters();
    console.log(producingData);
    if (producingData) {
      //TODO: handle metadata
      producingData.metadata = {
        test: 'test'
      };
      this.onsender(producingData, sender);
    }

  }

  stopSender(senderId) {
    this.asyncQueue.push(this, this._stopSender, [senderId]);
  }

  async _stopSender(senderId) {
    //TODO: check sender 
    for (let sender of this.senders) {
      if (sender.senderId === senderId) {
        this.pc.removeTrack(sender.transceiver.sender);

        let localSdp = await this.pc.createOffer();

        let localSdpObj = sdpTransform.parse(localSdp.sdp);
        await this.pc.setLocalDescription(localSdp);
        let remoteSdp = pubRemoteSdpGen(this.senders, this.remoteICECandidates, this.remoteICEParameters, this.remoteDTLSParameters, sender);
        await this.pc.setRemoteDescription(remoteSdp);

        this.onsenderclosed(sender.senderId);
      }
    }
  }
}