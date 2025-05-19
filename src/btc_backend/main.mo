import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Trie "mo:base/Trie";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";
import T "./types";
import U "./utils";
import ENV "./Env";
import UserNode "UserNode";
import Cycles "mo:base/ExperimentalCycles";


shared ({caller = initializer}) actor class() {
  private let MAX_USERS_PER_NODE: Nat32 = 4000000;
  private stable var _uids : Trie.Trie<Text, Text> = Trie.empty();    
  private stable var _userNodes : [Text] = []; 

  public shared ({caller}) func greet(name : Text) : async Text {
    //let subaccount1 = createSubaccount(caller, 1);
    return "Hello, " # name # "! Your identity:" # Principal.toText(caller);
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

  public shared ({caller}) func getAllUsers() : async [T.User] {
    assert (caller == initializer); 
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

  public shared ({ caller }) func createNewUser(user: T.User) : async Result.Result<T.User, Text> {
      var caller_id : Text = Principal.toText(caller);
      switch (await getUserNodeCanisterId(caller_id)) {
          case (#ok o) {
              return #err("User already exist"); 
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
              await node.registerUser(user, caller_id);
              return #ok(user);              
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


func createSubaccount(userId : Principal, index : Nat) : [Nat8] {
  var subaccount = Array.init<Nat8>(32, 0);
  subaccount[0] := Nat8.fromNat(index);
  let userBytesArray = Blob.toArray(Principal.toBlob(userId));
  for (i in userBytesArray.keys()) {
    if (i + 1 < 32) {
      subaccount[i + 1] := userBytesArray[i];
    }
  };
  return Array.freeze<Nat8>(subaccount);
};

}
