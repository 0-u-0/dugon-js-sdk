import { randomInitId } from './utils';

class Packet {
  constructor(y, n) {
    this.resolve = data => {
      y(data);
    };
    this.reject = error => {
      n(error);
    };
  }
}

//TODO: add timeout
export default class Socket {
  constructor(url, params) {
    this.url = url;
    this.params = params;
    this.messages = new Map();

    this.onnotification = null;
    this.onclose = null;
  }

  getFullURL() {
    let urlObj = new URL(this.url);
    Object.entries(this.params).forEach(([key, param]) => {
      urlObj.searchParams.set(key, param);
    });
    return urlObj.toString();
  }

  init() {
    this.ws = new WebSocket(this.getFullURL());

    this.ws.onmessage = event => {
      let data = JSON.parse(event.data);
      console.log(data);

      let { id, method, params } = data;

      if (method === 'response') {
        let packet = this.messages.get(id);
        if (packet) {
          packet.resolve(params);
        }
      } else if (method === 'notification') {
        let {event, data} = params;
        this.onnotification(event,data); 
      }
    };

    this.ws.onclose = _=>{
      this.onclose();
    }

    //TODO: error
    const executor = (y, n) => {
      this.ws.onopen = event => {
        y();
      };
    }

    return new Promise(executor);
  }

  async request(params) {
    const id = randomInitId(8);

    this.sendJSON({
      'method': 'request',
      id,
      params,
    });

    const executor = (y, n) => {
      const packet = new Packet(y, n);

      this.messages.set(id, packet);
    }

    return new Promise(executor);
  }

  sendJSON(json) {
    try {
      let jsonString = JSON.stringify(json);
      this.ws.send(jsonString)
    } catch (e) {
      // TODO:
    }
  }
}