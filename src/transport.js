export default class Transport {
  constructor(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {
    this.id = id;
    this.remoteICECandidates = remoteICECandidates;
    this.remoteICEParameters = remoteICEParameters;
    this.remoteDTLSParameters = remoteDTLSParameters;

    this.pc = null;

  }
  
} 

Transport.TRANSPORT_NEW = 0;
Transport.TRANSPORT_CONNECTING = 1;
Transport.TRANSPORT_CONNECTED = 2;