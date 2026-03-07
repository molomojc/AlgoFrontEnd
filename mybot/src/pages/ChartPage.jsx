// src/pages/ChartPage.jsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import FullScreenChart from '../components/FullScreenChart';

export default function ChartPage() {
  const [searchParams] = useSearchParams();
  
  // Get parameters from URL or use defaults
  const symbol = searchParams.get('symbol') || 'EURUSD';
  const interval = searchParams.get('interval') || '1';
  const theme = searchParams.get('theme') || 'dark';

  return (
    <FullScreenChart 
      symbol={symbol}
      interval={interval}
      theme={theme}
    />
  );
}//http://localhost:5173/chart?symbol=XAUUSD&interval=5