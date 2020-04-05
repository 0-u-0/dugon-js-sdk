import Socket from './socket';
import Publisher from './publisher';
import Subscriber from './subscriber';
import Transport from './transport';

export default class Session {
  constructor(sessionId, tokenId, options = { url: '' }) {
    this.sessionId = sessionId;
    this.tokenId = tokenId;

    const { url } = options;
    this.url = url;

    this.socket = null;

    this.publisher = null;
    this.subscriber = null;

    //event
    this.onin = null;
    this.onout = null;
    this.onsender = null;
  }

  async init(options = { pub: true, sub: true }) {
    //TODO: set default value
    const { pub, sub } = options;

    this.socket = new Socket(this.url, {
      'sessionId': this.sessionId,
      'tokenId': this.tokenId
    });

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
  }

  initTransport(role, transportParameters) {
    const { id, iceCandidates, iceParameters, dtlsParameters } = transportParameters;

    if (role === 'pub') {
      this.publisher = new Publisher(id, iceCandidates, iceParameters, dtlsParameters);

      //TODO: mv to init
      this.publisher.onsenderclosed = async producerId => {
        await this.socket.request({
          event: 'closeProducer',
          data: {
            transportId: this.publisher.id,
            producerId
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

      this.publisher.onproduce = async (producingParameters, sender) => {
        const data = await this.socket.request({
          event: 'produce',
          data: {
            transportId: this.publisher.id,
            ...producingParameters
          }
        })
        const { localId, producerId } = data;
        sender.producerId = producerId;
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
      };

      this.subscriber.init();

      //TODO: state change

    }

  }

  //create transport and publish tracks
  async publish(track) {
    if (this.publisher.state >= 2) {
      console.log('pub send');
      this.publisher.send(track);
    }
  }

  async unpublish(sender) {
    this.publisher.stopSender(sender);
  }

  async subscribe(receiver) {
    this.subscriber.receive(receiver);
  }

  async unsubscribe(receiver) {
    if (receiver.active) {
      this.subscriber.removeReceiver(receiver);
      await this.socket.request({
        event: 'unsubscribe',
        data: {
          transportId: this.subscriber.id,
          producerId: receiver.producerId,
          consumerId: receiver.consumerId
        }
      })
    }
  }

  async pause() {

  }

  async resume() {

  }



  handleNotification(event, data) {
    console.log('notification: ', event, data);
    switch (event) {
      case 'join': {
        let { tokenId } = data;
        this.onin(tokenId);
        break;
      };
      case 'leave': {
        let { tokenId } = data;
        this.onout(tokenId);
        break;
      };
      case 'produce': {
        let { producerId, tokenId, metadata, kind, rtpParameters, consumerId } = data;
        let receiver = this.subscriber.addReceiver(producerId, tokenId, consumerId, kind, rtpParameters, metadata);
        this.onreceiver(receiver, tokenId, producerId, metadata);
        break;
      };
      case 'closeProducer': {
        let { producerId, tokenId } = data;
        let receiver = this.subscriber.receivers.get(producerId);

        if (receiver.active) {
          this.subscriber.removeReceiver(receiver);
        }


        break;
      }
      default: {
        console.log('unknown event ', event);
      }
    }
  }

}

