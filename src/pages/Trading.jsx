// Trading.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import {
  ChartBarIcon,
  NewspaperIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  Cog6ToothIcon,
  PlayIcon,
  StopIcon,
  CurrencyDollarIcon,
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(mode)}
      className={`relative cursor-pointer rounded-2xl p-8 transition-all duration-300 ${
        isSelected
          ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-2xl shadow-blue-500/30"
          : "bg-white text-gray-900 hover:shadow-xl border-2 border-gray-200 hover:border-blue-400"
      }`}
    >
      {isSelected && (
        <div className="absolute top-4 right-4">
          <CheckCircleIcon className="h-6 w-6 text-white" />
        </div>
      )}
      
      <div className={`inline-flex p-4 rounded-xl mb-6 ${
        isSelected ? "bg-white/20" : "bg-blue-100"
      }`}>
        <Icon className={`h-8 w-8 ${
          isSelected ? "text-white" : "text-blue-600"
        }`} />
      </div>
      
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className={`mb-6 ${
        isSelected ? "text-white/90" : "text-gray-600"
      }`}>{description}</p>
      
      <div className="space-y-3">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center">
            <CheckCircleIcon className={`h-5 w-5 mr-3 flex-shrink-0 ${
              isSelected ? "text-white" : "text-green-500"
            }`} />
            <span className={isSelected ? "text-white/90" : "text-gray-700"}>
              {feature}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ==================== TECHNICAL ANALYSIS PANEL ====================
const TechnicalPanel = ({ selectedPair, onPairSelect, onCreateTrade, isCreating }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [numTrades, setNumTrades] = useState(1);
  const [lotSize, setLotSize] = useState(0.01);
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [tradeTime, setTradeTime] = useState("12:00");
  
  const tradingPairs = [
    { symbol: "XAUUSD", name: "Gold / USD", category: "forex" },
    { symbol: "EURUSD", name: "Euro / USD", category: "forex" },
    { symbol: "GBPUSD", name: "British Pound / USD", category: "forex" },
    { symbol: "USDJPY", name: "USD / Japanese Yen", category: "forex" },
    { symbol: "BTCUSD", name: "Bitcoin / USD", category: "crypto" },
    { symbol: "ETHUSD", name: "Ethereum / USD", category: "crypto" },
    { symbol: "AAPL", name: "Apple Inc.", category: "stocks" },
    { symbol: "MSFT", name: "Microsoft Corp.", category: "stocks" },
    { symbol: "SPX500", name: "S&P 500 Index", category: "indices" },
  ];

  const filteredPairs = tradingPairs.filter(pair => 
    pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    if (!selectedPair) {
      toast.error("Please select a trading pair");
      return;
    }
    
    onCreateTrade({
      mode: "technical",
      currency: selectedPair.substring(0, 3), // Extract currency from pair
      trade_pair: selectedPair,
      news_event: "Technical Analysis - " + new Date().toLocaleDateString(),
      impact: "medium",
      trade_date: tradeDate,
      trade_time: tradeTime + ":00",
      num_trades: numTrades,
      lot_size: lotSize,
      status: "pending"
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-2xl font-bold mb-6 flex items-center">
        <ChartBarIcon className="h-6 w-6 mr-3 text-blue-600" />
        Technical Trade Setup
      </h3>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Pair Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Trading Pair
          </label>
          
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search pairs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {filteredPairs.map((pair) => (
              <button
                key={pair.symbol}
                onClick={() => onPairSelect(pair.symbol)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                  selectedPair === pair.symbol ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900">{pair.symbol}</span>
                    <span className="text-sm text-gray-500 ml-2">{pair.name}</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {pair.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Trade Configuration */}
        <div>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!selectedPair || isCreating}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center"
          >
            {isCreating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Creating Trade Request...
              </>
            ) : (
              <>
                <RocketLaunchIcon className="h-5 w-5 mr-2" />
                Create Technical Trade
              </>
            )}
          </button>
        </div>
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
  const [Currency, setCurrency] = useState();
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
    
    // Format trade_time properly (ensure seconds)
    const formattedTime = tradeTime.includes(':') ? 
      (tradeTime.split(':').length === 2 ? tradeTime + ':00' : tradeTime) : 
      tradeTime + ':00';
    
    onCreateTrade({
      mode: "fundamental",
      currency: selectedEvent.currency,
      trade_pair: Currency, // Default pair based on currency
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
    <div className="bg-white rounded-2xl shadow-xl p-6">
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
                        {new Date(`2000-01-01T${event.event_time}`).toLocaleTimeString()}
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
                Curency
              </label>
              <input
                type="text"
                value={Currency}
                onChange={(e) => setCurrency(e.target.value)}
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
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center"
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
      className="mt-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-2xl p-8 text-white"
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
  const [selectedPair, setSelectedPair] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTrade, setCreatedTrade] = useState(null);
  const [botStatus, setBotStatus] = useState(null);

  useEffect(() => {
    if (user) {
      loadBotStatus();
    }
  }, [user]);

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

  const handleCreateTrade = async (tradeData) => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    setIsCreating(true);

    try {
      // Insert into trade_requests table
      const { data, error } = await supabase
        .from('trade_requests')
        .insert({
          currency: tradeData.currency,
          trade_pair: tradeData.trade_pair,
          news_event: tradeData.news_event,
          impact: tradeData.impact,
          trade_date: tradeData.trade_date,
          trade_time: tradeData.trade_time,
          user_id: 'd6b06acd-553b-45f7-af1e-07b9fd6fe4df',
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
      title: "Technical Trade",
      description: "Create trades based on technical analysis and chart patterns",
      icon: ChartBarIcon,
      features: [
        "Multiple timeframe analysis",
        "AI pattern recognition",
        "Support/resistance levels",
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Trade Creator</h1>
          <p className="text-gray-600">
            Create automated trades that will be executed by the AI trading bot
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Bot Status Banner */}
        {botStatus && (
          <div className={`mb-8 p-4 rounded-xl ${
            botStatus.status === 'running' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-gray-50 border border-gray-200'
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Select Trade Type
                </h2>
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
                    setSelectedPair(null);
                  }}
                  className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to trade type selection
                </button>

                {/* Trade Panel */}
                {selectedMode === 'technical' && (
                  <TechnicalPanel
                    selectedPair={selectedPair}
                    onPairSelect={setSelectedPair}
                    onCreateTrade={handleCreateTrade}
                    isCreating={isCreating}
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
  );
}