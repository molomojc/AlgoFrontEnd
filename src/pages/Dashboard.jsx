import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../utils/database.queries'
import { supabase } from '../lib/supabase'
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  BanknotesIcon,
  PlayIcon,
  StopIcon,
  Cog6ToothIcon,
  BellAlertIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { PlayIcon as PlayIconSolid } from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Mock data for charts (replace with real data later)
const performanceData = [
  { time: '00:00', value: 10000 },
  { time: '04:00', value: 10150 },
  { time: '08:00', value: 10200 },
  { time: '12:00', value: 10180 },
  { time: '16:00', value: 10250 },
  { time: '20:00', value: 10250 },
]

const signalHistory = [
  { id: 1, symbol: 'XAUUSD', direction: 'BUY', confidence: 85, time: '10:30', result: 'pending' },
  { id: 2, symbol: 'EURUSD', direction: 'SELL', confidence: 72, time: '09:15', result: 'win' },
  { id: 3, symbol: 'GBPUSD', direction: 'BUY', confidence: 68, time: '08:45', result: 'loss' },
  { id: 4, symbol: 'BTCUSD', direction: 'BUY', confidence: 91, time: '07:30', result: 'win' },
  { id: 5, symbol: 'XAUUSD', direction: 'SELL', confidence: 79, time: '06:15', result: 'win' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [botStatus, setBotStatus] = useState('stopped')
  const [botMetrics, setBotMetrics] = useState({
    tradesToday: 0,
    winRate: 0,
    totalPnL: 0,
    analyzing: false
  })
  
  // Account data from database
  const [accountData, setAccountData] = useState({
    balance: 0,
    equity: 0,
    openPositions: 0,
    todayPnL: 0,
    margin: 0,
    freeMargin: 0,
    leverage: '1:100',
    winRate: 0,
    tradesToday: 0,
    totalPnL: 0
  })
  
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    autoTrade: true,
    minConfidence: 75,
    maxPositions: 5,
    riskPerTrade: 2.0,
    scanInterval: 15
  })

  useEffect(() => {
    if (!user?.id) return
  
    loadNews()
    loadBotStatus()
    loadAccountSnapshot()
    
    // Subscribe to real-time updates for account snapshots
    const subscription = supabase
      .channel('account_snapshots_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'account_snapshots',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('Account snapshot updated:', payload)
          if (payload.new) {
            updateAccountDataFromSnapshot(payload.new)
          }
        }
      )
      .subscribe()
  
    const interval = setInterval(() => {
      refreshAccountData()
    }, 30000)
  
    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  
  }, [user])

  const updateAccountDataFromSnapshot = (snapshot) => {
    setAccountData({
      balance: snapshot.balance || 0,
      equity: snapshot.equity || 0,
      openPositions: snapshot.open_positions || 0,
      todayPnL: snapshot.today_pnl || 0,
      margin: snapshot.margin || 0,
      freeMargin: snapshot.free_margin || (snapshot.balance - snapshot.margin) || 0,
      leverage: snapshot.leverage || '1:100',
      winRate: snapshot.win_rate || 0,
      tradesToday: snapshot.trades_today || 0,
      totalPnL: snapshot.total_pnl || 0
    })

    setBotMetrics({
      tradesToday: snapshot.trades_today || 0,
      winRate: snapshot.win_rate || 0,
      totalPnL: snapshot.total_pnl || 0,
      analyzing: botMetrics.analyzing
    })
  }

  const loadAccountSnapshot = async () => {
    try {
      const { data, error } = await supabase
        .from('account_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      
      if (data) {
        updateAccountDataFromSnapshot(data)
      } else {
        // Create initial snapshot if none exists
        const { error: insertError } = await supabase
          .from('account_snapshots')
          .insert({
            user_id: user.id,
            balance: 10000,
            equity: 10000,
            margin: 0,
            free_margin: 10000,
            open_positions: 0,
            today_pnl: 0,
            total_pnl: 0,
            win_rate: 0,
            trades_today: 0,
            total_trades: 0
          })
        
        if (insertError) console.error('Error creating initial snapshot:', insertError)
      }
    } catch (error) {
      console.error('Error loading account snapshot:', error)
      toast.error('Failed to load account data')
    }
  }

  const loadNews = async () => {
    try {
      const newsData = await db.getTodaysNews(user.id)
      setNews(newsData)
    } catch (error) {
      toast.error('Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  const loadBotStatus = async () => {
    try {
      const data = await db.getBotStatus(user.id)
      setBotStatus(data?.status || 'stopped')
    } catch (error) {
      console.error("BOT STATUS ERROR:", error)
    }
  }

  const refreshAccountData = async () => {
    try {
      // This would typically call your Python bot to get fresh data
      // For now, we'll just reload from database
      await loadAccountSnapshot()
    } catch (error) {
      console.error('Error refreshing account data:', error)
    }
  }

  const handleBotToggle = async () => {
    const newStatus = botStatus === 'running' ? 'stopped' : 'running'
    
    // Optimistic update
    setBotStatus(newStatus)
    
    try {
      await db.updateBotStatus(user.id, newStatus)
      toast.success(`Bot ${newStatus === 'running' ? 'started' : 'stopped'} successfully!`)
      
      if (newStatus === 'running') {
        setBotMetrics(prev => ({ ...prev, analyzing: true }))
        setTimeout(() => {
          setBotMetrics(prev => ({ ...prev, analyzing: false }))
        }, 3000)
      }
    } catch (error) {
      setBotStatus(botStatus)
      toast.error(`Failed to ${newStatus === 'running' ? 'start' : 'stop'} bot`)
    }
  }

  const getBotStatusBadge = () => {
    if (botMetrics.analyzing) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
          <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
          Analyzing...
        </span>
      )
    }
    
    switch (botStatus) {
      case 'running':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <span className="h-2 w-2 mr-2 rounded-full bg-green-500 animate-pulse"></span>
            Bot Running
          </span>
        )
      case 'stopped':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <span className="h-2 w-2 mr-2 rounded-full bg-gray-500"></span>
            Bot Stopped
          </span>
        )
      default:
        return null
    }
  }

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return '+0%'
    const change = ((current - previous) / previous) * 100
    return change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`
  }

  const stats = [
    {
      name: 'Account Balance',
      value: `$${accountData.balance.toFixed(2)}`,
      icon: BanknotesIcon,
      change: calculateChange(accountData.balance, accountData.balance - accountData.todayPnL),
      changeType: accountData.todayPnL >= 0 ? 'positive' : 'negative',
      subtext: `Available: $${(accountData.freeMargin || accountData.balance - accountData.margin).toFixed(2)}`
    },
    {
      name: 'Equity',
      value: `$${accountData.equity.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      change: calculateChange(accountData.equity, accountData.balance),
      changeType: accountData.equity >= accountData.balance ? 'positive' : 'negative',
      subtext: `Margin: $${(accountData.margin || 0).toFixed(2)}`
    },
    {
      name: 'Open Positions',
      value: accountData.openPositions,
      icon: ChartBarIcon,
      change: `${accountData.tradesToday} today`,
      changeType: 'neutral',
      subtext: `Max: ${settings.maxPositions}`
    },
    {
      name: "Today's P&L",
      value: `$${accountData.todayPnL.toFixed(2)}`,
      icon: ArrowTrendingUpIcon,
      change: `${(accountData.winRate || 0).toFixed(1)}% win rate`,
      changeType: accountData.todayPnL >= 0 ? 'positive' : 'negative',
      subtext: `${accountData.tradesToday || 0} trades`
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header with Bot Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trading Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.user_metadata?.full_name || user?.email || 'Trader'}!
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {getBotStatusBadge()}
          
          <button
            onClick={handleBotToggle}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              botStatus === 'running'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {botStatus === 'running' ? (
              <>
                <StopIcon className="h-5 w-5 mr-2" />
                Stop Bot
              </>
            ) : (
              <>
                <PlayIconSolid className="h-5 w-5 mr-2" />
                Start Bot
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel (Expandable) */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bot Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto Trading
              </label>
              <div className="flex items-center">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, autoTrade: !prev.autoTrade }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoTrade ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoTrade ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm text-gray-500">
                  {settings.autoTrade ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Confidence ({settings.minConfidence}%)
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={settings.minConfidence}
                onChange={(e) => setSettings(prev => ({ ...prev, minConfidence: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Positions
              </label>
              <select
                value={settings.maxPositions}
                onChange={(e) => setSettings(prev => ({ ...prev, maxPositions: parseInt(e.target.value) }))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Per Trade
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  value={settings.riskPerTrade}
                  onChange={(e) => setSettings(prev => ({ ...prev, riskPerTrade: parseFloat(e.target.value) }))}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
                  step="0.1"
                  min="0.5"
                  max="5"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-lg p-3 ${
                index === 0 ? 'bg-blue-100' :
                index === 1 ? 'bg-green-100' :
                index === 2 ? 'bg-purple-100' :
                'bg-yellow-100'
              }`}>
                <stat.icon className={`h-6 w-6 ${
                  index === 0 ? 'text-blue-600' :
                  index === 1 ? 'text-green-600' :
                  index === 2 ? 'text-purple-600' :
                  'text-yellow-600'
                }`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">{stat.name}</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className={`ml-2 text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500">{stat.subtext}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Account Performance</h2>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${accountData.todayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {accountData.todayPnL >= 0 ? '+' : ''}{accountData.todayPnL.toFixed(2)}
              </span>
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Today</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Signals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Signals</h2>
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-4">
            {signalHistory.slice(0, 4).map((signal) => (
              <div key={signal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{signal.symbol}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      signal.direction === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {signal.direction}
                    </span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-500">{signal.time}</span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-xs font-medium text-gray-700">{signal.confidence}% confidence</span>
                  </div>
                </div>
                {signal.result === 'win' && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                {signal.result === 'loss' && <XCircleIcon className="h-5 w-5 text-red-500" />}
                {signal.result === 'pending' && <ArrowPathIcon className="h-5 w-5 text-yellow-500 animate-spin" />}
              </div>
            ))}
          </div>
          <button className="mt-4 w-full text-sm text-primary-600 hover:text-primary-700 font-medium">
            View All Signals →
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* TradingView Widget Card */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Market Overview</h2>
            <div className="flex items-center space-x-2">
              <button className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">XAUUSD</button>
              <button className="text-xs px-2 py-1 hover:bg-gray-100 text-gray-600 rounded">EURUSD</button>
              <button className="text-xs px-2 py-1 hover:bg-gray-100 text-gray-600 rounded">BTCUSD</button>
            </div>
          </div>
          <div className="h-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-500" />
              <p className="mt-2 text-sm text-gray-400">TradingView Chart</p>
              <button className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
                Open Full Chart
              </button>
            </div>
          </div>
        </div>

        {/* Today's News Card */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Today's News Events</h2>
            <BellAlertIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : news.length > 0 ? (
            <div className="flow-root max-h-96 overflow-y-auto">
              <ul role="list" className="-mb-8">
                {news.map((event, eventIdx) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {eventIdx !== news.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              event.impact === 'high'
                                ? 'bg-red-500'
                                : event.impact === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                          >
                            <span className="text-white text-xs font-bold">
                              {event.currency}
                            </span>
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{event.event}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              Forecast: {event.forecast || '--'} | Previous: {event.previous || '--'}
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time dateTime={event.event_time}>
                              {format(new Date(`2000-01-01T${event.event_time}`), 'h:mm a')}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No news events for today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}