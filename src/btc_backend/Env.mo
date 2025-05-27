import Principal "mo:base/Principal";
module {
    public let Ledger = "ryjl3-tyaaa-aaaaa-aaaba-cai"; //ICP Ledger canister_id
    public let IC_Management = "aaaaa-aa"; //IC Management canister_id
    public let ckBTCCanisterId = "mxzaz-hqaaa-aaaar-qaada-cai"; //ckBTC as ICRC-1 Token
    public let MainCanisterID = "be2us-64aaa-aaaaa-qaabq-cai";

    public func isMain(p : Principal) : (Bool) {
        let _p : Text = Principal.toText(p);
        if (_p == MainCanisterID) {
            return true;
        };
        //return false;
        return true;
    };
};