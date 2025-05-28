
import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { createActor, canisterId, idlFactory } from 'declarations/btc_backend';
import { createAgent } from "@dfinity/utils";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from '@dfinity/principal';
import { IDL } from "@dfinity/candid";
import * as auth from "../utils/auth_utils";

const AuthContext = createContext();  

export const AuthProvider = ({ children }) => {

  //const [identity, setIdentity] = useState(null);
  const [userAgent, setAgent] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userActor, setUserActor] = useState(null);

  const [plugBalance, setPlugBalance] = useState(0);

  useEffect(() => {
    //initAuth();
    initPlugAuth();
  }, []);

  const initAuth = async () => {
    const client = await AuthClient.create();
    if (await client.isAuthenticated()) {
      const loginIdentity = client.getIdentity();
      fillUserData({loginIdentity});
    }
    else
    {
        setLoading(false);
    }
  };

  const initPlugAuth = async () => {
    console.log("initPlugAuth");        
      const isConnected = await window.ic.plug.isConnected();     
      console.log("isConnected",isConnected);                  
      if (isConnected) {      
        console.log("Plug is connected");                      
        await fillUserData({});
      }            
      else
      {
        console.log("Plug is not connected");
        setLoading(false);
      }       
  };

  const MakeLogin = async() => {
    const publicKey = await LoginPlug();
    console.log(`The connected user's public key is:`, publicKey);
    const loginAgent = window.ic.plug.agent;  
    await fillUserData({loginAgent});
  };

  const LoginPlug = async()  => {         
    return new Promise(async(resolve, reject) => {       
      const publicKey = await window.ic.plug.requestConnect({whitelist: [canisterId]});                                
      resolve(publicKey);    
  });
}

const LoginII = async () => {
  const client = await AuthClient.create();
  await client.login({
    identityProvider: auth.getIdentityProvider(),
    onSuccess: async () => {
      const loginIdentity = client.getIdentity();
      fillUserData({loginIdentity});        
    },
  });
};

  const login = async () => {
    await MakeLogin();
    //await LoginII();
  };

  const getAllWallets = async () => {
    try
    {
        return await userActor.getSubaccounts(); 
    }
    catch (e)
    {
        console.log(e);
    }
  };

  const getBalance = async (dfx) => {
    try
    {
        const result = await userActor.getBalance(dfx ? [dfx] : []);
        const numAmount = Number(result) / 100_000_000;         
        return numAmount ;
    }
    catch (e)
    {
        console.log(e);
    }
  };

  const deposit = async (to_sub, amount, duration) => {  
    const move = await moveBalance(null, to_sub, amount);
    if(move)
    {
      const numAmount = Math.round(amount*100_000_000);
      const timerResult = await userActor.createTimer(duration, to_sub, numAmount);
      console.log(timerResult);
    }
  };

  const moveBalance = async (from_sub, to_sub, amount) => {    
    console.log("from_sub", from_sub);
    console.log("to_sub", to_sub);
    console.log("amount", amount);
    let nat64amount = BigInt(Math.round(amount * 100_000_000) + 10_000);        
    if(!from_sub)
    {
      const fullBalance = await getBalance(null);
      console.log("fullBalance", fullBalance);
      nat64amount =  BigInt(Math.round(fullBalance * 100_000_000));
    }

    const tokenCanisterId = "mc6ru-gyaaa-aaaar-qaaaq-cai";  

    const arg = IDL.encode([
      IDL.Record({
        from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        spender: IDL.Record({
          owner: IDL.Principal,
          subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
        }),
        amount: IDL.Nat,
        expected_allowance: IDL.Opt(IDL.Nat),
        expires_at: IDL.Opt(IDL.Nat64),
        fee: IDL.Opt(IDL.Nat),
        memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
        created_at_time: IDL.Opt(IDL.Nat64)
      })
    ], [{
      from_subaccount: from_sub ? [from_sub] : [],
      spender: {
        owner: Principal.fromText(canisterId),
        subaccount: []
      },
      amount: nat64amount,
      expected_allowance: [],
      expires_at: [],
      fee: [],
      memo: [],
      created_at_time: []
    }]);
    const result = await window.ic.plug.agent.call(tokenCanisterId, {
      methodName: "icrc2_approve",
      arg
    });
    
    console.log("icrc2_approve",result);
    if(result.response.ok)
    {
      console.log("result.response.ok",result.response.ok);
      const plugPrinc = await window.ic.plug.getPrincipal();
      console.log("plugPrinc:", plugPrinc);
      const textPrinc = plugPrinc.toText();          
      console.log("textPrinc:", textPrinc);  
      console.log("princ:", principal);      
      const numAmount = Math.round(amount*100_000_000);
      console.log(numAmount);
      const depositResult = await userActor.moveBalance(textPrinc, from_sub ? [from_sub] : [], to_sub, numAmount);
      console.log("depositResult",depositResult);
      if(depositResult.ok)
      {
        return true;
      }
    }
  };

  const fillUserData = async (options) => {    
    const actor = await window.ic.plug.createActor({
      canisterId: canisterId,
      interfaceFactory: idlFactory,
    }); 
    console.log("kek actor",actor);  
    console.log("actor",actor);
    const response = await actor.getUser(); 
    console.log("response",response);       
    if ("ok" in response) {
        setUserData(response.ok);
        setNeedsRegistration(false);        
    }
    else
    {
        setUserData(null);
        setNeedsRegistration(true);
    }
    const princ = await actor.whoami();
    console.log("princ", princ);
    setPrincipal(princ);
    setLoading(false);
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
        phone: phone,
        wallets: []
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
        getAllWallets,
        getBalance,
        moveBalance,
        deposit        
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
