import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { db } from '../utils/database.queries';
import { useAuth } from '../hooks/useAuth';

const ForexExitCalculator = () => {
  const { user } = useAuth();
  const userId = user?.id;
  
  // State for trade setup
  const [configName, setConfigName] = useState('');
  const [balance, setBalance] = useState(10);
  const [lot, setLot] = useState(0.01);
  const [slPips, setSlPips] = useState(25);
  const [rr, setRr] = useState(1.5);
  const [trailPips, setTrailPips] = useState(10);
  const [pipValueMultiplier, setPipValueMultiplier] = useState(100);
  const [selectedInstrument, setSelectedInstrument] = useState('XAUUSD (Gold) — $1/pip/0.01lot');
  const [instrumentType, setInstrumentType] = useState('gold');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [showSavedConfigs, setShowSavedConfigs] = useState(false);
  const [activeConfigId, setActiveConfigId] = useState(null);

  // Load saved configurations on mount
  useEffect(() => {
    if (userId) {
      loadSavedConfigurations();
      loadActiveConfiguration();
    }
  }, [userId]);

  const loadSavedConfigurations = async () => {
    try {
      const configs = await db.getForexConfigs(userId);
      setSavedConfigs(configs);
    } catch (error) {
      console.error('Error loading saved configs:', error);
    }
  };

  const loadActiveConfiguration = async () => {
    try {
      const activeConfig = await db.getActiveForexConfig(userId);
      if (activeConfig) {
        setActiveConfigId(activeConfig.id);
        loadConfiguration(activeConfig);
      }
    } catch (error) {
      console.error('Error loading active config:', error);
    }
  };

  // Derived values
  const getPipValuePerLot = useCallback(() => pipValueMultiplier, [pipValueMultiplier]);
  
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
  const lockedProfit = pipValue * tp1Pips * 0.5;
  const trailLoss = pipValue * trailPips * 0.5;
  const netWorst = lockedProfit - trailLoss;
  const winRates = [0.3, 0.4, 0.5, 0.6, 0.7];
  const maxEV = slDollar * rr;

  const riskWarning = useMemo(() => {
    if (riskPct > 5) {
      return `⚠️ Risk is ${riskPct.toFixed(1)}% of balance — above safe 2% threshold. Consider reducing lot size to ${Math.max(0.01, recLot).toFixed(2)} lots.`;
    } else if (riskPct > 2) {
      return `⚡ Risk is ${riskPct.toFixed(1)}% — moderate. 2% or lower is recommended.`;
    }
    return null;
  }, [riskPct, recLot]);

  const handleInstrumentChange = (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const multiplier = parseFloat(selectedOption.getAttribute('data-multiplier'));
    const instType = selectedOption.getAttribute('data-type');
    setPipValueMultiplier(multiplier);
    setSelectedInstrument(selectedOption.text);
    setInstrumentType(instType);
  };

  const loadConfiguration = (config) => {
    setConfigName(config.config_name);
    setBalance(config.default_balance);
    setLot(config.default_lot_size);
    setSlPips(config.default_stop_loss_pips);
    setRr(config.default_reward_risk_ratio);
    setTrailPips(config.default_trail_pips);
    setPipValueMultiplier(config.instrument_multiplier);
    setSelectedInstrument(config.instrument);
    setInstrumentType(config.instrument_type);
    setNotes(config.notes || '');
    setShowSavedConfigs(false);
  };

  const handleSave = async () => {
    if (!userId) {
      setSaveStatus({ type: 'error', message: 'Please log in to save configurations' });
      return;
    }

    if (!configName.trim()) {
      setSaveStatus({ type: 'error', message: 'Please enter a configuration name' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    const configData = {
      config_name: configName,
      instrument_type: instrumentType,
      instrument: selectedInstrument,
      instrument_multiplier: pipValueMultiplier,
      default_balance: balance,
      default_lot_size: lot,
      default_stop_loss_pips: slPips,
      default_reward_risk_ratio: rr,
      default_trail_pips: trailPips,
      use_trailing_stop: true,
      auto_risk_management: true,
      max_risk_percentage: 2.0,
      partial_tp_enabled: true,
      tp1_percentage: 50,
      tp2_percentage: 50,
      notes: notes,
      is_active: savedConfigs.length === 0
    };

    try {
      const savedConfig = await db.createForexConfig(userId, configData);
      setSaveStatus({ type: 'success', message: 'Configuration saved successfully!' });
      await loadSavedConfigurations();
      
      if (savedConfigs.length === 0) {
        setActiveConfigId(savedConfig.id);
      }
      
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save configuration. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetActive = async (configId) => {
    try {
      await db.setActiveForexConfig(userId, configId);
      setActiveConfigId(configId);
      const activeConfig = savedConfigs.find(c => c.id === configId);
      if (activeConfig) {
        loadConfiguration(activeConfig);
      }
      setSaveStatus({ type: 'success', message: 'Active configuration updated!' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error setting active config:', error);
      setSaveStatus({ type: 'error', message: 'Failed to set active configuration.' });
    }
  };

  const handleDeleteConfig = async (configId) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      try {
        await db.deleteForexConfig(configId);
        await loadSavedConfigurations();
        if (activeConfigId === configId) {
          setActiveConfigId(null);
        }
        setSaveStatus({ type: 'success', message: 'Configuration deleted successfully!' });
        setTimeout(() => setSaveStatus(null), 3000);
      } catch (error) {
        console.error('Delete error:', error);
        setSaveStatus({ type: 'error', message: 'Failed to delete configuration.' });
      }
    }
  };

  return (
    <>
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
        }

        * { 
          box-sizing: border-box; 
        }
        
        .forex-calculator-container {
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

        select, input[type=number], input[type=text], textarea {
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

        .btn:hover:not(:disabled) { opacity: 0.9; }
        .btn:disabled { opacity: 0.5; }

        .dropdown-btn {
          width: 100%;
          padding: 10px;
          background: var(--color-background-secondary);
          border: 0.5px solid var(--color-border-secondary);
          border-radius: var(--border-radius-md);
          cursor: pointer;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .configs-list {
          margin-top: 10px;
          max-height: 300px;
          overflow-y: auto;
        }

        .config-item {
          padding: 10px;
          border-bottom: 0.5px solid var(--color-border-tertiary);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .active-config {
          background: var(--color-background-info);
        }

        .save-status {
          margin-top: 12px;
          padding: 10px;
          border-radius: var(--border-radius-md);
          font-size: 13px;
          text-align: center;
        }

        .save-status.success {
          background: var(--color-background-success);
          color: var(--color-text-success);
        }

        .save-status.error {
          background: var(--color-background-danger);
          color: var(--color-text-danger);
        }

        @media (max-width: 600px) {
          .mgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .input-group { grid-template-columns: 1fr; }
          .row { flex-wrap: wrap; }
          .row label { min-width: 100px; }
        }
      `}</style>

      <div className="forex-calculator-container">
        {/* Saved Configurations Dropdown */}
        {userId && savedConfigs.length > 0 && (
          <div className="card">
            <div className="section-title">💾 Saved Configurations</div>
            {activeConfigId && (
              <div style={{ marginBottom: '10px', fontSize: '12px', color: 'var(--color-text-success)' }}>
                ✅ Active: {savedConfigs.find(c => c.id === activeConfigId)?.config_name}
              </div>
            )}
            <div className="saved-configs">
              <button 
                className="dropdown-btn"
                onClick={() => setShowSavedConfigs(!showSavedConfigs)}
              >
                <span>📋 Load saved configuration ({savedConfigs.length})</span>
                <span>{showSavedConfigs ? '▲' : '▼'}</span>
              </button>
              
              {showSavedConfigs && (
                <div className="configs-list">
                  {savedConfigs.map(config => (
                    <div 
                      key={config.id} 
                      className={`config-item ${activeConfigId === config.id ? 'active-config' : ''}`}
                    >
                      <div onClick={() => loadConfiguration(config)} style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontWeight: '500', fontSize: '13px' }}>
                          {config.config_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {config.instrument} | Balance: ${config.default_balance} | Lot: {config.default_lot_size}
                        </div>
                        {config.notes && (
                          <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                            📝 {config.notes.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {activeConfigId !== config.id && (
                          <button
                            onClick={() => handleSetActive(config.id)}
                            style={{
                              background: 'var(--color-text-success)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteConfig(config.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-danger)',
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '5px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card 1: Trade Setup */}
        <div className="card">
          <div className="section-title">⚙️ Trade Setup</div>

          <div className="row">
            <label>Configuration Name</label>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Enter a name for this configuration"
            />
          </div>

          <div className="input-group">
            <div className="field">
              <label>Instrument</label>
              <select onChange={handleInstrumentChange}>
                <option value="1000" data-multiplier="1000" data-type="forex">EURUSD / GBPUSD / USDCHF — $10/pip/lot</option>
                <option value="1000" data-multiplier="1000" data-type="forex">AUDUSD / NZDUSD — $10/pip/lot</option>
                <option value="770" data-multiplier="770" data-type="forex">USDJPY (approx) — $7.70/pip/lot</option>
                <option value="100" data-multiplier="100" data-type="gold" selected>XAUUSD (Gold) — $1/pip/0.01lot</option>
                <option value="100" data-multiplier="100" data-type="indices">US30 / NAS100 — $1/pt/0.01lot</option>
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

          <div className="row">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this trade setup..."
              rows="2"
            />
          </div>

          {riskWarning && (
            <div className="warn show">{riskWarning}</div>
          )}

          {saveStatus && (
            <div className={`save-status ${saveStatus.type}`}>
              {saveStatus.message}
            </div>
          )}
        </div>

        {/* Card 2: Exit Levels */}
        <div className="card">
          <div className="section-title">📐 Exit Levels</div>
          <div className="mgrid">
            <div className="met">
              <div className="lbl">Stop Loss</div>
              <div className="val" style={{ color: 'var(--color-text-danger)' }}>
                -${slDollar.toFixed(2)}
              </div>
              <div className="sub">{slPips} pips</div>
            </div>
            <div className="met">
              <div className="lbl">Take Profit 1 (50%)</div>
              <div className="val" style={{ color: 'var(--color-text-success)' }}>
                +${tp1Dollar.toFixed(2)}
              </div>
              <div className="sub">{tp1Pips.toFixed(0)} pips</div>
            </div>
            <div className="met">
              <div className="lbl">Take Profit 2 (50%)</div>
              <div className="val" style={{ color: 'var(--color-text-success)' }}>
                +${tp2Dollar.toFixed(2)}
              </div>
              <div className="sub">{tp2Pips.toFixed(0)} pips</div>
            </div>
          </div>
          <div className="mgrid">
            <div className="met">
              <div className="lbl">Pip Value (per lot)</div>
              <div className="val" style={{ color: 'var(--color-text-info)' }}>
                ${pipValue.toFixed(2)}
              </div>
            </div>
            <div className="met">
              <div className="lbl">Risk % of Balance</div>
              <div className="val">{riskPct.toFixed(2)}%</div>
            </div>
            <div className="met">
              <div className="lbl">Breakeven Win Rate</div>
              <div className="val" style={{ color: 'var(--color-text-info)' }}>
                {(bwr * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Expected Value */}
        <div className="card">
          <div className="section-title">📊 Expected Value by Win Rate</div>
          <div>
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
              <div className="lbl">Full TP Max Profit</div>
              <div className="val" style={{ color: 'var(--color-text-success)' }}>
                +${maxProfit.toFixed(2)}
              </div>
            </div>
            <div className="met">
              <div className="lbl">Recommended Lot (2% risk)</div>
              <div className="val" style={{ color: 'var(--color-text-warning)' }}>
                {Math.max(0.01, recLot).toFixed(2)} lots
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Trailing Stop */}
        <div className="card">
          <div className="section-title">🔁 Trailing Stop (after TP1 hit)</div>
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
              <div className="lbl">Locked Profit (50% pos)</div>
              <div className="val" style={{ color: 'var(--color-text-success)' }}>
                +${lockedProfit.toFixed(2)}
              </div>
            </div>
            <div className="met">
              <div className="lbl">Trail Stop Value</div>
              <div className="val" style={{ color: 'var(--color-text-warning)' }}>
                -${trailLoss.toFixed(2)}
              </div>
              <div className="sub">if reversed</div>
            </div>
            <div className="met">
              <div className="lbl">Net Worst Case</div>
              <div
                className="val"
                style={{ color: netWorst >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}
              >
                {netWorst >= 0 ? '+' : ''}${netWorst.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button
            className="btn"
            onClick={handleSave}
            disabled={isSaving}
            style={{ 
              background: isSaving ? 'var(--color-text-tertiary)' : 'var(--color-text-success)',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? '💾 Saving...' : '💾 Save Configuration'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '1rem' }}>
          All calculations are for educational purposes. Trade at your own risk.
        </p>
      </div>
    </>
  );
};

export default ForexExitCalculator;