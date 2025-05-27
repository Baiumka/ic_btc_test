import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const UserList = () => {
  const { getAllWallets, getBalance, moveBalance} = useAuth();
  const [wallets, setWallets] = useState([]);
  const [details, setDetails] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showDepositModal, setDepositModal] = useState(false);
  const [depositWallet, setDepositWallet] = useState(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [fromWallet, setFromWallet] = useState(null);
  const [toWallet, setToWallet] = useState("");
  const [amount, setAmount] = useState("");

  const openMoveModal = (from) => {
    setFromWallet(from);
    setToWallet(null); 
    setAmount("");
    setShowModal(true);
  };

  const handleMove = async() => {
    if (fromWallet && toWallet && amount) {
      console.log("toWallet",toWallet);
      console.log("fromWallet",fromWallet);
      await moveBalance(fromWallet.blob, toWallet.blob, amount);
      await showBalance(fromWallet);
      await showBalance(toWallet);               
      setShowModal(false);
    }
  };
  
  const handleDeposit =  async () => {    
    const depositResult = await moveBalance(null, depositWallet.blob, depositAmount);
    await showBalance(depositWallet);
    setDepositModal(false);
  };

  const fetchWallets = async () => {
    const list = await getAllWallets();
    setWallets(list);
    setIsOpen(true);
  };

  const showBalance = async (dfx) => {    
    const result = await getBalance(dfx.blob);    
    setDetails((prev) => ({ ...prev, [dfx.ledger]: { balance: result } }));
  };

  const openDepositModal = async (dfx) => {
    console.log("depositWallet", dfx);
    setDepositAmount(0);
    setDepositWallet(dfx);
    setDepositModal(true);
  };


  const setWallet = async (dfx) => {    
    setToWallet(dfx);    
  };

  return (
    <div className="mt-4">
      <button className="btn btn-secondary w-100" onClick={fetchWallets}>
        {isOpen ? "Refresh Wallet List" : "Show Wallet List"}
      </button>

      {isOpen && wallets.length > 0 && (
        <div className="mt-4">
          {wallets.map((dfx) => (
            <div key={dfx.ledger} className="card mb-2 shadow-sm">
              <div className="card-body d-flex justify-content-between align-items-start">
                <div className="flex-grow-1 text-break pe-2">
                    <strong className="font-monospace">{dfx.ledger}</strong>
                </div>
                    <div className="flex-column gap-1">
                        <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openDepositModal(dfx)}
                        >
                        DEPOSIT
                        </button>
                        <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => showBalance(dfx)}
                        >
                        SHOW
                        </button>
                        <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => openMoveModal(dfx)}
                        >
                        MOVE
                        </button>
                    </div>
                </div>
                {details[dfx.ledger] && (
                <div className="card-footer text-start small text-muted">
                    {details[dfx.ledger].error
                    ? <span className="text-danger">{details[dfx.ledger].error}</span>
                    : `Balance: ${details[dfx.ledger].balance.toString()}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}     
      {showModal && (
  <div className="modal d-block" tabIndex="-1" role="dialog">
    <div className="modal-dialog" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Transfer Balance</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setShowModal(false)}
          ></button>
        </div>
        <div className="modal-body">
          <div className="mb-3">
            <label className="form-label">To Wallet</label>
            <select
              className="form-select"
              value={wallets.findIndex((w) => w === toWallet)}
              onChange={(e) => setWallet(wallets[parseInt(e.target.value)])}
            >
              <option value="">Select wallet</option>
              {wallets
                .filter((w) => w !== fromWallet)
                .map((w, i) => {
                  const index = wallets.indexOf(w); // Get actual index in original array
                  return (
                    <option key={w.ledger} value={index}>
                      {w.ledger}
                    </option>
                  );
                })}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Amount (ICP)</label>
            <input
              type="number"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.0001"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleMove} disabled={!toWallet || !amount}>
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
)} 

{showDepositModal && (
  <div className="modal d-block" tabIndex="-1" role="dialog">
    <div className="modal-dialog modal-xl" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Deposit</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setDepositModal(false)}
          ></button>
        </div>
        <div className="modal-body">
        <div className="mb-3">
  <label className="form-label">To Wallet: {depositWallet.ledger}</label>
</div>
<div className="mb-3">
            <label className="form-label">Amount (ICP)</label>
            <input
              type="number"
              className="form-control"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              min="0"
              step="0.0001"
            />
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setDepositModal(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleDeposit} disabled={!depositAmount}>
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
)} 
    </div>
    
  );
};

export default UserList;
