import Socket from './socket';
import Publisher from './publisher';
import Subscriber from './subscriber';

export default class Session {
  constructor(sessionId, tokenId, options = { url: '' }) {
    this.sessionId = sessionId;
    this.tokenId = tokenId;

    const { url } = options;
    this.url = url;

    this.socket = null;

    this.publisher = new Publisher();
    this.subscriber = new Subscriber();

    //event
    this.onin = null;
    this.onout = null;
  }

  async init() {
    this.socket = new Socket(this.url, {
      'sessionId': this.sessionId,
      'tokenId': this.tokenId
    });

    this.socket.onevent = (event, data) => {
      this.handleEvent(event, data);
    }

    await this.socket.init();

    await this.socket.request({
      event: 'join'
    });
  }

  //create transport and publish tracks
  async publish(tracks) {
    const { transportParameters } = await this.socket.request({
      event: 'transport',
      data: {
        role: 'pub'
      }
    });

    const { id, iceCandidates, iceParameters, dtlsParameters } = transportParameters;
    this.publisher.setTransport(id, iceCandidates, iceParameters, dtlsParameters);
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

    this.publisher.onproduce = async producingParameters => {
      let result = await this.socket.request({
        event: 'produce',
        data: {
          transportId: this.publisher.id,
          ...producingParameters
        }
      })
    }
    await this.publisher.init(tracks);

  }


  handleEvent(event, data) {
    console.log('event: ', event, data);
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
        break;
      };
      default: {
        console.log('unknown event ', event);
      }
    }
  }




}

