import React, { useState, useCallback, useMemo } from 'react';

const ForexExitCalculator = () => {
  // State for trade setup
  const [balance, setBalance] = useState(10);
  const [lot, setLot] = useState(0.01);
  const [slPips, setSlPips] = useState(25);
  const [rr, setRr] = useState(1.5);
  const [trailPips, setTrailPips] = useState(10);
  const [pipValueMultiplier, setPipValueMultiplier] = useState(100); // Default: Gold = 100 ($1/pip at 0.01 lot)

  // Pip value per lot based on selected instrument
  const getPipValuePerLot = useCallback(() => {
    return pipValueMultiplier;
  }, [pipValueMultiplier]);

  // Derived values
  const pipValue = getPipValuePerLot() * lot;
  const slDollar = pipValue * slPips;
  const tp1Pips = slPips * rr;
  const tp2Pips = slPips * rr * 1.5;
  const tp1Dollar = pipValue * tp1Pips * 0.5;
  const tp2Dollar = pipValue * tp2Pips * 0.5;
  const maxProfit = tp1Dollar + tp2Dollar;
  const riskPct = (slDollar / balance) * 100;
  const bwr = 1 / (1 + rr);
  const recLot = (balance * 0.02) / (slPips * (getPipValuePerLot() / 100));

  // Trailing stop calculations
  const lockedProfit = pipValue * tp1Pips * 0.5;
  const trailLoss = pipValue * trailPips * 0.5;
  const netWorst = lockedProfit - trailLoss;

  // Win rates for EV bars
  const winRates = [0.3, 0.4, 0.5, 0.6, 0.7];
  const maxEV = slDollar * rr;

  // Check risk warning
  const riskWarning = useMemo(() => {
    if (riskPct > 5) {
      return `⚠️ Risk is ${riskPct.toFixed(1)}% of balance — above safe 2% threshold. Consider reducing lot size to ${Math.max(0.01, recLot).toFixed(2)} lots.`;
    } else if (riskPct > 2) {
      return `⚡ Risk is ${riskPct.toFixed(1)}% — moderate. 2% or lower is recommended.`;
    }
    return null;
  }, [riskPct, recLot]);

  // Handle instrument change
  const handleInstrumentChange = (e) => {
    setPipValueMultiplier(parseFloat(e.target.value));
  };

  return (
    <div className="container">
      {/* Card 1: Trade Setup */}
      <div className="card">
        <p className="section-title">⚙️ Trade Setup</p>

        <div className="input-group">
          <div className="field">
            <label>Instrument</label>
            <select onChange={handleInstrumentChange} defaultValue="100_gold">
              <option value="1_eu">EURUSD / GBPUSD / USDCHF — $10/pip/lot</option>
              <option value="1000_au">AUDUSD / NZDUSD — $10/pip/lot</option>
              <option value="770">USDJPY (approx) — $7.70/pip/lot</option>
              <option value="100_gold">XAUUSD (Gold) — $1/pip/0.01lot</option>
              <option value="100_us30">US30 / NAS100 — $1/pt/0.01lot</option>
            </select>
          </div>
          <div className="field">
            <label>Account Balance ($)</label>
            <input
              type="number"
              value={balance}
              min={1}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 10)}
            />
          </div>
        </div>

        <div className="row">
          <label>Lot Size</label>
          <input
            type="range"
            min={0.01}
            max={2}
            step={0.01}
            value={lot}
            onChange={(e) => setLot(parseFloat(e.target.value))}
          />
          <span className="rv">{lot.toFixed(2)}</span>
        </div>

        <div className="row">
          <label>Stop Loss (pips)</label>
          <input
            type="range"
            min={5}
            max={200}
            step={1}
            value={slPips}
            onChange={(e) => setSlPips(parseInt(e.target.value))}
          />
          <span className="rv">{slPips} pips</span>
        </div>

        <div className="row">
          <label>Reward : Risk</label>
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={rr}
            onChange={(e) => setRr(parseFloat(e.target.value))}
          />
          <span className="rv">{rr.toFixed(1)} R</span>
        </div>

        {riskWarning && (
          <div className="warn show">{riskWarning}</div>
        )}
      </div>

      {/* Card 2: Exit Levels */}
      <div className="card">
        <p className="section-title">📐 Exit Levels</p>
        <div className="mgrid">
          <div className="met">
            <p className="lbl">Stop Loss</p>
            <p className="val" style={{ color: 'var(--color-text-danger)' }}>
              -${slDollar.toFixed(2)}
            </p>
            <p className="sub">{slPips} pips</p>
          </div>
          <div className="met">
            <p className="lbl">Take Profit 1 (50%)</p>
            <p className="val" style={{ color: 'var(--color-text-success)' }}>
              +${tp1Dollar.toFixed(2)}
            </p>
            <p className="sub">{tp1Pips.toFixed(0)} pips</p>
          </div>
          <div className="met">
            <p className="lbl">Take Profit 2 (50%)</p>
            <p className="val" style={{ color: 'var(--color-text-success)' }}>
              +${tp2Dollar.toFixed(2)}
            </p>
            <p className="sub">{tp2Pips.toFixed(0)} pips</p>
          </div>
        </div>
        <div className="mgrid">
          <div className="met">
            <p className="lbl">Pip Value (per lot)</p>
            <p className="val" style={{ color: 'var(--color-text-info)' }}>
              ${pipValue.toFixed(2)}
            </p>
          </div>
          <div className="met">
            <p className="lbl">Risk % of Balance</p>
            <p className="val">{riskPct.toFixed(2)}%</p>
          </div>
          <div className="met">
            <p className="lbl">Breakeven Win Rate</p>
            <p className="val" style={{ color: 'var(--color-text-info)' }}>
              {(bwr * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Card 3: Expected Value */}
      <div className="card">
        <p className="section-title">📊 Expected Value by Win Rate</p>
        <div id="evBars">
          {winRates.map((wr) => {
            const ev = (wr * maxProfit) - ((1 - wr) * slDollar);
            const isPos = ev >= 0;
            const barW = Math.min(Math.abs(ev) / (maxEV * 1.2) * 100, 100);
            return (
              <div className="ev-row" key={wr}>
                <span className="ev-lbl">WR {(wr * 100).toFixed(0)}%</span>
                <div className="ev-bar-wrap">
                  <div
                    className="ev-bar"
                    style={{
                      width: `${barW}%`,
                      background: isPos ? 'var(--color-text-success)' : 'var(--color-text-danger)'
                    }}
                  />
                </div>
                <span
                  className="ev-val"
                  style={{ color: isPos ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}
                >
                  {isPos ? '+' : ''}${ev.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
        <hr className="sep" />
        <div className="mgrid2">
          <div className="met">
            <p className="lbl">Full TP Max Profit</p>
            <p className="val" style={{ color: 'var(--color-text-success)' }}>
              +${maxProfit.toFixed(2)}
            </p>
          </div>
          <div className="met">
            <p className="lbl">Recommended Lot (2% risk)</p>
            <p className="val" style={{ color: 'var(--color-text-warning)' }}>
              {Math.max(0.01, recLot).toFixed(2)} lots
            </p>
          </div>
        </div>
      </div>

      {/* Card 4: Trailing Stop */}
      <div className="card">
        <p className="section-title">🔁 Trailing Stop (after TP1 hit)</p>
        <div className="row">
          <label>Trail (pips from peak)</label>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={trailPips}
            onChange={(e) => setTrailPips(parseInt(e.target.value))}
          />
          <span className="rv">{trailPips} pips</span>
        </div>
        <div className="mgrid">
          <div className="met">
            <p className="lbl">Locked Profit (50% pos)</p>
            <p className="val" style={{ color: 'var(--color-text-success)' }}>
              +${lockedProfit.toFixed(2)}
            </p>
          </div>
          <div className="met">
            <p className="lbl">Trail Stop Value</p>
            <p className="val" style={{ color: 'var(--color-text-warning)' }}>
              -${trailLoss.toFixed(2)}
            </p>
            <p className="sub">if reversed</p>
          </div>
          <div className="met">
            <p className="lbl">Net Worst Case</p>
            <p
              className="val"
              style={{ color: netWorst >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}
            >
              {netWorst >= 0 ? '+' : ''}${netWorst.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <button
        className="btn"
        onClick={() => alert('Paste this calculator into your website! See the source code for the full HTML.')}
      >
        📋 Copy this calculator to your site
      </button>

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '1rem' }}>
        All calculations are for educational purposes. Trade at your own risk.
      </p>

      <style>{`
        :root {
          --color-text-primary: #1a1a2e;
          --color-text-secondary: #6b7280;
          --color-text-tertiary: #9ca3af;
          --color-text-success: #059669;
          --color-text-danger: #dc2626;
          --color-text-warning: #d97706;
          --color-text-info: #2563eb;
          --color-background-primary: #ffffff;
          --color-background-secondary: #f3f4f6;
          --color-background-tertiary: #e5e7eb;
          --color-background-success: #d1fae5;
          --color-background-danger: #fee2e2;
          --color-background-info: #dbeafe;
          --color-background-warning: #fef3c7;
          --color-border-tertiary: #e5e7eb;
          --color-border-secondary: #d1d5db;
          --border-radius-md: 8px;
          --border-radius-lg: 12px;
          --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --font-mono: 'SF Mono', 'Fira Code', monospace;
        }

        * { box-sizing: border-box; }
        
        .container {
          max-width: 720px;
          margin: 0 auto;
          font-family: var(--font-sans);
          color: var(--color-text-primary);
        }

        .card {
          background: var(--color-background-primary);
          border: 0.5px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-lg);
          padding: 1rem 1.25rem;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 12px;
        }

        .mgrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 0.75rem;
        }

        .mgrid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 0.75rem;
        }

        .met {
          background: var(--color-background-secondary);
          border-radius: var(--border-radius-md);
          padding: 0.65rem 0.75rem;
        }

        .met .lbl {
          font-size: 11px;
          color: var(--color-text-secondary);
          margin: 0 0 2px;
        }

        .met .val {
          font-size: 17px;
          font-weight: 500;
          margin: 0;
        }

        .met .sub {
          font-size: 11px;
          color: var(--color-text-tertiary);
          margin: 2px 0 0;
        }

        .row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 0.6rem;
        }

        .row label {
          font-size: 13px;
          color: var(--color-text-secondary);
          min-width: 130px;
        }

        .row input[type=range] {
          flex: 1;
          height: 6px;
          accent-color: var(--color-text-info);
        }

        .row .rv {
          font-size: 13px;
          font-weight: 500;
          min-width: 55px;
          text-align: right;
        }

        select, input[type=number] {
          font-size: 13px;
          padding: 5px 10px;
          border-radius: var(--border-radius-md);
          border: 0.5px solid var(--color-border-secondary);
          background: var(--color-background-primary);
          color: var(--color-text-primary);
          width: 100%;
        }

        select { cursor: pointer; }

        .sep {
          border: none;
          border-top: 0.5px solid var(--color-border-tertiary);
          margin: 0.75rem 0;
        }

        .ev-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .ev-lbl {
          font-size: 12px;
          color: var(--color-text-secondary);
          min-width: 55px;
        }

        .ev-bar-wrap {
          flex: 1;
          background: var(--color-background-secondary);
          border-radius: 4px;
          height: 16px;
          overflow: hidden;
        }

        .ev-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.2s;
        }

        .ev-val {
          font-size: 12px;
          font-weight: 500;
          min-width: 65px;
          text-align: right;
        }

        .warn {
          font-size: 12px;
          color: var(--color-text-warning);
          margin: 6px 0 0;
          padding: 6px 10px;
          background: var(--color-background-warning);
          border-radius: var(--border-radius-md);
          display: none;
        }

        .warn.show {
          display: block;
        }

        .input-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 0.75rem;
        }

        .input-group .field label {
          font-size: 12px;
          color: var(--color-text-secondary);
          display: block;
          margin-bottom: 4px;
        }

        .btn {
          width: 100%;
          padding: 0.75rem;
          font-size: 14px;
          font-weight: 500;
          border-radius: var(--border-radius-md);
          border: none;
          background: var(--color-text-info);
          color: white;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .btn:hover { opacity: 0.9; }

        @media (max-width: 600px) {
          .mgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .input-group { grid-template-columns: 1fr; }
          .row { flex-wrap: wrap; }
          .row label { min-width: 100px; }
        }
      `}</style>
    </div>
  );
};

export default ForexExitCalculator;