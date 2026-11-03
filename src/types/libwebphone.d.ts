/**
 * Type definitions for API4COM libwebphone v2.0
 */

export interface LibwebphoneCall {
  id: string;
  isPrimary: () => boolean;
  isInProgress: () => boolean;
  isAnswered: () => boolean;
  answer: () => void;
  reject: () => void;
  hangup: () => void;
  mute: () => void;
  unmute: () => void;
  isMuted: () => boolean;
  sendDTMF: (tone: string | number) => void;
  getCustomHeaders: () => Record<string, string>;
  getDirection: () => "inbound" | "outbound";
  getRemoteIdentity: () => { uri: string; displayName?: string };
}

export interface LibwebphoneUserAgentConfig {
  renderTargets?: string[];
  transport: {
    sockets: string[];
    recovery_max_interval?: number;
    recovery_min_interval?: number;
  };
  authentication: {
    username: string;
    password: string;
    realm: string;
  };
  user_agent: {
    instance_id: string;
    register: boolean;
    register_expires?: number;
    no_answer_timeout?: number;
    user_agent?: string;
  };
}

export interface LibwebphoneConfig {
  dialpad?: {
    renderTargets?: string[];
  };
  audioContext?: {
    renderTargets?: string[];
  };
  mediaDevices?: {
    videoinput?: { enabled: boolean };
    renderTargets?: string[];
  };
  userAgent: LibwebphoneUserAgentConfig;
}

export interface LibwebphoneInstance {
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  onAny: (callback: (event: string, ...args: any[]) => void) => void;
  getUserAgent: () => {
    isRegistered: () => boolean;
    isConnected: () => boolean;
    register: () => void;
    unregister: () => void;
    renderAddTarget?: (config: any) => void;
  };
  destroy?: () => void;
}

declare global {
  interface Window {
    libwebphone?: new (config: LibwebphoneConfig) => LibwebphoneInstance;
    regeneratorRuntime?: any;
  }
}
