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

    this.publisher = null;
    this.subscriber = null;

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
      event: 'createPublishTransport'
    });
    this.publisher = new Publisher(transportParameters);
    this.publisher.ondtls = async dtlsParameters => {
      await this.socket.request({
        event: 'publishDtls',
        data: {
          id: this.publisher.id,
          dtlsParameters
        }
      });
    };

    this.publisher.onproduce = async producingParameters => {
      let result = await this.socket.request({
        event: 'produce',
        data: {
          id: this.publisher.id,
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
        
      };
      default: {
        console.log('unknown event ', event);
      }
    }
  }




}

