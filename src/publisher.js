import sdpTransform from 'sdp-transform';

import { remoteSdpGen, getDtls, getSenderData } from './utils';
import AsyncQueue from './asyncQueue';
import Sender from './sender';

import Transport from './transport';

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

  getLocalSdpData(sender, localSdp) {
    let localSdpObj = sdpTransform.parse(localSdp.sdp);

    for (let m of localSdpObj.media) {
      if (m.mid == sender.mid) {
        sender.ssrcs = m.ssrcs;
        sender.ssrcGroups = m.ssrcGroups;
      }
    }

    if (false === this.isGotDtls) {
      this.isGotDtls = true;

      this.localDTLSParameters = getDtls(localSdpObj);

      this.ondtls(this.localDTLSParameters);

    }
  }

  send(track) {
    this.asyncQueue.push(this, this._send, track);
  }

  async _send(track) {
    const transceiver = await this.pc.addTransceiver(track, {
      direction: 'sendonly',
      //TODO: streams: [t.stream]
    });
    const sender = new Sender(track, transceiver);
    this.senders.push(sender);

    const localSdp = await this.pc.createOffer();
    await this.pc.setLocalDescription(localSdp);//mid after setLocalSdp

    this.getLocalSdpData(sender, localSdp);

    let remoteSdp = remoteSdpGen(this.senders, this.remoteICECandidates, this.remoteICEParameters, this.remoteDTLSParameters);

    await this.pc.setRemoteDescription(remoteSdp);


    const producingData = getSenderData(sender);
    if (producingData) {
      producingData.metadata = {
        test: 'test'
      };
      this.onsender(producingData, sender);
    }

  }

  stopSender(sender) {
    this.asyncQueue.push(this, this._stopSender, sender);
  }
  async _stopSender(sender) {
    //TODO: check sender 
    if (sender && sender.senderId != 0) {
      this.pc.removeTrack(sender.transceiver.sender);

      let localSdp = await this.pc.createOffer();

      let localSdpObj = sdpTransform.parse(localSdp.sdp);
      await this.pc.setLocalDescription(localSdp);
      let remoteSdp = remoteSdpGen(this.senders, this.remoteICECandidates, this.remoteICEParameters, this.remoteDTLSParameters, sender);
      await this.pc.setRemoteDescription(remoteSdp);

      this.onsenderclosed(sender.senderId);
    }
  }

}