import Socket from './socket';
import Publisher from './publisher';
import Subscriber from './subscriber';
import Transport from './transport';

const DEFAULT_VIDEO_CODEC = 'VP8'
const DEFAULT_AUDIO_CODEC = 'opus'

export default class Session {
  constructor(url, sessionId, tokenId, options = { metadata: {} }) {
    this.url = url;
    this.sessionId = sessionId;
    this.tokenId = tokenId;

    const { metadata } = options;
    this.metadata = metadata;

    this.socket = null;

    this.publisher = null;
    this.subscriber = null;

    this.codecs = null;
    //event
    this.onin = null;
    this.onout = null;
    this.onsender = null;
    this.onclose = null;
  }

  async init(options = { pub: true, sub: true }) {
    //TODO: set default value
    const { pub, sub } = options;

    this.socket = new Socket(this.url, {
      'sessionId': this.sessionId,
      'tokenId': this.tokenId,
      'metadata': this.metadata,
    });

    this.socket.onclose = _ => {
      this.onclose();
    };

    this.socket.onnotification = (event, data) => {
      this.handleNotification(event, data);
    }

    await this.socket.init();

    const transportParameters = await this.socket.request({
      event: 'join',
      data: {
        pub,
        sub,
      }
    });
    if (pub) {
      this.initTransport('pub', transportParameters.pub);
    }
    if (sub) {
      this.initTransport('sub', transportParameters.sub);
    }
    this.codecs = transportParameters.codecs;
  }

  initTransport(role, transportParameters) {
    const { id, iceCandidates, iceParameters, dtlsParameters } = transportParameters;

    if (role === 'pub') {
      this.publisher = new Publisher(id, iceCandidates, iceParameters, dtlsParameters);

      //TODO: mv to init
      this.publisher.onsenderclosed = async senderId => {
        await this.socket.request({
          event: 'unpublish',
          data: {
            transportId: this.publisher.id,
            senderId
          }
        })
      };

      this.publisher.ondtls = async dtlsParameters => {
        await this.socket.request({
          event: 'dtls',
          data: {
            transportId: this.publisher.id,
            role: 'pub',
            dtlsParameters
          }
        });
      };

      this.publisher.onsender = async (producingParameters, sender) => {
        const data = await this.socket.request({
          event: 'publish',
          data: {
            transportId: this.publisher.id,
            ...producingParameters
          }
        })
        const { senderId } = data;
        sender.senderId = senderId;
        this.onsender(sender);

      }

      //init pub
      this.publisher.init();

      this.publisher.state = 2;

    } else {
      this.subscriber = new Subscriber(id, iceCandidates, iceParameters, dtlsParameters);

      this.subscriber.ondtls = async dtlsParameters => {
        await this.socket.request({
          event: 'dtls',
          data: {
            transportId: this.subscriber.id,
            role: 'sub',
            dtlsParameters
          }
        });
      };

      this.subscriber.ontrack = (track, receiver) => {
        this.ontrack(track, receiver);
      };

      this.subscriber.onremovereceiver = receiver => {
        this.onunreceiver(receiver);
        this.socket.request({
          event: 'unsubscribe',
          data: {
            transportId: this.subscriber.id,
            senderId: receiver.senderId,
          }
        })
      };

      this.subscriber.init();

      //TODO: state change

    }

  }

  //TODO: simulcast config
  //codec , opus, VP8,VP9, H264-BASELINE, H264-CONSTRAINED-BASELINE, H264-MAIN, H264-HIGH
  async publish(track, options = {
    svc: false
  }) {
    //TODO: fix state
    if (this.publisher.state >= 2) {
      let { codec , svc = false} = options;
      if(!codec){
        if(track.kind == 'audio'){
          codec = DEFAULT_AUDIO_CODEC;
        }else if(track.kind == 'video'){
          codec = DEFAULT_VIDEO_CODEC;
        }
      }

      let codecCap = null;
      for(let c of this.codecs){
        if(c.codecName === codec ){
          codecCap = c;
        }
      }

      if(codecCap){
        this.publisher.send(track, codecCap);
      }else{
        //TODO: 
      }
    }
  }

  async unpublish(senderId) {
    this.publisher.stopSender(senderId);
  }

  async subscribe(senderId) {
    this.subscriber.receive(senderId);
  }

  async unsubscribe(senderId) {
    this.subscriber.removeReceiver(senderId);
  }

  async pause(senderId) {
    let transportId = null;
    let role = null;
    if (this.subscriber && this.subscriber.receivers.get(senderId)) {
      transportId = this.subscriber.id;
      role = 'sub';
    } else if (this.publisher && this.publisher.checkSender(senderId)) {
      transportId = this.publisher.id;
      role = 'pub';
    }

    if (transportId) {
      this.socket.request({
        event: 'pause',
        data: {
          transportId,
          senderId,
          role
        }
      })
    }
  }

  async resume(senderId) {
    let transportId = null;
    let role = null;
    if (this.subscriber && this.subscriber.receivers.get(senderId)) {
      transportId = this.subscriber.id;
      role = 'sub';
    } else if (this.publisher && this.publisher.checkSender(senderId)) {
      transportId = this.publisher.id;
      role = 'pub';
    }

    if (transportId) {
      this.socket.request({
        event: 'resume',
        data: {
          transportId,
          senderId,
          role
        }
      })
    }
  }



  handleNotification(event, data) {
    console.log('notification: ', event, data);
    switch (event) {
      case 'join': {
        let { tokenId, metadata } = data;
        this.onin(tokenId, metadata);
        break;
      };
      case 'leave': {
        let { tokenId } = data;
        //TODO: release all receiver
        if (this.subscriber) {
          this.subscriber.removeReceiverByTokenId(tokenId);
        }
        this.onout(tokenId);
        break;
      };
      case 'publish': {
        let { senderId, tokenId, metadata, parameters, receiverId } = data;
        if (this.subscriber) {
          let receiver = this.subscriber.addReceiver(senderId, tokenId, receiverId, parameters, metadata);
          this.onreceiver(receiver, tokenId, senderId, metadata);
        }

        break;
      };
      case 'unpublish': {
        let { senderId, tokenId } = data;
        if (this.subscriber) {
          this.subscriber.removeReceiver(senderId);
        }

        break;
      }
      case 'pause': {
        let { senderId } = data;
        if (this.subscriber) {
          this.subscriber.removeReceiver(senderId);
        }

        break;
      }
      case 'resume': {
        let { senderId } = data;
        if (this.subscriber) {
          this.subscriber.removeReceiver(senderId);
        }

        break;
      }
      default: {
        console.log('unknown event ', event);
      }
    }
  }

}

