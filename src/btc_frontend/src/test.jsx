import { useState, useEffect } from 'react';
import { btc_backend, canisterId, idlFactory } from 'declarations/btc_backend';
import { Actor, HttpAgent } from "@dfinity/agent";

function App() {
  const [greeting, setGreeting] = useState('');

  const connectPlug = async () => {
    try {
      const publicKey = await window.ic.plug.requestConnect({
        whitelist: [canisterId],
        timeout: 50000
      });
      console.log(`The connected user's public key is:`, publicKey);

      if (publicKey) {
        console.log("Creating agent");        
        console.log("agent ", window.ic.plug.agent);        
        const newActor = createUserActor({agent: window.ic.plug.agent});
        newActor.greet('name').then((greeting) => {
          setGreeting(greeting);
        });
      }

    } catch (e) {
      console.log(e);
    }
  };

  const createUserActor = (options = {}) => {
    const agent = options.agent || new HttpAgent({ ...options.agentOptions });
  
    if (options.agent && options.agentOptions) {
      console.warn(
        "Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent."
      );
    }
  
  
  
    // Creates an actor with using the candid interface and the HttpAgent
    return Actor.createActor(idlFactory, {
      agent,
      canisterId,
      ...options.actorOptions,
    });
  };
  

  

  async function handleSubmit() {    
    await connectPlug();    
  }

  return (
    <main>
      <img src="/logo2.svg" alt="DFINITY logo" />
      <br />
      <br />      
        <label htmlFor="name">Enter your name: &nbsp;</label>
        <input id="name" alt="Name" type="text" />
        <button type="submit" onClick = {() => handleSubmit()}>Click Me!</button>      

      <section id="greeting">{greeting}</section>
    </main>
  );
}

export default App;


