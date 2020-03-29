export default class Transport {
  constructor() {
    this.id = null;
    this.pc = null;

    this.remoteICECandidates = null;
    this.remoteICEParameters = null;
    this.remoteDTLSParameters = null;
  }

  setTransport(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {
    this.id = id;
    this.remoteICECandidates = remoteICECandidates;
    this.remoteICEParameters = remoteICEParameters;
    this.remoteDTLSParameters = remoteDTLSParameters;
  }
} 