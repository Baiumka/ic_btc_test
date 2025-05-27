
type User = {
    nickname: Text;
    password: Text;
    phone: Text;
    wallets: [Wallet];
};

type Wallet = {
    blob: Blob;
    ledger: Text;
};