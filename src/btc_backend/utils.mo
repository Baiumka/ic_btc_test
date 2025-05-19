import Trie "mo:base/Trie";
import Text "mo:base/Text";

module {
    public func getKey(x : Text) : Trie.Key<Text> {
        return { hash = Text.hash(x); key = x };
    };

    public func getKeyNat(x : Nat32) : Trie.Key<Nat32> {
        return { hash = x; key = x };
    };

}