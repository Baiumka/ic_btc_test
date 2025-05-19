
import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { createActor, canisterId, idlFactory } from 'declarations/btc_backend';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [identity, setIdentity] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userActor, setUserActor] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const client = await AuthClient.create();
    if (await client.isAuthenticated()) {
      const identity = client.getIdentity();
      fillUserData(identity);
    }    
  };

  const getIdentityProvider = () => {
    let idpProvider;
    if (typeof window !== "undefined") {
      const isLocal = process.env.DFX_NETWORK == "local";    
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
    console.log(idpProvider);
    return idpProvider;
  };

  const login = async () => {
    const client = await AuthClient.create();
    await client.login({
      identityProvider: getIdentityProvider(),
      onSuccess: async () => {
        const identity = client.getIdentity();
        fillUserData(identity);        
      },
    });
  };

  const fillUserData = async (userIdentity) => {
    const principal = userIdentity.getPrincipal().toString();
    const actor = createActor(canisterId, { agentOptions: { identity } });
    const response = await actor.getUser();        
    if ("ok" in response) {
        setUserData(response.ok);
        setNeedsRegistration(false);
    }
    else
    {
        setUserData(null);
        setNeedsRegistration(true);
    }
    setLoading(false);
    setIdentity(userIdentity);
    setPrincipal(principal);
    setIsAuthenticated(true);    
    setUserActor(actor)
  };

  const logout = async () => {
    const client = await AuthClient.create();
    await client.logout();
    setIsAuthenticated(false);
    setPrincipal(null);
    setUserData(null);
    setNeedsRegistration(false);
  };

  const register = async (nickname, password, phone) => {    
    const newUse = {
        nickname: nickname,
        password: password,
        phone: phone
    };
    const response = await userActor.createNewUser(newUse);
    if ("ok" in response) {
        setUserData(response.ok);
        setNeedsRegistration(false);
        return true;
    }
    else
    {
        setUserData(null);
        setNeedsRegistration(true);
        return response.err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        principal,
        login,
        logout,
        loading,
        userData,
        needsRegistration,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
