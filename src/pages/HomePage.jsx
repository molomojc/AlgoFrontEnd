import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ChartBarIcon,
  GlobeAltIcon,
  BellAlertIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  PlayIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  BoltIcon,
  LockClosedIcon,
  CommandLineIcon
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

//////////////////////////////////////////////////////////
// Animated Counter
//////////////////////////////////////////////////////////

const AnimatedCounter = ({ value, duration = 2000, prefix = "", suffix = "" }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let start = 0;
    const increment = value / (duration / 16);
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * value);
      
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, isVisible]);

  return (
    <span ref={counterRef} className="tabular-nums">
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

//////////////////////////////////////////////////////////
// Market Ticker
//////////////////////////////////////////////////////////

const MarketTicker = () => {
  const [markets] = useState([
    { symbol: "XAUUSD", price: 2034.52, change: 12.34, changePercent: 0.61 },
    { symbol: "EURUSD", price: 1.0876, change: 0.0023, changePercent: 0.21 },
    { symbol: "GBPUSD", price: 1.2654, change: -0.0012, changePercent: -0.09 },
    { symbol: "BTCUSD", price: 67340, change: 1245, changePercent: 1.88 },
    { symbol: "ETHUSD", price: 3452.10, change: -45, changePercent: -1.29 },
    { symbol: "SPX500", price: 5120.35, change: 23.45, changePercent: 0.46 },
    { symbol: "USDJPY", price: 154.23, change: -0.23, changePercent: -0.15 },
    { symbol: "AUDUSD", price: 0.6582, change: 0.0034, changePercent: 0.52 },
  ]);

  return (
    <div className="bg-[#080d1a] border-b border-gray-800/80 overflow-hidden relative z-20">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
      <div className="ticker-container overflow-hidden whitespace-nowrap py-2.5 relative">
        <div className="ticker-content inline-block animate-ticker">
          {markets.concat(markets).map((market, index) => (
            <div key={index} className="inline-flex items-center mx-6 px-3 py-1 rounded-lg hover:bg-gray-800/30 transition-all duration-200 cursor-default">
              <span className="font-semibold text-gray-200 text-xs tracking-wider">{market.symbol}</span>
              <span className="ml-2.5 text-gray-400 font-mono text-xs">
                ${market.price.toFixed(market.symbol.includes('USD') && market.price > 100 ? 0 : 4)}
              </span>
              <span
                className={`ml-2 flex items-center font-mono text-xs font-semibold ${
                  market.change >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {market.change >= 0 ? (
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5 mr-0.5" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3.5 w-3.5 mr-0.5" />
                )}
                {market.changePercent >= 0 ? "+" : ""}{market.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Live Candlestick Canvas Background
//////////////////////////////////////////////////////////

const CandlestickCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrame;
    let width = (canvas.width = canvas.parentElement.offsetWidth);
    let height = (canvas.height = canvas.parentElement.offsetHeight || 500);

    // Generate initial candles
    const candles = [];
    const maxCandles = 40;
    let currentPrice = 2030;
    
    for (let i = 0; i < maxCandles; i++) {
      const open = currentPrice + (Math.random() - 0.5) * 4;
      const close = open + (Math.random() - 0.5) * 6;
      const high = Math.max(open, close) + Math.random() * 2.5;
      const low = Math.min(open, close) - Math.random() * 2.5;
      currentPrice = close;
      
      candles.push({ open, close, high, low });
    }

    let offset = 0;
    const speed = 0.4; // smooth slow scroll

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background grid lines
      ctx.strokeStyle = "rgba(31, 41, 55, 0.2)";
      ctx.lineWidth = 1;
      const numLines = 8;
      for (let i = 1; i < numLines; i++) {
        const y = (height / numLines) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw horizontal dashed target line (representing stop/limit level)
      ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, height * 0.45);
      ctx.lineTo(width, height * 0.45);
      ctx.stroke();
      ctx.setLineDash([]); // Reset
      
      ctx.fillStyle = "rgba(99, 102, 241, 0.4)";
      ctx.font = "9px monospace";
      ctx.fillText("ALGO RESISTANCE THRESHOLD", width - 160, height * 0.45 - 6);

      // Scroll physics
      offset += speed;
      const candleWidth = 14;
      const spacing = 14;
      const step = candleWidth + spacing;

      if (offset >= step) {
        offset = 0;
        candles.shift();
        const lastCandle = candles[candles.length - 1];
        const open = lastCandle.close;
        const drift = Math.sin(Date.now() / 20000) * 2; // slow drift wave
        const close = open + (Math.random() - 0.5) * 5 + drift;
        const high = Math.max(open, close) + Math.random() * 2.5;
        const low = Math.min(open, close) - Math.random() * 2.5;
        candles.push({ open, close, high, low });
      }

      // Find min and max for scaling
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      candles.forEach(c => {
        if (c.low < minPrice) minPrice = c.low;
        if (c.high > maxPrice) maxPrice = c.high;
      });
      
      minPrice -= 2;
      maxPrice += 2;
      const priceRange = maxPrice - minPrice;

      const emaPoints = [];

      // Draw Candlesticks
      candles.forEach((candle, idx) => {
        const x = idx * step - offset + spacing;
        
        const scaleY = (price) => {
          return height - ((price - minPrice) / priceRange) * (height - 80) - 40;
        };

        const yOpen = scaleY(candle.open);
        const yClose = scaleY(candle.close);
        const yHigh = scaleY(candle.high);
        const yLow = scaleY(candle.low);

        const isBullish = candle.close >= candle.open;
        const color = isBullish ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)";
        
        // Draw wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, yHigh);
        ctx.lineTo(x + candleWidth / 2, yLow);
        ctx.stroke();

        // Draw body
        ctx.fillStyle = color;
        const rectHeight = Math.max(2, Math.abs(yClose - yOpen));
        const rectY = Math.min(yOpen, yClose);
        ctx.fillRect(x, rectY, candleWidth, rectHeight);

        // Store EMA points
        emaPoints.push({ x: x + candleWidth / 2, y: (yOpen + yClose) / 2 });
      });

      // Draw smoothed trendline overlay
      if (emaPoints.length > 1) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(emaPoints[0].x, emaPoints[0].y);
        for (let i = 1; i < emaPoints.length; i++) {
          const xc = (emaPoints[i].x + emaPoints[i - 1].x) / 2;
          const yc = (emaPoints[i].y + emaPoints[i - 1].y) / 2;
          ctx.quadraticCurveTo(emaPoints[i - 1].x, emaPoints[i - 1].y, xc, yc);
        }
        ctx.stroke();
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.width = canvasRef.current.parentElement.offsetWidth;
        height = canvasRef.current.height = canvasRef.current.parentElement.offsetHeight || 500;
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full opacity-40 select-none pointer-events-none z-0">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

//////////////////////////////////////////////////////////
// Interactive Strategy Simulator Sandbox
//////////////////////////////////////////////////////////

const StrategySimulator = () => {
  const [botEnabled, setBotEnabled] = useState(true);
  const [asset, setAsset] = useState("XAUUSD");
  const [riskPercent, setRiskPercent] = useState(2.0);
  const [balance, setBalance] = useState(10245.50);
  const [pnl, setPnl] = useState(245.50);
  const [logs, setLogs] = useState([
    { time: "17:10:02", type: "system", text: "Sandbox simulation engine initialized." },
    { time: "17:11:15", type: "info", text: "Established direct execution link with broker API." },
    { time: "17:12:04", type: "buy", text: "Buy Trigger: EMA support bounce on XAUUSD @ 2031.10" },
    { time: "17:12:45", type: "win", text: "Take-Profit reached: +$125.00 (Risk: 1.5% - RR 1:2)" }
  ]);
  const [chartPoints, setChartPoints] = useState([10000, 10050, 10030, 10120, 10245.50]);
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!botEnabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      
      const rand = Math.random();
      if (rand < 0.25) {
        // Scanning log
        const side = Math.random() > 0.5 ? "BUY" : "SELL";
        const entryPrice = asset === "XAUUSD" 
          ? (2030 + (Math.random() - 0.5) * 10).toFixed(2) 
          : asset === "BTCUSD" 
          ? (67400 + (Math.random() - 0.5) * 200).toFixed(0)
          : (1.0850 + (Math.random() - 0.5) * 0.0020).toFixed(4);

        setLogs(prev => [
          ...prev,
          { time: timeStr, type: "info", text: `Scanning market order book for ${asset}...` },
          { time: timeStr, type: side.toLowerCase(), text: `Triggered automated ${side} order on ${asset} @ ${entryPrice}` }
        ].slice(-25));
      } else if (rand < 0.5) {
        // Closed position
        const isWin = Math.random() > 0.44; 
        const tradeAmount = (balance * (riskPercent / 100) * (isWin ? 1.4 : -1.0));
        const profitLoss = parseFloat(tradeAmount.toFixed(2));
        
        setBalance(prev => {
          const nextBal = parseFloat((prev + profitLoss).toFixed(2));
          setChartPoints(pts => [...pts, nextBal].slice(-15));
          return nextBal;
        });
        
        setPnl(prev => parseFloat((prev + profitLoss).toFixed(2)));

        setLogs(prev => [
          ...prev,
          { 
            time: timeStr, 
            type: isWin ? "win" : "loss", 
            text: isWin 
              ? `Order closed: Limit Target Hit! +$${profitLoss} (Risk: ${riskPercent}%)`
              : `Order closed: Stop-Loss Enforced. -$${Math.abs(profitLoss)} (Risk: ${riskPercent}%)` 
          }
        ].slice(-25));
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [botEnabled, asset, riskPercent, balance]);

  const handleToggle = () => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    if (botEnabled) {
      setLogs(prev => [...prev, { time: timeStr, type: "system", text: "Algorithmic execution loops suspended." }]);
    } else {
      setLogs(prev => [...prev, { time: timeStr, type: "system", text: "Resuming system execution loops..." }]);
    }
    setBotEnabled(!botEnabled);
  };

  return (
    <div className="w-full lg:w-[440px] bg-[#0c1322] border border-gray-800/90 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.25)] overflow-hidden backdrop-blur-md flex flex-col font-sans select-none relative z-10 transition-all duration-300 hover:border-indigo-500/40">
      
      {/* Terminal Title Bar */}
      <div className="bg-[#070b13] px-4 py-3 border-b border-gray-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${botEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
          <span className="text-xs font-mono font-bold tracking-wider text-gray-300">
            {botEnabled ? "STRATEGY BACKTEST EXECUTION" : "ENGINE SUSPENDED"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-500">LATENCY: 14ms</span>
      </div>

      {/* Account Info Bar */}
      <div className="grid grid-cols-2 border-b border-gray-800/60 bg-[#090f1a]/50 p-4">
        <div>
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Mock Balance</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Session Return</div>
          <div className={`text-lg font-bold font-mono mt-1 ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {pnl >= 0 ? "+" : ""}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Live Chart Line Graph */}
      <div className="h-20 bg-[#060a12] px-4 pt-3 relative flex items-end overflow-hidden border-b border-gray-800/40">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:1.25rem_1.25rem] opacity-25"></div>
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
          <defs>
            <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 30 ${chartPoints.map((val, idx) => {
              const x = (idx / (chartPoints.length - 1)) * 100;
              const minVal = Math.min(...chartPoints) - 10;
              const maxVal = Math.max(...chartPoints) + 10;
              const y = 30 - ((val - minVal) / (maxVal - minVal)) * 24 - 3;
              return `L ${x} ${y}`;
            }).join(' ')} L 100 30 Z`}
            fill="url(#glow)"
          />
          <path
            d={chartPoints.map((val, idx) => {
              const x = (idx / (chartPoints.length - 1)) * 100;
              const minVal = Math.min(...chartPoints) - 10;
              const maxVal = Math.max(...chartPoints) + 10;
              const y = 30 - ((val - minVal) / (maxVal - minVal)) * 24 - 3;
              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Terminal logs */}
      <div 
        ref={logContainerRef} 
        className="flex-1 min-h-[140px] max-h-[150px] bg-[#04070d] p-3 overflow-y-auto font-mono text-[10.5px] leading-relaxed border-b border-gray-800/80 scrollbar-thin"
      >
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-gray-600">{log.time}</span>
            <span className={
              log.type === 'buy' ? 'text-emerald-400 font-medium' :
              log.type === 'sell' ? 'text-rose-400 font-medium' :
              log.type === 'win' ? 'text-emerald-400 font-bold' :
              log.type === 'loss' ? 'text-rose-500 font-bold' :
              log.type === 'system' ? 'text-indigo-400' : 'text-gray-400'
            }>
              {log.text}
            </span>
          </div>
        ))}
      </div>

      {/* Interactive Controls */}
      <div className="p-4 bg-[#080d19] space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
              <span>RISK EXPOSURE</span>
              <span className="text-indigo-400 font-bold">{riskPercent.toFixed(1)}%</span>
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="5.0" 
              step="0.5" 
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <div>
            <label className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
              <span>SIMULATED ASSET</span>
              <span className="text-indigo-400 font-bold">{asset}</span>
            </label>
            <select
              value={asset}
              onChange={(e) => {
                setAsset(e.target.value);
                setBalance(10000);
                setPnl(0);
                setChartPoints([10000]);
                setLogs(prev => [...prev, { time: new Date().toTimeString().split(' ')[0], type: "system", text: `Recalibrating model parameters for ${e.target.value}...` }]);
              }}
              className="w-full bg-[#0c1322] border border-gray-800 text-[11px] font-mono text-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="XAUUSD">XAUUSD (Gold)</option>
              <option value="BTCUSD">BTCUSD (Bitcoin)</option>
              <option value="EURUSD">EURUSD (Euro)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className={`w-full py-2 px-4 rounded-lg font-mono text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border ${
            botEnabled 
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20" 
              : "bg-indigo-600 text-white border-transparent hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          }`}
        >
          {botEnabled ? "DEACTIVATE SIMULATION LOOP" : "ACTIVATE AUTOMATED LOOP"}
        </button>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Hero Section
//////////////////////////////////////////////////////////

const HeroSection = () => {
  return (
    <div className="relative bg-[#070a13] overflow-hidden min-h-[calc(100vh-50px)] flex items-center">
      {/* Decorative Blur Circles */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full filter blur-[100px] pointer-events-none z-0"></div>
      
      {/* Live Candlestick Background */}
      <CandlestickCanvas />
      
      <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24 z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Copy (Left Side) */}
          <div className="lg:col-span-7 text-left">
            <div className="inline-flex items-center px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
              <BoltIcon className="h-4 w-4 text-indigo-400 mr-2" />
              <span className="text-indigo-300 text-xs font-semibold tracking-wider uppercase">Institutional Execution Engine</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              Algorithmic Precision
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
                Automated Execution
              </span>
            </h1>

            <p className="text-lg text-gray-300 mb-8 max-w-2xl leading-relaxed">
              Deploy rule-based trading algorithms with advanced risk-mitigation limits, direct broker routing, and real-time analytical dashboards. Protect your capital and trade standard markets systematically.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                to="/Dashboard"
                className="group px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-all duration-300 shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.4)] flex items-center justify-center border border-transparent"
              >
                Launch Trade Dashboard
                <ChevronRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/chart"
                className="group px-8 py-3.5 bg-gray-900/80 backdrop-blur-sm text-gray-200 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 border border-gray-800 flex items-center justify-center"
              >
                <PlayIcon className="mr-2 h-4.5 w-4.5" />
                Live Demo Chart
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-6 max-w-lg border-t border-gray-800/60 pt-8">
              <div>
                <div className="text-2xl font-bold font-mono text-white">
                  <AnimatedCounter value={42} suffix="ms" />
                </div>
                <div className="text-gray-400 text-xs mt-1">Average Latency</div>
              </div>

              <div>
                <div className="text-2xl font-bold font-mono text-white">
                  <AnimatedCounter value={150} suffix="+" />
                </div>
                <div className="text-gray-400 text-xs mt-1">Supported Assets</div>
              </div>

              <div>
                <div className="text-2xl font-bold font-mono text-white">
                  <AnimatedCounter value={99.98} suffix="%" />
                </div>
                <div className="text-gray-400 text-xs mt-1">System Uptime</div>
              </div>
            </div>
          </div>

          {/* Interactive Strategy Simulator (Right Side) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <StrategySimulator />
          </div>

        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Bento Feature Grid
//////////////////////////////////////////////////////////

const BentoFeatureGrid = () => {
  return (
    <div id="features" className="py-24 bg-[#060910] border-t border-gray-900 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full filter blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Built for Systematic Execution
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate emotional bias with a robust, rule-based infrastructure featuring professional risk enforcement and multi-market access.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Quant Strategy Architect (Colspan-2) */}
          <div className="md:col-span-2 bg-[#0a101e]/60 border border-gray-800/80 rounded-2xl p-8 backdrop-blur-sm flex flex-col md:flex-row gap-6 justify-between items-start transition-all duration-300 hover:border-indigo-500/30 group">
            <div className="flex-1">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl w-fit mb-6 text-indigo-400">
                <AdjustmentsHorizontalIcon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Strategy Architect</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Define entry and exit criteria based on mathematical rules, technical indicators (RSI, EMAs, MACD), or custom price levels. No complex script debugging required.
              </p>
              <ul className="space-y-2 text-xs text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Multi-conditional logical triggers
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Historical strategy backtesting
                </li>
              </ul>
            </div>
            
            {/* Visual Schematic Mock */}
            <div className="w-full md:w-60 bg-[#060a13] border border-gray-800/60 rounded-xl p-4 font-mono text-[10px] text-gray-400 self-stretch flex flex-col justify-center gap-2">
              <div className="flex justify-between border-b border-gray-800/40 pb-1">
                <span className="text-gray-500">CONDITION</span>
                <span className="text-indigo-400">STATUS</span>
              </div>
              <div className="flex justify-between items-center bg-gray-900/30 p-1.5 rounded">
                <span>RSI(14) &lt; 30</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">TRUE</span>
              </div>
              <div className="flex justify-between items-center bg-gray-900/30 p-1.5 rounded">
                <span>Price &gt; 200 EMA</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">TRUE</span>
              </div>
              <div className="flex justify-between items-center bg-gray-900/30 p-1.5 rounded">
                <span>Spread &lt; 2.0 Pips</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">TRUE</span>
              </div>
              <div className="mt-2 text-center text-[9px] font-bold text-white bg-indigo-600/30 border border-indigo-500/30 py-1 rounded tracking-wide">
                ROUTE BUY ORDER
              </div>
            </div>
          </div>

          {/* Card 2: Hard-Coded Risk Management (Colspan-1) */}
          <div className="bg-[#0a101e]/60 border border-gray-800/80 rounded-2xl p-8 backdrop-blur-sm flex flex-col justify-between transition-all duration-300 hover:border-indigo-500/30 group">
            <div>
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl w-fit mb-6 text-rose-400">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Capital Guardrails</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Protect your account against catastrophic drawdowns. Set daily stop-loss targets that automatically lock trade execution once triggered.
              </p>
            </div>
            
            {/* Visual Risk Bar */}
            <div className="bg-[#060a13] border border-gray-800/60 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-500">MAX DAILY LOSS</span>
                <span className="text-rose-400 font-bold">$500.00</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full w-[70%]" />
              </div>
              <div className="text-[9px] text-gray-500 font-mono text-right">
                $350.00 current exposure (70%)
              </div>
            </div>
          </div>

          {/* Card 3: Performance/Latency (Colspan-1) */}
          <div className="bg-[#0a101e]/60 border border-gray-800/80 rounded-2xl p-8 backdrop-blur-sm flex flex-col justify-between transition-all duration-300 hover:border-indigo-500/30 group">
            <div>
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl w-fit mb-6 text-cyan-400">
                <BoltIcon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Direct Low-Latency Link</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Execution speed is critical. Orders are routed directly via web-socket connectors to broker gateways in less than 50 milliseconds.
              </p>
            </div>
            
            <div className="bg-[#060a13] border border-gray-800/60 rounded-xl p-4 flex justify-around items-center font-mono">
              <div className="text-center">
                <div className="text-xs text-gray-500">PING</div>
                <div className="text-base font-bold text-cyan-400 mt-1">12ms</div>
              </div>
              <div className="h-8 w-px bg-gray-800"></div>
              <div className="text-center">
                <div className="text-xs text-gray-500">EXEC TIME</div>
                <div className="text-base font-bold text-cyan-400 mt-1">42ms</div>
              </div>
            </div>
          </div>

          {/* Card 4: Broker routing & Multi-asset support (Colspan-2) */}
          <div className="md:col-span-2 bg-[#0a101e]/60 border border-gray-800/80 rounded-2xl p-8 backdrop-blur-sm flex flex-col md:flex-row gap-6 justify-between items-start transition-all duration-300 hover:border-indigo-500/30 group">
            <div className="flex-1">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit mb-6 text-emerald-400">
                <GlobeAltIcon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Multi-Broker API Routing</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Execute automated models across diverse asset classes. Bridge your algorithms directly into MetaTrader 4, MetaTrader 5, or custom Webhook brokers without setting up your own VPS servers.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="bg-[#060a13] border border-gray-800 text-[10px] text-gray-300 px-2.5 py-1 rounded font-mono font-semibold">FOREX CFDs</span>
                <span className="bg-[#060a13] border border-gray-800 text-[10px] text-gray-300 px-2.5 py-1 rounded font-mono font-semibold">COMMODITIES</span>
                <span className="bg-[#060a13] border border-gray-800 text-[10px] text-gray-300 px-2.5 py-1 rounded font-mono font-semibold">CRYPTO ASSETS</span>
                <span className="bg-[#060a13] border border-gray-800 text-[10px] text-gray-300 px-2.5 py-1 rounded font-mono font-semibold">INDICES</span>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="w-full md:w-64 bg-[#04070e] border border-gray-900 rounded-xl p-4 font-mono text-[9px] text-gray-400 self-stretch flex flex-col justify-center select-text">
              <div className="text-gray-600 mb-1">// Route JSON order execution</div>
              <div className="text-gray-300"><span className="text-purple-400">const</span> order = <span className="text-indigo-300">await</span> Client.<span className="text-cyan-400">execute</span>(&#123;</div>
              <div className="pl-4">symbol: <span className="text-emerald-400">"XAUUSD"</span>,</div>
              <div className="pl-4">side: <span className="text-emerald-400">"BUY"</span>,</div>
              <div className="pl-4">volume: <span className="text-amber-400">0.50</span>,</div>
              <div className="pl-4">stopLoss: <span className="text-amber-400">2029.00</span>,</div>
              <div className="pl-4">takeProfit: <span className="text-amber-400">2045.00</span></div>
              <div className="text-gray-300">&#125;);</div>
              <div className="text-emerald-400 mt-2">// Response: 200 OK (MT5 Ticket: #92842)</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Testimonials Section
//////////////////////////////////////////////////////////

const Testimonials = () => {
  const testimonials = [
    {
      name: "Marcus Thorne",
      role: "Systematic Trader",
      text: "The hard-coded risk management controls are a lifesaver. Enforcing a strict daily drawdown limit has protected my trading capital during high-impact news spikes.",
      avatar: "MT",
      tag: "Verified MT5 Account"
    },
    {
      name: "Valerie Chen",
      role: "Quantitative Analyst",
      text: "Setting up logical rules to filter entries is incredibly clean. I'm able to run systematic backtests and automate execution without maintaining my own VPC servers.",
      avatar: "VC",
      tag: "Verified Live Broker Bridge"
    },
    {
      name: "Derek Hall",
      role: "Forex Specialist",
      text: "Direct API web-socket latency averages 12ms from my server. The slippage is virtually non-existent compared to other copy-trading platforms.",
      avatar: "DH",
      tag: "Verified Capital Trader"
    },
  ];

  return (
    <div className="py-24 bg-[#070a13] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/10 to-transparent"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Trusted by Quantitative Developers
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            See how professional and retail traders leverage automated infrastructure to enforce disciplined execution.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div 
              key={i} 
              className="bg-[#0b101e]/60 border border-gray-800/80 p-8 rounded-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/20"
            >
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, j) => (
                  <StarIconSolid key={j} className="h-4.5 w-4.5 text-indigo-400" />
                ))}
              </div>
              
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">"{t.text}"</p>
              
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold mr-3.5">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{t.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{t.role}</div>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-gray-800/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{t.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Pricing Section
//////////////////////////////////////////////////////////

const PricingSection = () => {
  return (
    <div id="pricing" className="py-24 bg-[#060910] border-t border-gray-900 relative">
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Transparent Pricing
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Start testing your algorithms with mock data for free, and upgrade to live broker routing when ready.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Starter Plan */}
          <div className="bg-[#0a101e]/60 border border-gray-800/80 rounded-2xl p-8 backdrop-blur-sm flex flex-col justify-between transition-all duration-300 hover:border-gray-700">
            <div>
              <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Developer Sandbox</div>
              <div className="flex items-baseline mt-4 text-white">
                <span className="text-5xl font-extrabold tracking-tight font-mono">$0</span>
                <span className="ml-1 text-gray-400 text-sm">/ forever</span>
              </div>
              <p className="mt-4 text-gray-400 text-sm leading-relaxed">
                Perfect for testing strategy configurations, analyzing risk parameters, and running simulated paper trades.
              </p>

              <ul className="mt-8 space-y-4 text-xs text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  Unlimited paper trading simulations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  15 strategy configuration models
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  Technical indicators & simple chart tools
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  Manual risk limit dashboard controls
                </li>
              </ul>
            </div>
            
            <Link
              to="/signup"
              className="mt-8 w-full py-3 px-4 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-white rounded-xl text-center text-xs font-semibold tracking-wider transition-all duration-200"
            >
              CREATE FREE ACCOUNT
            </Link>
          </div>

          {/* Pro Quant Plan */}
          <div className="bg-[#0e1628] border-2 border-indigo-500 rounded-2xl p-8 backdrop-blur-sm flex flex-col justify-between relative transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase">
              RECOMMENDED
            </div>

            <div>
              <div className="text-indigo-400 text-sm font-semibold uppercase tracking-wider">Live execution router</div>
              <div className="flex items-baseline mt-4 text-white">
                <span className="text-5xl font-extrabold tracking-tight font-mono">$49</span>
                <span className="ml-1 text-gray-400 text-sm">/ month</span>
              </div>
              <p className="mt-4 text-gray-300 text-sm leading-relaxed">
                Connect directly into live MT4, MT5, or Webhook broker terminals for systematic, low-latency trade routing.
              </p>

              <ul className="mt-8 space-y-4 text-xs text-gray-200">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                  <strong>Everything in Free</strong> plus:
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  Direct MT4/MT5 live trade routing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  Sub-50ms websocket latency endpoints
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  Advanced circular drawdown protectors
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  24/7 dedicated execution uptime
                </li>
              </ul>
            </div>
            
            <Link
              to="/signup"
              className="mt-8 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-center text-xs font-semibold tracking-wider transition-all duration-200 shadow-[0_4px_15px_rgba(99,102,241,0.3)]"
            >
              START 14-DAY TRIAL
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Enhanced CTA Section
//////////////////////////////////////////////////////////

const CTASection = () => {
  return (
    <div className="py-28 bg-[#070a13] relative overflow-hidden border-t border-gray-900">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full filter blur-[150px] pointer-events-none z-0"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
          Systematize Your Trading Strategy Today
        </h2>
        
        <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Remove emotional bias. Put hard boundaries around risk limits and let automated rule-based scripts route order executions. Setup takes less than 10 minutes.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <Link
            to="/signup"
            className="group px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-all duration-300 shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center border border-transparent"
          >
            Get Started Free
            <ChevronRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <a
            href="#features"
            className="px-8 py-3.5 bg-gray-900/80 backdrop-blur-sm text-gray-300 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 border border-gray-800 flex items-center justify-center"
          >
            Explore Infrastructure
          </a>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 text-gray-400 text-xs font-mono tracking-wide uppercase">
          <div className="flex items-center">
            <CheckCircleIcon className="h-4.5 w-4.5 mr-2 text-indigo-400 shrink-0" />
            No Credit Card Required
          </div>
          <div className="flex items-center">
            <CheckCircleIcon className="h-4.5 w-4.5 mr-2 text-indigo-400 shrink-0" />
            14-Day Pro Access Trial
          </div>
          <div className="flex items-center">
            <CheckCircleIcon className="h-4.5 w-4.5 mr-2 text-indigo-400 shrink-0" />
            Zero Server Setup VPS
          </div>
        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// HomePage
//////////////////////////////////////////////////////////

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070a13] text-gray-300 selection:bg-indigo-500/30 selection:text-white">
      <MarketTicker />
      <HeroSection />
      <BentoFeatureGrid />
      <Testimonials />
      <PricingSection />
      <CTASection />
      
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-ticker {
          animation: ticker 45s linear infinite;
        }

        .animate-ticker:hover {
          animation-play-state: paused;
        }
        
        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
        
        /* Custom scrollbar for terminals */
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #04070e;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #1f2937;
          border-radius: 9px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #374151;
        }
      `}</style>
    </div>
  );
}