import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Trie "mo:base/Trie";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
import T "./types";
import U "./utils";
import UserNode "UserNode";
import Cycles "mo:base/ExperimentalCycles";
import Icrc1Ledger "./ledger_types";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Time "mo:base/Time";
import Timer "mo:base/Timer";


shared ({caller = initializer}) actor class() {
  private let MAX_USERS_PER_NODE: Nat32 = 4000000;
  private stable var _uids : Trie.Trie<Text, Text> = Trie.empty();    
  private stable var _userNodes : [Text] = []; 

  private var timerList: [Nat] = [];

  let ledgerCanister = actor("mc6ru-gyaaa-aaaar-qaaaq-cai") : actor {
    icrc2_transfer_from : shared Icrc1Ledger.TransferFromArgs -> async Icrc1Ledger.TransferFromResult;   
    icrc1_balance_of : shared query Icrc1Ledger.Account -> async Icrc1Ledger.Tokens;
  };


  var timerID: Nat = 0;

  public func testTimer() : async () {    
    func alarmUser() :  async () {
      Debug.print("Wake up, B" # Nat.toText(timerID));
      timerID := Timer.setTimer(#seconds 2, alarmUser);
    };
    await alarmUser();
  };

  public func stopTimer() : async () {    
    Timer.cancelTimer(timerID);
  };


  public shared ({ caller }) func withdraw(from_sub: Blob, amount: Nat) : async Result.Result<Icrc1Ledger.BlockIndex, Text> {
     let callerUser = await getUserByPrinc(Principal.toText(caller));
     switch (callerUser) {
      case (?user) 
      {                     
          let realWallet = Array.find<T.Wallet>(user.wallets, func (w) = w.blob == from_sub);
          switch (realWallet) {
            case (?w) {                            
              Timer.cancelTimer(w.timer);
              timerList := Array.filter<Nat>(
                timerList,
                func(x) { x != w.timer }
              );              
              let updatedWallet: T.Wallet = {
                blob = w.blob;
                ledger = w.ledger;   
                timer = 0;
                amount = 0;
                delay = 0;   
              };                    
              let canister_id = await getUserNodeCanisterId(Principal.toText(caller));   
              switch(canister_id)
              {
                case (#ok o) {
                  let userNode = actor (o) : actor {
                      updateWallet : shared (principal_id: Text, wallet: T.Wallet) -> async ();
                  };
                 await userNode.updateWallet(Principal.toText(caller), updatedWallet);
                 let move = await moveBalance(Principal.toText(caller), ?from_sub, null, amount);  
                };
                case (#err e)
                {

                };
              };
              
            };
            case (null) {      
              
            };
          };                                                
      };
      case (null) {      
        
      };      
    };    
    return #ok 1;
  };


  public shared ({ caller }) func createTimer(duration: Nat, to_sub: Blob, amount: Nat) : async Result.Result<Icrc1Ledger.BlockIndex, Text> {
    let callerUser = await getUserByPrinc(Principal.toText(caller));
    switch (callerUser) {
      case (?user) 
      {             
        func pay() :  async () {   
          let realWallet = Array.find<T.Wallet>(user.wallets, func (w) = w.blob == to_sub);
          switch (realWallet) {
            case (?w) {              
              let move = await moveBalance(Principal.toText(caller), null, ?to_sub, amount);  
              let payTimerId = Timer.setTimer(#seconds duration, pay);
              timerList := Array.append<Nat>(timerList, [payTimerId]);
              let updatedWallet: T.Wallet = {
                blob = w.blob;
                ledger = w.ledger;   
                timer = payTimerId;
                amount = amount;
                delay = duration;   
              };                    
              let canister_id = await getUserNodeCanisterId(Principal.toText(caller));   
              switch(canister_id)
              {
                case (#ok o) {
                  let userNode = actor (o) : actor {
                      updateWallet : shared (principal_id: Text, wallet: T.Wallet) -> async ();
                  };
                 await userNode.updateWallet(Principal.toText(caller), updatedWallet);
                };
                case (#err e)
                {

                };
              };
              
            };
            case (null) {      
              
            };
          };                         
        };
        await pay();        
      };
      case (null) {      
        
      };      
    };    
    return #ok 1;
  };

  public shared ({ caller }) func moveBalance(from_principal: Text, from_sub: ?Blob, to_sub: ?Blob, amount: Nat) : async Result.Result<Icrc1Ledger.BlockIndex, Text> {
    let transferFromArgs : Icrc1Ledger.TransferFromArgs = {
      from = {
        owner = Principal.fromText(from_principal);
        subaccount = from_sub;
      };      
      memo = null;      
      amount = amount;      
      spender_subaccount = null;      
      fee = ?10;      
      to = {
        owner = Principal.fromText(from_principal);
        subaccount = to_sub;
      };
      created_at_time = null;
    };

    try {      
      let transferFromResult = await ledgerCanister.icrc2_transfer_from(transferFromArgs);      
      switch (transferFromResult) {
        case (#Err(transferError)) {
          return #err("Couldn't transfer funds:\n" # debug_show (transferError));
        };
        case (#Ok(blockIndex)) { 
          let answer: Nat64 = Nat64.fromNat(blockIndex);
          let result = Nat64.toNat(answer);
          return #ok result;
        };
      };     
    } catch (error : Error) {      
      return #err("Reject message: " # Error.message(error));
    };
  };
  
  public shared ({caller}) func resetUsers() : async () {       
    assert (caller == initializer); 
        _uids := Trie.empty();        
        _userNodes := [];         
  };

  private func getUserNodeCanisterId(userPrincID : Text) : async (Result.Result<Text, Text>) {        
        let ?canister_id = Trie.find<Text, Text>(_uids, U.getKey(userPrincID), Text.equal) else {
            return #err("user not found");
        };        
        return #ok(canister_id);
    };

  public shared ({caller}) func getSubaccounts() : async [T.Wallet] {
    let callerUser = await getUserByPrinc(Principal.toText(caller));     
    switch (callerUser) {
      case (?user) 
      {             
        return user.wallets;
      };
      case (null) {      
        return [];
      };      
    }    
  };

  public shared ({caller}) func getBalance(wallet: ?Blob) : async Nat64 {           
    let ownerRec = {
        owner = caller;
        subaccount = wallet;
    };            
    let balance = await ledgerCanister.icrc1_balance_of(ownerRec);
    return Nat64.fromNat(balance);
  };

  public shared ({caller}) func getAllUsers() : async [T.User] {    
    var users = Buffer.Buffer<T.User>(0);
    for (canister_id in _userNodes.vals()) {    
        let userNode = actor (canister_id) : actor {
            getUsers : shared ( ) -> async (Trie.Trie<Text, T.User>);
        };
        let userTrie = await userNode.getUsers();
        for ((_, user) in Trie.iter(userTrie)) {   
            users.add(user);
        }                
    };        
    return Buffer.toArray(users);
  };

  public shared ({caller}) func getUser(): async Result.Result<T.User, Text> {       
    let callerUser = await getUserByPrinc(Principal.toText(caller));     
    switch (callerUser) {
    case (?user) 
    {           
        return #ok(user);    
    };
    case (null) {      
        return #err("new");  
    };      
    }
  };

  public shared   func getUids(): async Trie.Trie<Text, Text> {        
      return _uids;        
  };

  public shared ({caller}) func whoami(): async Text {
    return Principal.toText(caller);
  };

  public shared ({ caller }) func createNewUser(user: T.User) : async Result.Result<T.User, Text> {
      var caller_id : Text = Principal.toText(caller);
      switch (await getUserNodeCanisterId(caller_id)) {
          case (#ok o) {
              return #err("User already exist!!!"); 
          };
          case (#err e) {
              var canister_id : Text = "";
              label _check for (can_id in _userNodes.vals()) {
                  var size : Nat32 = countUsers(can_id);
                  if (size < MAX_USERS_PER_NODE) {
                      canister_id := can_id;
                      _uids := Trie.put(_uids, U.getKey(caller_id), Text.equal, canister_id).0;
                      break _check;
                  };
              };
              if (canister_id == "") {
                  canister_id := await createUserCanister();
                  _userNodes := Array.append(_userNodes, [canister_id]);
                  _uids := Trie.put(_uids, U.getKey(caller_id), Text.equal, canister_id).0;
              };                             
              let node = actor (canister_id) : actor {
                      registerUser : shared (T.User, Text) -> async ();
              };      
              let sub1 = createSubaccount(caller, 1);
              let sub2 = createSubaccount(caller, 2);
              let wallet1 = {
                blob = sub1;
                ledger = U.bytesToText(Blob.toArray(Principal.toLedgerAccount(caller, ?sub1)));            
                timer = 0;                    
                amount = 0;
                delay = 0;
              };
              let wallet2 = {
                blob = sub2;
                ledger = U.bytesToText(Blob.toArray(Principal.toLedgerAccount(caller, ?sub2)));   
                timer = 0;
                amount = 0;
                delay = 0;             
              };
              let newUser: T.User = {
                nickname = user.nickname;
                password = user.password;
                phone = user.phone;
                wallets = [wallet1, wallet2];
              };             
              await node.registerUser(newUser, caller_id);
              return #ok(newUser);              
          };
      };
  };

  private func createUserCanister() : async (Text) {       
        Cycles.add<system>(200_000_000_000);         
        let canister = await UserNode.UserNode();
        let canister_id = Principal.fromActor(canister);
        return Principal.toText(canister_id);
  };

  private func countUsers(nid : Text) : (Nat32) {
        var count : Nat32 = 0;
        for ((uid, canister) in Trie.iter(_uids)) {
            if (canister == nid) {
                count := count + 1;
            };
        };
        return count;
    };

  private func getUserByPrinc(caller: Text) : async ?T.User {
        for ((user_id, canister_id) in Trie.iter(_uids)) {  
            if (user_id == caller) {                
                let userNode = actor (canister_id) : actor {
                    getUser : query ( Text ) -> async (?T.User);
                };
                let user = await userNode.getUser(caller);
                return user; 
            }
        };
        return null;  
    };


func createSubaccount(userId : Principal, index : Nat) : Blob {
  var subaccount = Array.init<Nat8>(32, 0);
  subaccount[0] := Nat8.fromNat(index);
  let userBytesArray = Blob.toArray(Principal.toBlob(userId));
  for (i in userBytesArray.keys()) {
    if (i + 1 < 32) {
      subaccount[i + 1] := userBytesArray[i];
    }
  };  
  //let account = Principal.toLedgerAccount(userId, ?Blob.fromArrayMut(subaccount));
  return Blob.fromArrayMut(subaccount);
};

}
