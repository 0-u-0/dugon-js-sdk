import sdpTransform from 'sdp-transform';

import { remoteSdpGen, getDtls, getProduceData } from './utils';
import AsyncQueue from './asyncQueue';
import Sender from './sender';

import Transport from './transport';

export default class Publisher extends Transport {
  constructor() {
    super();

    this.senders = [];

    this.asyncQueue = new AsyncQueue();
  }

  async init(tracks) {
    //配置重要
    this.pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require', sdpSemantics: "unified-plan" });

    this.pc.onconnectionstatechange = event => {
      switch (this.pc.connectionState) {
        case "connected":

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

    for (let t of tracks) {
      const transceiver = await this.pc.addTransceiver(t, {
        direction: 'sendonly',
        // streams: [t.stream]
      });
      const sender = new Sender(t, transceiver);
      this.senders.push(sender);
    }

    let localSdp = await this.pc.createOffer();
    let localSdpObj = sdpTransform.parse(localSdp.sdp);
    await this.pc.setLocalDescription(localSdp);

    for (let m of localSdpObj.media) {
      for (let s of this.senders) {
        if (m.mid == s.mid) {
          s.ssrcs = m.ssrcs;
          s.ssrcGroups = m.ssrcGroups;
        }
      }
    }

    let remoteSdp = remoteSdpGen(this.senders, this.remoteICECandidates, this.remoteICEParameters, this.remoteDTLSParameters);

    let remoteSdpObj = new RTCSessionDescription({
      type: 'answer',
      sdp: remoteSdp
    });
    await this.pc.setRemoteDescription(remoteSdpObj);


    // dtls
    let dtls = getDtls(localSdp.sdp);

    const dtlsParameters =
    {
      role: 'server',
      fingerprints:
        [
          {
            algorithm: dtls.type,
            value: dtls.hash
          }
        ]
    };

    this.ondtls(dtlsParameters);

    /*
    /* produce
    */

    for (let sender of this.senders) {
      const producingData = getProduceData(sender);
      if (producingData) {
        producingData.metadata = {
          test: 'test'
        };
        this.onproduce(producingData);
      }
    }

  }

  setProducerId(localId, producerId) {
    for (let sender of this.senders) {
      if (localId === sender.id) {
        sender.pid = producerId;
        return true;
      }
    }
    return false;
  }

  async send(track) {
    if (!this.asyncQueue.running) {
      const transceiver = await this.pc.addTransceiver(track, {
        direction: 'sendonly',
        // streams: [track.stream]
      });

      const sender = new Sender(track, transceiver);

      let localSdp = await this.pc.createOffer();
      let localSdpObj = sdpTransform.parse(localSdp.sdp);

      let m = localSdpObj.media[localSdpObj.media.length - 1];

      sender.ssrcs = m.ssrcs;
      sender.ssrcGroups = m.ssrcGroups

      this.senders.push(sender);

      await this.pc.setLocalDescription(localSdp);
      let remoteSdp = remoteSdpGen(this.senders, this.remoteICECandidates, this.remoteICEParameters, this.remoteDTLSParameters);

      let remoteSdpObj = new RTCSessionDescription({
        type: 'answer',
        sdp: remoteSdp
      });

      await this.pc.setRemoteDescription(remoteSdpObj);


      const producingData = getProduceData(sender);
      if (producingData) {
        this.onproduce(producingData);
      }
    } else {
      this.asyncQueue.push(this.send, track);
    }
  }

  async stopSender(track) {
    let sender = null;
    for (let s of this.senders) {
      if (track.id === s.id) {
        // sender.available = false;
        sender = s;
        this.pc.removeTrack(s.transceiver.sender);
        break;
      }
    }

    if (sender) {
      let localSdp = await this.pc.createOffer();
      // console.log(localSdp.sdp);
      let localSdpObj = sdpTransform.parse(localSdp.sdp);
      await this.pc.setLocalDescription(localSdp);

      let remoteSdp = remoteSdpGen(this.senders, this.remoteICECandidates, this.remoteICEParameters, this.remoteDTLSParameters);;

      let remoteSdpObj = new RTCSessionDescription({
        type: 'answer',
        sdp: remoteSdp
      });

      await this.pc.setRemoteDescription(remoteSdpObj);

      this.oncloseproducer(sender.pid);
    }


  }

}