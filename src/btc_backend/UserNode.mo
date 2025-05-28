import ENV "./Env";
import T "./types";
import U "./utils";
import Trie "mo:base/Trie";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
actor class UserNode() {

    private stable var userTrie : Trie.Trie<Text, T.User> = Trie.empty();

    public shared ({ caller }) func registerUser(user: T.User, principal_id: Text) : async () {
       assert (ENV.isMain(caller));
       userTrie := Trie.put(userTrie, U.getKey(principal_id) , Text.equal, user).0;
    };

    public shared ({ caller }) func updateWallet(principal_id: Text, wallet: T.Wallet) : async () {
       assert (ENV.isMain(caller));
        let foundUser = await getUser(principal_id);
        switch(foundUser)
        {
            case (?user)
            {
                let updatedWallets = Array.map<T.Wallet, T.Wallet>(
                    user.wallets,
                    func (w) {
                        if (Blob.equal(w.blob, wallet.blob)) {
                            wallet
                        } else {
                            w
                        }
                    }
                );
                let updateUser = { user with wallets = updatedWallets };
                switch (Trie.get(userTrie, U.getKey(principal_id), Text.equal)) {
                    case (?user) {                        
                        userTrie := Trie.put(userTrie, U.getKey(principal_id), Text.equal, updateUser).0
                    };
                    case null {}
                }
            };
            case (null)
            {

            };
        };
        
        
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