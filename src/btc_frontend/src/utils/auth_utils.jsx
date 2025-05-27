import { Actor, HttpAgent } from "@dfinity/agent";
import { canisterId, idlFactory } from "declarations/btc_backend";

export const createUserActor = (options = {}) => {
    const agent = options.agent || new HttpAgent({ ...options.agentOptions});
  
    if (options.agent && options.agentOptions) {
      console.warn(
        "Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent."
      );
    }
  
    
    // Fetch root key for certificate validation during development
    //if (process.env.DFX_NETWORK === "local") {
    //  agent.fetchRootKey().catch((err) => {
    //    console.warn(
    //      "Unable to fetch root key. Check to ensure that your local replica is running"
    //    );
    //    console.error(err);
    //  });
    //}
  
    // Creates an actor with using the candid interface and the HttpAgent
    return Actor.createActor(idlFactory, {
      agent,
      canisterId,
      ...options.actorOptions,
    });
  };
  

  export const getIdentityProvider = () => {
    let idpProvider;
    // Safeguard against server rendering
    if (typeof window !== "undefined") {
      const isLocal = process.env.DFX_NETWORK == "local";
      // Safari does not support localhost subdomains
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isLocal && isSafari) {
        idpProvider = `http://localhost:4943/?canisterId=${process.env.CANISTER_ID_INTERNET_IDENTITY}`;
      } else if (isLocal) {
        idpProvider = `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`;
      }
      else
      {
        idpProvider = `https://identity.ic0.app/#authorize`;
      }
    }
    return idpProvider;
  };  