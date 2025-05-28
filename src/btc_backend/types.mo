
type User = {
    nickname: Text;
    password: Text;
    phone: Text;
    wallets: [Wallet];
};

type Wallet = {
    blob: Blob;
    ledger: Text;
    timer: Nat;
    amount: Nat;
    delay: Nat;
};

