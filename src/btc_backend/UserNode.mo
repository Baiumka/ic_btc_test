import ENV "./Env";
import T "./types";
import U "./utils";
import Trie "mo:base/Trie";
import Text "mo:base/Text";


actor class UserNode() {

    private stable var userTrie : Trie.Trie<Text, T.User> = Trie.empty();

    public shared ({ caller }) func registerUser(user: T.User, principal_id: Text) : async () {
       assert (ENV.isMain(caller));
       userTrie := Trie.put(userTrie, U.getKey(principal_id) , Text.equal, user).0;
    };

    public query func getUser(principal_id: Text ) : async (?T.User) {
        let ?user = Trie.find(userTrie, U.getKey(principal_id), Text.equal) else {
           return null;
        };
        return ?user;
    };

    public shared func getUsers() : async (Trie.Trie<Text, T.User>) {        
        return userTrie;
    };

   
};