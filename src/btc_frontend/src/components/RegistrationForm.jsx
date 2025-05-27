import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const RegistrationForm = () => {
  const { register } = useAuth();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await register(nickname, password, phone);
    setMessage(response == true ? "Registration successful!" : response);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 d-flex">
      
        <input
          className="form-control"
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
      
        <input
          className="form-control"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
     
        <input
          className="form-control"
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      
      <button type="submit" className="btn btn-success w-100">Register</button>
      {message && <div className="alert alert-info mt-3">{message}</div>}
    </form>
  );
};

export default RegistrationForm;
