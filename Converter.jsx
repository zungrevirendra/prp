import React, { useState, useEffect } from 'react';

const Converter = () => {
  const [currencies, setCurrencies] = useState({});
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch('/api/currencies')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCurrencies(data.currencies);
      });
  }, []);

  const convert = async () => {
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, from, to })
    });
    const data = await res.json();
    setResult(data.result);
  };

  return (
    <div>
      <h2>Currency Converter</h2>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <select value={from} onChange={(e) => setFrom(e.target.value)}>
        {Object.keys(currencies).map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      <select value={to} onChange={(e) => setTo(e.target.value)}>
        {Object.keys(currencies).map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      <button onClick={convert}>Convert</button>
      {result && (
        <div>
          <h3>Converted Amount: {result}</h3>
        </div>
      )}
    </div>
  );
};

export default Converter;
