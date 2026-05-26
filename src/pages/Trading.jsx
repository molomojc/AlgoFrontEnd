// Trading.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import {
  ChartBarIcon,
  NewspaperIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  PlayIcon,
  StopIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// ==================== MODE SELECTION CARD ====================
const ModeSelectionCard = ({ 
  mode, 
  title, 
  description, 
  icon: Icon, 
  isSelected, 
  onSelect,
  features 
}) => {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(mode)}
      className={`relative cursor-pointer rounded-lg border p-5 transition-colors ${
        isSelected
          ? "border-primary-600 bg-primary-50"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      {isSelected && (
        <div className="absolute top-4 right-4">
          <CheckCircleIcon className="h-5 w-5 text-primary-600" />
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <div className={`inline-flex rounded-md p-2 ${
          isSelected ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-700"
        }`}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
      </div>
      
      <ul className="mt-4 space-y-2 text-sm text-gray-600">
        {features.slice(0, 3).map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
            <span className="flex-1">{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

// ==================== TECHNICAL ANALYSIS PANEL (Auto Trade Settings Only) ====================
const TechnicalPanel = ({
  userId,
  autoTradeSettings,
  onSaveAutoTradeSettings,
  isSavingAutoTradeSettings,
}) => {
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [Target_amount, setTargetAmount] = useState(50);
  const [watchlist, setWatchlist] = useState(["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD"]);
  const [minConfidence, setMinConfidence] = useState(75);
  const [maxPositions, setMaxPositions] = useState(5);
  const [riskPerTrade, setRiskPerTrade] = useState(2.0);
  const [scanIntervalMinutes, setScanIntervalMinutes] = useState(15);
  const [enableAiPositionManagement, setEnableAiPositionManagement] = useState(true);
  const [aiPositionManagementInterval, setAiPositionManagementInterval] = useState("1");
  const [aiMinConfidenceToClose, setAiMinConfidenceToClose] = useState(65);
  const [aiCheckFrequencySeconds, setAiCheckFrequencySeconds] = useState(30);
  
  useEffect(() => {
    if (!autoTradeSettings) return;

    setAutoEnabled(!!autoTradeSettings.enabled);
    if (Array.isArray(autoTradeSettings.watchlist) && autoTradeSettings.watchlist.length > 0) {
      setWatchlist(autoTradeSettings.watchlist);
    }
    if (typeof autoTradeSettings.target_amount === "number") setTargetAmount(autoTradeSettings.target_amount);
    if (typeof autoTradeSettings.min_confidence === "number") setMinConfidence(autoTradeSettings.min_confidence);
    if (typeof autoTradeSettings.max_positions === "number") setMaxPositions(autoTradeSettings.max_positions);
    if (typeof autoTradeSettings.risk_per_trade === "number") setRiskPerTrade(autoTradeSettings.risk_per_trade);
    if (typeof autoTradeSettings.scan_interval_minutes === "number") setScanIntervalMinutes(autoTradeSettings.scan_interval_minutes);
    if (typeof autoTradeSettings.enable_ai_position_management === "boolean") {
      setEnableAiPositionManagement(autoTradeSettings.enable_ai_position_management);
    }
    if (typeof autoTradeSettings.ai_position_management_interval === "string") {
      setAiPositionManagementInterval(autoTradeSettings.ai_position_management_interval);
    }
    if (typeof autoTradeSettings.ai_min_confidence_to_close === "number") {
      setAiMinConfidenceToClose(autoTradeSettings.ai_min_confidence_to_close);
    }
    if (typeof autoTradeSettings.ai_check_frequency_seconds === "number") {
      setAiCheckFrequencySeconds(autoTradeSettings.ai_check_frequency_seconds);
    }
  }, [autoTradeSettings]);
  
  const tradingPairs = [
    { symbol: "XAUUSD", name: "Gold / USD", category: "forex" },
    { symbol: "EURUSD", name: "Euro / USD", category: "forex" },
    { symbol: "GBPUSD", name: "British Pound / USD", category: "forex" },
    { symbol: "USDJPY", name: "USD / Japanese Yen", category: "forex" },
    { symbol: "BTCUSD", name: "Bitcoin / USD", category: "crypto" },
    { symbol: "ETHUSD", name: "Ethereum / USD", category: "crypto" },
  ];

  const toggleWatchlistSymbol = (symbol) => {
    setWatchlist((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  };

  const handleSaveAutoTradeSettings = async () => {
    if (!userId) {
      toast.error("You must be signed in");
      return;
    }

    const safeWatchlist = Array.from(new Set(watchlist.filter(Boolean)));
    if (safeWatchlist.length === 0) {
      toast.error("Watchlist cannot be empty");
      return;
    }

    await onSaveAutoTradeSettings({
      enabled: autoEnabled,
      watchlist: safeWatchlist,
      min_confidence: minConfidence,
      max_positions: maxPositions,
      risk_per_trade: riskPerTrade,
      target_amount: Target_amount,
      scan_interval_minutes: scanIntervalMinutes,
      enable_ai_position_management: enableAiPositionManagement,
      ai_position_management_interval: aiPositionManagementInterval,
      ai_min_confidence_to_close: aiMinConfidenceToClose,
      ai_check_frequency_seconds: aiCheckFrequencySeconds,

    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold mb-6 flex items-center">
        <Cog6ToothIcon className="h-6 w-6 mr-3 text-blue-600" />
        Auto Trade Settings
      </h3>
      
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Cog6ToothIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <div className="font-semibold text-gray-900">Auto Trade</div>
              <div className="text-sm text-gray-600">Configure your automated trading settings</div>
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={autoEnabled}
              onChange={(e) => setAutoEnabled(e.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-700">Enabled</span>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-3 border border-blue-100">
            <div className="text-sm font-medium text-gray-900 mb-2">Watchlist</div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {tradingPairs.map((pair) => (
                <label key={pair.symbol} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {pair.symbol} <span className="text-gray-400">({pair.category})</span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={watchlist.includes(pair.symbol)}
                    onChange={() => toggleWatchlistSymbol(pair.symbol)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-white p-3 border border-blue-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Confidence</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseInt(e.target.value || "0", 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Positions</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxPositions}
                  onChange={(e) => setMaxPositions(parseInt(e.target.value || "1", 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Risk / Trade (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={riskPerTrade}
                  onChange={(e) => setRiskPerTrade(parseFloat(e.target.value || "0"))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Scan Interval (min)</label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={scanIntervalMinutes}
                  onChange={(e) => setScanIntervalMinutes(parseInt(e.target.value || "1", 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Amount</label>
                <input
                  type="number"
                  value={Target_amount}
                  onChange={(e) => setTargetAmount(parseInt(e.target.value || "1", 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>



            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-white p-3 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">AI Position Management</div>
              <div className="text-xs text-gray-500">Auto-manage positions at a fixed interval</div>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={enableAiPositionManagement}
              onChange={(e) => setEnableAiPositionManagement(e.target.checked)}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mgmt Interval</label>
              <input
                type="text"
                value={aiPositionManagementInterval}
                onChange={(e) => setAiPositionManagementInterval(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Conf. To Close</label>
              <input
                type="number"
                min="0"
                max="100"
                value={aiMinConfidenceToClose}
                onChange={(e) => setAiMinConfidenceToClose(parseInt(e.target.value || "0", 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AI Check Freq (sec)</label>
              <input
                type="number"
                min="5"
                max="3600"
                value={aiCheckFrequencySeconds}
                onChange={(e) => setAiCheckFrequencySeconds(parseInt(e.target.value || "5", 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAutoTradeSettings}
          disabled={!userId || isSavingAutoTradeSettings}
          className="mt-4 w-full rounded-md bg-primary-600 py-3 font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
        >
          {isSavingAutoTradeSettings ? (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              Saving Auto Trade Settings...
            </>
          ) : (
            <>
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Save Auto Trade Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ==================== FUNDAMENTAL ANALYSIS PANEL ====================
const FundamentalPanel = ({ onCreateTrade, isCreating }) => {
  const [newsEvents, setNewsEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numTrades, setNumTrades] = useState(1);
  const [lotSize, setLotSize] = useState(0.01);
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [tradeTime, setTradeTime] = useState("12:00");
  const [Currency, setCurrency] = useState("");
  const [enableSentiment, setEnableSentiment] = useState(true);
  const [impactFilter, setImpactFilter] = useState("all");

  useEffect(() => {
    loadNewsEvents();
  }, []);

  const loadNewsEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('news_events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
        .limit(20);

      if (error) throw error;
      setNewsEvents(data || []);
    } catch (error) {
      toast.error('Failed to load news events');
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredEvents = newsEvents.filter(event => {
    if (impactFilter === "all") return true;
    return event.impact?.toLowerCase() === impactFilter;
  });

  const handleSubmit = () => {
    if (!selectedEvent) {
      toast.error("Please select a news event");
      return;
    }
    
    if (!Currency) {
      toast.error("Please enter a currency pair");
      return;
    }
    
    const formattedTime = tradeTime.includes(':') ? 
      (tradeTime.split(':').length === 2 ? tradeTime + ':00' : tradeTime) : 
      tradeTime + ':00';
    
    onCreateTrade({
      mode: "fundamental",
      currency: selectedEvent.currency,
      trade_pair: Currency,
      news_event: selectedEvent.event,
      impact: selectedEvent.impact || 'medium',
      trade_date: tradeDate,
      trade_time: formattedTime,
      num_trades: numTrades,
      lot_size: lotSize,
      event_id: selectedEvent.id,
      enable_sentiment: enableSentiment,
      status: "pending"
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold mb-6 flex items-center">
        <NewspaperIcon className="h-6 w-6 mr-3 text-purple-600" />
        Fundamental Trade Setup
      </h3>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* News Events List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Select News Event
            </label>
            <select 
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1"
            >
              <option value="all">All Impacts</option>
              <option value="high">High Impact</option>
              <option value="medium">Medium Impact</option>
              <option value="low">Low Impact</option>
            </select>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No upcoming news events
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full text-left p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                      selectedEvent?.id === event.id ? "bg-purple-50 border-l-4 border-l-purple-600" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900">{event.currency}</span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getImpactColor(event.impact)}`}>
                        {event.impact || 'medium'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-800 mb-2">{event.event}</p>
                    
                    <div className="flex items-center text-xs text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {event.event_time ? new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString() : 'N/A'}
                      </span>
                      {event.forecast && (
                        <span>Forecast: {event.forecast}</span>
                      )}
                      {event.previous && (
                        <span>Previous: {event.previous}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Trade Configuration */}
        <div>
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center mb-2">
              <CurrencyDollarIcon className="h-5 w-5 text-purple-600 mr-2" />
              <span className="font-medium text-gray-900">Selected Event</span>
            </div>
            {selectedEvent ? (
              <div className="text-sm text-gray-700">
                <p><span className="font-medium">Currency:</span> {selectedEvent.currency}</p>
                <p><span className="font-medium">Event:</span> {selectedEvent.event}</p>
                <p><span className="font-medium">Impact:</span> {selectedEvent.impact}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No event selected</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Trades
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={numTrades}
                onChange={(e) => setNumTrades(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lot Size
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(parseFloat(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Date
              </label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency Pair
              </label>
              <input
                type="text"
                value={Currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="e.g., EURUSD, GBPUSD"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Time
              </label>
              <input
                type="time"
                value={tradeTime}
                onChange={(e) => setTradeTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={enableSentiment}
                onChange={(e) => setEnableSentiment(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Use AI sentiment analysis for this trade</span>
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedEvent || isCreating}
            className="w-full rounded-md bg-primary-600 py-4 font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
          >
            {isCreating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Creating Trade Request...
              </>
            ) : (
              <>
                <RocketLaunchIcon className="h-5 w-5 mr-2" />
                Create Fundamental Trade
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== TRADE CREATED SUCCESS ====================
const TradeCreatedSuccess = ({ trade, onViewTrades }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-green-900"
    >
      <div className="flex items-center justify-center mb-6">
        <div className="bg-white/20 rounded-full p-4">
          <CheckCircleIcon className="h-16 w-16 text-white" />
        </div>
      </div>
      
      <h3 className="text-3xl font-bold text-center mb-4">
        Trade Request Created Successfully!
      </h3>
      
      <p className="text-center text-white/90 text-lg mb-8">
        Your trade has been submitted to the bot and will be executed at the scheduled time.
      </p>

      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-white/70 text-sm mb-1">Trade Pair</div>
            <div className="text-xl font-bold">{trade.trade_pair || trade.currency + 'USD'}</div>
          </div>
          <div>
            <div className="text-white/70 text-sm mb-1">News Event</div>
            <div className="text-xl font-bold truncate">{trade.news_event}</div>
          </div>
          <div>
            <div className="text-white/70 text-sm mb-1">Date/Time</div>
            <div className="text-xl font-bold">{trade.trade_date} {trade.trade_time}</div>
          </div>
          <div>
            <div className="text-white/70 text-sm mb-1">Configuration</div>
            <div className="text-xl font-bold">{trade.num_trades} × {trade.lot_size} lots</div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onViewTrades}
          className="flex-1 py-4 bg-white text-green-600 rounded-xl font-semibold hover:bg-gray-100 transition-all"
        >
          View All Trades
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 py-4 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all"
        >
          Create Another Trade
        </button>
      </div>
    </motion.div>
  );
};

// ==================== MAIN TRADING COMPONENT ====================
export default function Trading() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedMode, setSelectedMode] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingAutoTradeSettings, setIsSavingAutoTradeSettings] = useState(false);
  const [createdTrade, setCreatedTrade] = useState(null);
  const [botStatus, setBotStatus] = useState(null);
  const [autoTradeSettings, setAutoTradeSettings] = useState(null);

  useEffect(() => {
    if (user) {
      loadBotStatus();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setAutoTradeSettings(null);
      return;
    }
    loadAutoTradeSettings(user.id);
  }, [user?.id]);

  const loadBotStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*, bot_status(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      setBotStatus(data);
    } catch (error) {
      console.error('Error loading bot status:', error);
    }
  };

  const loadAutoTradeSettings = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("auto_trade_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setAutoTradeSettings(data ?? null);
    } catch (error) {
      console.error("Error loading auto trade settings:", error);
      setAutoTradeSettings(null);
    }
  };

  const saveAutoTradeSettings = async (payload) => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    setIsSavingAutoTradeSettings(true);

    try {
      const { data, error } = await supabase
        .from("auto_trade_settings")
        .upsert(
          {
            user_id: user.id,
            enabled: payload.enabled,
            watchlist: payload.watchlist,
            min_confidence: payload.min_confidence,
            target_today: payload.target_amount,
            max_positions: payload.max_positions,
            risk_per_trade: payload.risk_per_trade,
            scan_interval_minutes: payload.scan_interval_minutes,
            enable_ai_position_management: payload.enable_ai_position_management,
            ai_position_management_interval: payload.ai_position_management_interval,
            ai_min_confidence_to_close: payload.ai_min_confidence_to_close,
            ai_check_frequency_seconds: payload.ai_check_frequency_seconds,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;

      setAutoTradeSettings(data);
      toast.success("Auto trade settings saved");
    } catch (error) {
      toast.error("Failed to save auto trade: " + error.message);
      console.error(error);
    } finally {
      setIsSavingAutoTradeSettings(false);
    }
  };

  const handleCreateTrade = async (tradeData) => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from('trade_requests')
        .insert({
          currency: tradeData.currency,
          trade_pair: tradeData.trade_pair,
          news_event: tradeData.news_event,
          impact: tradeData.impact,
          trade_date: tradeData.trade_date,
          trade_time: tradeData.trade_time,
          user_id: user.id,
          num_trades: tradeData.num_trades,
          lot_size: tradeData.lot_size,
          status: 'pending',
          ai_metadata: tradeData.mode === 'fundamental' ? {
            event_id: tradeData.event_id,
            enable_sentiment: tradeData.enable_sentiment
          } : {
            analysis_type: tradeData.analysis_type
          }
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedTrade(data);
      toast.success('Trade request created successfully!');
      
    } catch (error) {
      toast.error('Failed to create trade: ' + error.message);
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const modes = [
    {
      id: "technical",
      title: "Auto Trade Settings",
      description: "Configure your automated trading preferences",
      icon: Cog6ToothIcon,
      features: [
        "Watchlist management",
        "Risk control settings",
        "AI position management",
        "Automated execution"
      ]
    },
    {
      id: "fundamental",
      title: "Fundamental Trade",
      description: "Create trades based on news events and economic data",
      icon: NewspaperIcon,
      features: [
        "Economic calendar integration",
        "News impact analysis",
        "AI sentiment analysis",
        "Scheduled execution"
      ]
    }
  ];

  if (!user) {
    return (
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Trading</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create trades for the bot and manage automated execution settings.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Bot Status Banner */}
        {botStatus && (
          <div className={`border-b p-4 ${
            botStatus.status === 'running' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {botStatus.status === 'running' ? (
                  <PlayIcon className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <StopIcon className="h-5 w-5 text-gray-600 mr-2" />
                )}
                <span className={botStatus.status === 'running' ? 'text-green-700' : 'text-gray-700'}>
                  Trading Bot is {botStatus.status === 'running' ? 'running' : 'stopped'}
                </span>
              </div>
              <button 
                onClick={() => navigate('/profile')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
        {/* Success Message */}
        {createdTrade ? (
          <TradeCreatedSuccess 
            trade={createdTrade}
            onViewTrades={() => navigate('/trades')}
          />
        ) : (
          <>
            {/* Mode Selection */}
            {!selectedMode ? (
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Select a trade type
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Choose how you want the bot to create and manage trades.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {modes.map((mode) => (
                    <ModeSelectionCard
                      key={mode.id}
                      mode={mode.id}
                      title={mode.title}
                      description={mode.description}
                      icon={mode.icon}
                      features={mode.features}
                      isSelected={selectedMode === mode.id}
                      onSelect={setSelectedMode}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {/* Back Button */}
                <button
                  onClick={() => {
                    setSelectedMode(null);
                  }}
                  className="mb-6 inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to trade type selection
                </button>

                {/* Trade Panel */}
                {selectedMode === 'technical' && (
                  <TechnicalPanel
                    userId={user?.id}
                    autoTradeSettings={autoTradeSettings}
                    onSaveAutoTradeSettings={saveAutoTradeSettings}
                    isSavingAutoTradeSettings={isSavingAutoTradeSettings}
                  />
                )}

                {selectedMode === 'fundamental' && (
                  <FundamentalPanel
                    onCreateTrade={handleCreateTrade}
                    isCreating={isCreating}
                  />
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
