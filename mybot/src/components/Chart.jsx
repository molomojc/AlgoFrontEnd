// src/components/Chart.jsx
import React, { useEffect, useRef, useState, memo } from 'react';
import PropTypes from 'prop-types';

function Chart({ 
  symbol = 'XAUUSD',
  interval = 'D',
  theme = 'dark',
  height = '100vh',
  width = '100%',
  hideSideToolbar = true,
  hideTopToolbar = false,
  studies = [],
  onChartReady,
  screenshotMode = false
}) {
  const container = useRef(null);
  const widgetRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map common symbols to TradingView format
  const getTradingViewSymbol = (sym) => {
    const symbolMap = {
      // Forex
      'XAUUSD': 'OANDA:XAUUSD',
      'XAGUSD': 'OANDA:XAGUSD',
      'EURUSD': 'OANDA:EURUSD',
      'GBPUSD': 'OANDA:GBPUSD',
      'USDJPY': 'OANDA:USDJPY',
      'USDCAD': 'OANDA:USDCAD',
      'AUDUSD': 'OANDA:AUDUSD',
      'NZDUSD': 'OANDA:NZDUSD',
      'USDCHF': 'OANDA:USDCHF',
      
      // Indices
      'SPX': 'SPX',
      'NASDAQ': 'NASDAQ',
      'DOW': 'DJI',
      'FTSE': 'FTSE',
      
      // Crypto
      'BTCUSD': 'BITSTAMP:BTCUSD',
      'ETHUSD': 'BITSTAMP:ETHUSD',
      
      // Commodities
      'USOIL': 'USOIL',
      'UKOIL': 'UKOIL',
      'NATGAS': 'NATGAS',
      
      // Stocks (if needed)
      'AAPL': 'NASDAQ:AAPL',
      'MSFT': 'NASDAQ:MSFT',
      'GOOGL': 'NASDAQ:GOOGL',
      'AMZN': 'NASDAQ:AMZN',
      'TSLA': 'NASDAQ:TSLA',
    };
    
    // If symbol already has a colon, assume it's already in correct format
    if (sym.includes(':')) {
      return sym;
    }
    
    return symbolMap[sym] || `OANDA:${sym}`; // Default to OANDA for forex
  };

  useEffect(() => {
    // Clean up previous widget
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch (e) {
        console.log('Widget cleanup error:', e);
      }
    }

    // Clear container
    if (container.current) {
      container.current.innerHTML = '';
    }

    setIsLoading(true);
    setError(null);

    const tradingViewSymbol = getTradingViewSymbol(symbol);
    console.log('Loading chart for:', tradingViewSymbol); // Debug log

    // Create widget configuration
    const widgetConfig = {
      "symbol": tradingViewSymbol,
      "interval": interval,
      "timezone": "Etc/UTC",
      "theme": theme,
      "style": "1",
      "locale": "en",
      "toolbar_bg": theme === 'dark' ? "#1E1E1E" : "#F1F3F6",
      "enable_publishing": false,
      "allow_symbol_change": !screenshotMode,
      "save_image": true,
      "calendar": false,
      "hide_side_toolbar": hideSideToolbar,
      "hide_top_toolbar": hideTopToolbar,
      "hide_legend": false,
      "hide_volume": false,
      "container_id": "tradingview_widget",
      "studies": studies,
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650",
      "withdateranges": true,
      "details": true,
      "hotlist": false,
      "show_interval_dialog": true,
      "autosize": true,
      "disabled_features": screenshotMode ? [
        "header_symbol_search",
        "header_undo_redo",
        "header_screenshot",
        "header_compare",
        "left_toolbar",
        "timeframes_toolbar",
        "edit_bar_dots",
        "control_bar",
        "display_market_status",
        "go_to_date",
        "show_interval_dialog_on_key_press",
        "show_logo_on_all_charts",
        "use_localstorage_for_settings"
      ] : [],
      "enabled_features": [],
      "loading_screen": {
        "backgroundColor": theme === 'dark' ? "#0F0F0F" : "#FFFFFF",
        "foregroundColor": theme === 'dark' ? "#CCCCCC" : "#333333"
      },
      "overrides": {
        "paneProperties.background": theme === 'dark' ? "#0F0F0F" : "#FFFFFF",
        "paneProperties.vertGridProperties.color": theme === 'dark' ? "#1E1E1E" : "#F5F5F5",
        "paneProperties.horzGridProperties.color": theme === 'dark' ? "#1E1E1E" : "#F5F5F5",
        "paneProperties.crossHairProperties.color": theme === 'dark' ? "#CCCCCC" : "#333333",
        "scalesProperties.textColor": theme === 'dark' ? "#CCCCCC" : "#333333",
        "scalesProperties.lineColor": theme === 'dark' ? "#1E1E1E" : "#E6E6E6",
        "mainSeriesProperties.candleStyle.upColor": theme === 'dark' ? "#26a69a" : "#26a69a",
        "mainSeriesProperties.candleStyle.downColor": theme === 'dark' ? "#ef5350" : "#ef5350",
        "mainSeriesProperties.candleStyle.wickUpColor": theme === 'dark' ? "#26a69a" : "#26a69a",
        "mainSeriesProperties.candleStyle.wickDownColor": theme === 'dark' ? "#ef5350" : "#ef5350"
      }
    };

    // Create script element
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify(widgetConfig);
    
    script.onload = () => {
      setIsLoading(false);
      if (onChartReady) {
        setTimeout(onChartReady, 2000); // Give widget more time to fully render
      }
    };
    
    script.onerror = (e) => {
      console.error('TradingView script error:', e);
      setError('Failed to load TradingView widget');
      setIsLoading(false);
    };

    // Append script to container
    if (container.current) {
      container.current.appendChild(script);
      widgetRef.current = script;
    }

    // Cleanup function
    return () => {
      if (widgetRef.current && container.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
    };
  }, [symbol, interval, theme, hideSideToolbar, hideTopToolbar, studies, screenshotMode, onChartReady]);

  // Add CSS for fullscreen
  useEffect(() => {
    if (screenshotMode) {
      // Add screenshot mode specific styles
      const style = document.createElement('style');
      style.innerHTML = `
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: ${theme === 'dark' ? '#0F0F0F' : '#FFFFFF'};
        }
        #root {
          height: 100vh;
          width: 100vw;
        }
        .tradingview-widget-container {
          height: 100% !important;
          width: 100% !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        style.remove();
      };
    }
  }, [screenshotMode, theme]);

  return (
    <div style={{ 
      height: '100%', 
      width: '100%', 
      position: 'relative',
      backgroundColor: theme === 'dark' ? '#0F0F0F' : '#FFFFFF'
    }}>
      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme === 'dark' ? '#0F0F0F' : '#FFFFFF',
          zIndex: 1000
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid ' + (theme === 'dark' ? '#333' : '#f3f3f3'),
            borderTop: '3px solid ' + (theme === 'dark' ? '#4CAF50' : '#2196F3'),
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          <div style={{
            color: theme === 'dark' ? '#FFF' : '#333',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px'
          }}>
            Loading {symbol} chart...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme === 'dark' ? '#0F0F0F' : '#FFFFFF',
          color: theme === 'dark' ? '#FF6B6B' : '#D32F2F',
          zIndex: 1000
        }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
            <p style={{ marginTop: '10px' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                backgroundColor: theme === 'dark' ? '#4CAF50' : '#2196F3',
                color: '#FFF',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* TradingView Widget Container */}
      <div 
        ref={container} 
        id="tradingview_widget"
        className="tradingview-widget-container"
        style={{ 
          height: '100%', 
          width: '100%',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  );
}

Chart.propTypes = {
  symbol: PropTypes.string,
  interval: PropTypes.oneOf(['1', '3', '5', '15', '30', '60', '120', '180', '240', 'D', 'W', 'M']),
  theme: PropTypes.oneOf(['dark', 'light']),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hideSideToolbar: PropTypes.bool,
  hideTopToolbar: PropTypes.bool,
  studies: PropTypes.array,
  onChartReady: PropTypes.func,
  screenshotMode: PropTypes.bool
};

export default memo(Chart);