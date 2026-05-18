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
  SparklesIcon,
  CheckCircleIcon,
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
    { symbol: "BTCUSD", price: 52341, change: 1245, changePercent: 2.43 },
    { symbol: "ETHUSD", price: 3124, change: -45, changePercent: -1.42 },
    { symbol: "SPX500", price: 4521.35, change: 23.45, changePercent: 0.52 },
    { symbol: "USDJPY", price: 149.87, change: -0.23, changePercent: -0.15 },
    { symbol: "AUDUSD", price: 0.6543, change: 0.0034, changePercent: 0.52 },
  ]);

  return (
    <div className="bg-gray-900 border-b border-gray-800 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-purple-900/10 z-0"></div>
      <div className="ticker-container overflow-hidden whitespace-nowrap py-3 relative z-10">
        <div className="ticker-content inline-block animate-ticker">
          {markets.concat(markets).map((market, index) => (
            <div key={index} className="inline-flex items-center mx-6 px-3 py-1 rounded-lg hover:bg-gray-800/50 transition-all duration-200">
              <span className="font-semibold text-white">{market.symbol}</span>
              <span className="ml-2 text-gray-300 font-mono">
                ${market.price.toFixed(market.symbol.includes('USD') && market.price > 100 ? 0 : 2)}
              </span>
              <span
                className={`ml-2 flex items-center font-medium ${
                  market.change >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {market.change >= 0 ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                )}
                {market.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Hero Section with Enhanced Canvas Animation
//////////////////////////////////////////////////////////

const HeroSection = () => {
  const canvasRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = 500);

    let animationFrame;

    const points = [];
    const numPoints = 80;
    const connections = [];
    const particles = [];

    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
      });
    }

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(17, 24, 39, 0.8)");
      gradient.addColorStop(0.5, "rgba(31, 41, 55, 0.8)");
      gradient.addColorStop(1, "rgba(17, 24, 39, 0.8)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${particle.opacity})`;
        ctx.fill();
      });

      // Update and draw points
      points.forEach((point) => {
        point.x += point.vx;
        point.y += point.vy;

        if (point.x < 0 || point.x > width) point.vx *= -1;
        if (point.y < 0 || point.y > height) point.vy *= -1;

        // Mouse interaction
        const dx = mousePosition.x - point.x;
        const dy = mousePosition.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const force = (100 - distance) / 100;
          point.x -= dx * force * 0.03;
          point.y -= dy * force * 0.03;
        }

        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(96, 165, 250, 0.8)";
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${0.2 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw wave
      const wavePoints = [];
      const waveHeight = 40;
      const waveFrequency = 0.01;
      const time = Date.now() * 0.001;
      
      for (let x = 0; x <= width; x += 10) {
        const y = height / 2 + Math.sin(x * waveFrequency + time) * waveHeight + 
                  Math.sin(x * waveFrequency * 2 + time * 1.5) * waveHeight * 0.5;
        wavePoints.push({ x, y });
      }

      ctx.beginPath();
      ctx.moveTo(wavePoints[0].x, wavePoints[0].y);
      
      for (let i = 1; i < wavePoints.length; i++) {
        const cp1x = (wavePoints[i - 1].x + wavePoints[i].x) / 2;
        const cp1y = wavePoints[i - 1].y;
        const cp2x = cp1x;
        const cp2y = wavePoints[i].y;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, wavePoints[i].x, wavePoints[i].y);
      }
      
      ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = 500;
    };

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mousePosition]);

  return (
    <div className="relative bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 text-center">
        <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-full mb-6">
          <SparklesIcon className="h-5 w-5 text-blue-400 mr-2" />
          <span className="text-blue-300 text-sm font-medium">AI-Powered Trading Platform</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Trade Smarter with
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400">
            AI-Powered Insights
          </span>
        </h1>

        <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
          Professional-grade trading platform with real-time data, advanced charts and automated strategies.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            to="/Dashboard"
            className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center"
          >
            Start Free Trial
            <ChevronRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/demo"
            className="group px-8 py-4 bg-gray-800/70 backdrop-blur-sm text-white rounded-lg font-semibold text-lg hover:bg-gray-700/70 border border-gray-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
          >
            <PlayIcon className="mr-2 h-5 w-5" />
            View Demo
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-3xl font-bold text-white mb-1">
              <AnimatedCounter value={50000} prefix="$" suffix="+" />
            </div>
            <div className="text-gray-400 text-sm">Daily Volume</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-3xl font-bold text-white mb-1">
              <AnimatedCounter value={150} suffix="+" />
            </div>
            <div className="text-gray-400 text-sm">Trading Pairs</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-3xl font-bold text-white mb-1">
              <AnimatedCounter value={99.99} suffix="%" />
            </div>
            <div className="text-gray-400 text-sm">Uptime</div>
          </div>
        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Enhanced Feature Cards
//////////////////////////////////////////////////////////

const colorStyles = {
  blue: {
    bg: "bg-blue-100",
    text: "text-blue-600",
    gradient: "from-blue-500 to-cyan-500",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-600",
    gradient: "from-green-500 to-emerald-500",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-600",
    gradient: "from-purple-500 to-pink-500",
  },
  red: {
    bg: "bg-red-100",
    text: "text-red-600",
    gradient: "from-red-500 to-orange-500",
  },
  yellow: {
    bg: "bg-yellow-100",
    text: "text-yellow-600",
    gradient: "from-yellow-500 to-amber-500",
  },
  indigo: {
    bg: "bg-indigo-100",
    text: "text-indigo-600",
    gradient: "from-indigo-500 to-purple-500",
  },
};

const FeatureCards = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const features = [
    {
      icon: ChartBarIcon,
      title: "Advanced Charts",
      description: "Professional TradingView charts with 100+ indicators",
      color: "blue",
    },
    {
      icon: CpuChipIcon,
      title: "AI Predictions",
      description: "Machine learning algorithms predict market movements",
      color: "green",
    },
    {
      icon: ShieldCheckIcon,
      title: "Risk Management",
      description: "Automated stop-loss and take-profit management",
      color: "purple",
    },
    {
      icon: BellAlertIcon,
      title: "Smart Alerts",
      description: "Get notified when trading conditions are met",
      color: "red",
    },
    {
      icon: GlobeAltIcon,
      title: "Global Markets",
      description: "Access forex, crypto, stocks and commodities",
      color: "yellow",
    },
    {
      icon: ComputerDesktopIcon,
      title: "Trading Bot",
      description: "Automate strategies with powerful bots",
      color: "indigo",
    },
  ];

  return (
    <div className="py-24 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Trade
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform provides all the tools and features you need to succeed in today's markets
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const styles = colorStyles[feature.color];
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={i}
                className={`relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer overflow-hidden group`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                <div className={`inline-flex p-3 ${styles.bg} rounded-xl mb-6 transition-all duration-500 ${isHovered ? 'scale-110' : ''}`}>
                  <Icon className={`h-8 w-8 ${styles.text}`} />
                </div>

                <h3 className="text-2xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                
                <div className={`flex items-center text-blue-600 font-medium transition-all duration-300 ${isHovered ? 'translate-x-1' : ''}`}>
                  Learn more
                  <ChevronRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

//////////////////////////////////////////////////////////
// Enhanced Testimonials
//////////////////////////////////////////////////////////

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Professional Trader",
      text: "The AI predictions are incredibly accurate. I've increased my portfolio by 40% in just 3 months.",
      avatar: "SJ",
    },
    {
      name: "Michael Chen",
      role: "Crypto Investor",
      text: "Best trading platform I've used. The interface is intuitive and the features are powerful.",
      avatar: "MC",
    },
    {
      name: "Emma Williams",
      role: "Forex Trader",
      text: "Risk management saved me many times. The automated stop-loss feature is a game-changer.",
      avatar: "EW",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="py-24 bg-gradient-to-br from-gray-900 to-blue-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">What Our Traders Say</h2>
          <p className="text-xl text-gray-300">Join thousands of successful traders using our platform</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div 
              key={i} 
              className={`bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/10 transition-all duration-500 ${activeIndex === i ? 'scale-105 shadow-2xl' : 'hover:scale-102'}`}
            >
              <div className="flex mb-6">
                {[...Array(5)].map((_, j) => (
                  <StarIconSolid key={j} className="h-5 w-5 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-gray-200 mb-6 text-lg leading-relaxed">"{t.text}"</p>
              
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold mr-4">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-white font-semibold">{t.name}</div>
                  <div className="text-gray-400 text-sm">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
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
    <div className="py-24 bg-gradient-to-r from-blue-600 to-cyan-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full filter blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full filter blur-xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/10 rounded-full filter blur-xl"></div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
          
          <span className="text-white text-sm font-medium">Limited Time Offer</span>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to Start Trading?
        </h2>
        
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Join thousands of traders using our platform. Get started today with a 14-day free trial.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            to="/signup"
            className="group px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center"
          >
            Get Started Now
            <ChevronRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link
            to="/pricing"
            className="px-8 py-4 bg-transparent text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-all duration-300 border border-white/30 flex items-center justify-center"
          >
            View Pricing
          </Link>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-300" />
            No credit card required
          </div>
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-300" />
            14-day free trial
          </div>
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-300" />
            Cancel anytime
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
    <div className="min-h-screen bg-white">
      <MarketTicker />
      <HeroSection />
      <FeatureCards />
      <Testimonials />
      <CTASection />
      
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-ticker {
          animation: ticker 40s linear infinite;
        }

        .animate-ticker:hover {
          animation-play-state: paused;
        }
        
        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}