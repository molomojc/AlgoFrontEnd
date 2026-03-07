// src/components/FullScreenChart.jsx
import React, { useRef } from 'react';
import Chart from './Chart';

const FullScreenChart = ({ 
  symbol = 'XAUUSD', 
  interval = 'D',
  theme = 'dark'
}) => {
  const chartRef = useRef(null);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: theme === 'dark' ? '#0F0F0F' : '#FFFFFF'
    }}>
      <Chart
        ref={chartRef}
        symbol={symbol}
        interval={interval}
        theme={theme}
        hideSideToolbar={false}
        hideTopToolbar={false}
        studies={[]}
        screenshotMode={false}
      />
    </div>
  );
};

export default FullScreenChart;