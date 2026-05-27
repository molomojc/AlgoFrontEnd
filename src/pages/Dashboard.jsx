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
  SparklesIcon,
  TrophyIcon,
  RocketLaunchIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import { PlayIcon as PlayIconSolid } from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Chart from '../components/Chart'

export default function Dashboard() {
  const { user } = useAuth()
  const [activeSymbol, setActiveSymbol] = useState('XAUUSD')
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentTrades, setRecentTrades] = useState([])
  const [recentTradesLoading, setRecentTradesLoading] = useState(true)
  const [showTradesModal, setShowTradesModal] = useState(false)
  const [tradesModalFilter, setTradesModalFilter] = useState('all') // all | wins | losses
  const [allTrades, setAllTrades] = useState([])
  const [allTradesLoading, setAllTradesLoading] = useState(false)
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

  // Trading limits state
  const [tradingLimits, setTradingLimits] = useState({
    target_today: 0,
    target_reached: false,
    max_daily_loss: 100,
    loss_limit_reached: false,
    stop_trading_on_loss: true,
    bot_auto_stopped: false
  })
  const [limitsLoading, setLimitsLoading] = useState(true)

  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    autoTrade: true,
    minConfidence: 75,
    maxPositions: 5,
    riskPerTrade: 2.0,
    scanInterval: 15,
    profit_target: 0,
    loss_limit: 100
  })

  const [targetAnimation, setTargetAnimation] = useState(false)
  const [lossAnimation, setLossAnimation] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    loadNews()
    loadBotStatus()
    loadAccountSnapshot()
    loadRecentTrades()
    loadTradingLimits()

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

    const tradeLogsSubscription = supabase
      .channel('trade_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_logs',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadRecentTrades()
          if (showTradesModal) loadAllTrades()
        }
      )
      .subscribe()

    const tradingLimitsSubscription = supabase
      .channel('auto_trade_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_trade_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            const newTargetReached = payload.new.target_reached || false
            const newLossLimitReached = payload.new.loss_limit_reached || false
            
            setTradingLimits({
              target_today: Number(payload.new.target_today) || 0,
              target_reached: newTargetReached,
              max_daily_loss: Number(payload.new.max_daily_loss) || 100,
              loss_limit_reached: newLossLimitReached,
              stop_trading_on_loss: payload.new.stop_trading_on_loss !== false,
              bot_auto_stopped: payload.new.bot_auto_stopped || false
            })
            
            // Trigger animation when target is newly reached
            if (newTargetReached && !tradingLimits.target_reached) {
              setTargetAnimation(true)
              setTimeout(() => setTargetAnimation(false), 5000)
            }
            
            // Trigger loss animation when loss limit is newly reached
            if (newLossLimitReached && !tradingLimits.loss_limit_reached) {
              setLossAnimation(true)
              setTimeout(() => setLossAnimation(false), 5000)
              // Update bot status if auto-stopped
              if (payload.new.bot_auto_stopped) {
                setBotStatus('stopped')
              }
            }
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
      tradeLogsSubscription.unsubscribe()
      tradingLimitsSubscription.unsubscribe()
    }

  }, [user])

  const loadAllTrades = async () => {
    setAllTradesLoading(true)
    try {
      const { data, error } = await supabase
        .from('trade_logs')
        .select('id, mt5_ticket, symbol, side, volume, open_price, stop_loss, take_profit, close_price, profit, status, comment, close_reason, opened_at, closed_at, created_at')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(250)

      if (error) throw error
      setAllTrades(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load all trades:', error)
      toast.error('Failed to load trades')
      setAllTrades([])
    } finally {
      setAllTradesLoading(false)
    }
  }

  const getFilteredTrades = () => {
    const trades = Array.isArray(allTrades) ? allTrades : []
    if (tradesModalFilter === 'wins') return trades.filter((t) => (Number(t.profit) || 0) > 0)
    if (tradesModalFilter === 'losses') return trades.filter((t) => (Number(t.profit) || 0) < 0)
    return trades
  }

  const loadRecentTrades = async () => {
    setRecentTradesLoading(true)
    try {
      const { data, error } = await supabase
        .from('trade_logs')
        .select('id, mt5_ticket, symbol, side, volume, open_price, stop_loss, take_profit, close_price, profit, status, comment, close_reason, opened_at, closed_at, created_at')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentTrades(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load recent trades:', error)
      toast.error('Failed to load recent trades')
      setRecentTrades([])
    } finally {
      setRecentTradesLoading(false)
    }
  }

  const loadTradingLimits = async () => {
    try {
      setLimitsLoading(true)

      const { data, error } = await supabase
        .from('auto_trade_settings')
        .select('target_today, target_reached, max_daily_loss, loss_limit_reached, stop_trading_on_loss, bot_auto_stopped')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (error) throw error

      setTradingLimits({
        target_today: Number(data?.target_today) || 0,
        target_reached: data?.target_reached || false,
        max_daily_loss: Number(data?.max_daily_loss) || 100,
        loss_limit_reached: data?.loss_limit_reached || false,
        stop_trading_on_loss: data?.stop_trading_on_loss !== false,
        bot_auto_stopped: data?.bot_auto_stopped || false
      })
      
      setSettings(prev => ({
        ...prev,
        profit_target: Number(data?.target_today) || 0,
        loss_limit: Number(data?.max_daily_loss) || 100
      }))
    } catch (error) {
      console.error('Failed to load trading limits:', error)
    } finally {
      setLimitsLoading(false)
    }
  }

  const markTargetReached = async () => {
    try {
      const { error } = await supabase
        .from('auto_trade_settings')
        .update({ target_reached: true })
        .eq('user_id', user.id)

      if (error) throw error
      
      setTradingLimits(prev => ({ ...prev, target_reached: true }))
      setTargetAnimation(true)
      setTimeout(() => setTargetAnimation(false), 5000)
      
      toast.success(`🎯 Daily profit target of $${tradingLimits.target_today} reached! Great job!`)
    } catch (error) {
      console.error('Failed to update target status:', error)
    }
  }

  const markLossLimitReached = async () => {
    try {
      const { error } = await supabase
        .from('auto_trade_settings')
        .update({ 
          loss_limit_reached: true,
          bot_auto_stopped: true,
          enabled: false
        })
        .eq('user_id', user.id)

      if (error) throw error
      
      setTradingLimits(prev => ({ 
        ...prev, 
        loss_limit_reached: true,
        bot_auto_stopped: true
      }))
      setBotStatus('stopped')
      setLossAnimation(true)
      setTimeout(() => setLossAnimation(false), 5000)
      
      toast.error(`⚠️ Daily loss limit of $${tradingLimits.max_daily_loss} reached! Trading stopped.`)
    } catch (error) {
      console.error('Failed to update loss limit status:', error)
    }
  }

  const resetTarget = async () => {
    try {
      const { error } = await supabase
        .from('auto_trade_settings')
        .update({ 
          target_reached: false,
          target_today: 0 
        })
        .eq('user_id', user.id)

      if (error) throw error
      
      setTradingLimits(prev => ({
        ...prev,
        target_today: 0,
        target_reached: false
      }))
      
      toast.success('Target reset! Set a new daily target to continue.')
    } catch (error) {
      console.error('Failed to reset target:', error)
      toast.error('Failed to reset target')
    }
  }

  const resetLossLimit = async () => {
    try {
      const { error } = await supabase
        .from('auto_trade_settings')
        .update({ 
          loss_limit_reached: false,
          bot_auto_stopped: false
        })
        .eq('user_id', user.id)

      if (error) throw error
      
      setTradingLimits(prev => ({ 
        ...prev, 
        loss_limit_reached: false,
        bot_auto_stopped: false
      }))
      
      toast.success('Loss limit reset. Trading can resume.')
    } catch (error) {
      console.error('Failed to reset loss limit:', error)
      toast.error('Failed to reset loss limit')
    }
  }

  const updateTradingLimits = async () => {
    setLimitsLoading(true)
    try {
      const updates = {}
      if (settings.profit_target !== tradingLimits.target_today) {
        updates.target_today = settings.profit_target
        updates.target_reached = false
      }
      if (settings.loss_limit !== tradingLimits.max_daily_loss) {
        updates.max_daily_loss = settings.loss_limit
        updates.loss_limit_reached = false
      }
      
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('auto_trade_settings')
          .update(updates)
          .eq('user_id', user.id)

        if (error) throw error
        
        setTradingLimits(prev => ({
          ...prev,
          target_today: settings.profit_target,
          max_daily_loss: settings.loss_limit,
          target_reached: settings.profit_target > 0 ? false : prev.target_reached,
          loss_limit_reached: settings.loss_limit > 0 ? false : prev.loss_limit_reached
        }))
        
        toast.success('Trading limits updated successfully!')
      }
    } catch (error) {
      console.error('Failed to update trading limits:', error)
      toast.error('Failed to update trading limits')
    } finally {
      setLimitsLoading(false)
    }
  }

  const getTradeStatusColor = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800'
      case 'OPEN':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTradeTime = (trade) => {
    const timestamp = trade?.opened_at || trade?.created_at
    if (!timestamp) return '--'
    try {
      return format(new Date(timestamp), 'HH:mm')
    } catch {
      return '--'
    }
  }

  const getProfitMeta = (profit) => {
    if (profit === null || profit === undefined || Number.isNaN(Number(profit))) return null
    const numericProfit = Number(profit)
    return {
      value: numericProfit,
      className: numericProfit > 0 ? 'text-green-700' : numericProfit < 0 ? 'text-red-700' : 'text-gray-700',
      sign: numericProfit > 0 ? '+' : ''
    }
  }

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
      await loadAccountSnapshot()
    } catch (error) {
      console.error('Error refreshing account data:', error)
    }
  }

  const handleBotToggle = async () => {
    // Check if loss limit is reached before starting
    if (botStatus === 'stopped' && tradingLimits.loss_limit_reached) {
      toast.error('Cannot start bot. Daily loss limit has been reached. Please reset the loss limit first.')
      return
    }
    
    const newStatus = botStatus === 'running' ? 'stopped' : 'running'
    
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
    
    if (tradingLimits.loss_limit_reached) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <ShieldExclamationIcon className="h-4 w-4 mr-1" />
          Loss Limit Hit - Bot Stopped
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

  const targetProgress = tradingLimits.target_today > 0
    ? Math.min(100, Math.max(0, (accountData.todayPnL / tradingLimits.target_today) * 100))
    : 0

  const lossProgress = tradingLimits.max_daily_loss > 0 && accountData.todayPnL < 0
    ? Math.min(100, Math.max(0, (Math.abs(accountData.todayPnL) / tradingLimits.max_daily_loss) * 100))
    : 0

  const getTargetStatus = () => {
    if (limitsLoading) return 'loading'
    if (tradingLimits.loss_limit_reached) return 'loss-limit-reached'
    if (tradingLimits.target_reached) return 'reached'
    if (tradingLimits.target_today <= 0 && tradingLimits.max_daily_loss <= 0) return 'no-target'
    if (accountData.todayPnL >= tradingLimits.target_today && tradingLimits.target_today > 0) return 'reached'
    if (accountData.todayPnL <= -tradingLimits.max_daily_loss && tradingLimits.max_daily_loss > 0) return 'loss-limit-reached'
    if (accountData.todayPnL > 0) return 'processing'
    if (accountData.todayPnL === 0) return 'awaiting'
    if (accountData.todayPnL < 0) return 'losing'
    return 'processing'
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
      {/* Celebration Overlay Animation */}
      {targetAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-bounce">
              <TrophyIcon className="h-32 w-32 text-yellow-500 drop-shadow-lg" />
            </div>
          </div>
          <div className="absolute top-1/4 left-1/4 animate-ping">
            <SparklesIcon className="h-8 w-8 text-yellow-400" />
          </div>
          <div className="absolute top-1/3 right-1/4 animate-ping delay-100">
            <SparklesIcon className="h-6 w-6 text-yellow-400" />
          </div>
          <div className="absolute bottom-1/3 left-1/3 animate-ping delay-200">
            <SparklesIcon className="h-10 w-10 text-yellow-400" />
          </div>
        </div>
      )}

      {/* Loss Limit Overlay Animation */}
      {lossAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-bounce">
              <ShieldExclamationIcon className="h-32 w-32 text-red-500 drop-shadow-lg" />
            </div>
          </div>
          <div className="absolute inset-0 bg-red-500 opacity-10 animate-pulse" />
        </div>
      )}

      {/* All Trades Modal */}
      {showTradesModal && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setShowTradesModal(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">All Trades</h3>
                  <p className="text-sm text-gray-500">Filter and review your trade history.</p>
                </div>
                <button
                  onClick={() => setShowTradesModal(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'wins', label: 'Wins' },
                    { id: 'losses', label: 'Losses' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setTradesModalFilter(opt.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                        tradesModalFilter === opt.id
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={loadAllTrades}
                  className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Refresh
                </button>
              </div>

              <div className="max-h-[65vh] overflow-auto border-t border-gray-200">
                {allTradesLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Symbol</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Side</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ticket</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Profit</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Opened</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {getFilteredTrades().map((t) => {
                        const profit = Number(t.profit)
                        const profitClass =
                          Number.isFinite(profit) ? (profit > 0 ? 'text-green-700' : profit < 0 ? 'text-red-700' : 'text-gray-700') : 'text-gray-500'
                        return (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.symbol || '--'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{(t.side || '--').toUpperCase()}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTradeStatusColor(t.status)}`}>
                                {(t.status || 'OPEN').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{t.mt5_ticket ?? '--'}</td>
                            <td className={`px-4 py-3 text-sm text-right font-semibold ${profitClass}`}>
                              {Number.isFinite(profit) ? `${profit > 0 ? '+' : ''}${profit.toFixed(2)}` : '--'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                              {t.opened_at ? format(new Date(t.opened_at), 'yyyy-MM-dd HH:mm') : '--'}
                            </td>
                          </tr>
                        )
                      })}
                      {!allTradesLoading && getFilteredTrades().length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                            No trades found for this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
            disabled={tradingLimits.loss_limit_reached && botStatus === 'stopped'}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              tradingLimits.loss_limit_reached && botStatus === 'stopped'
                ? 'bg-gray-400 cursor-not-allowed'
                : botStatus === 'running'
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
          
          {/* Trading Limits Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Trading Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profit Target ($)
                </label>
                <input
                  type="number"
                  value={settings.profit_target}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setSettings(prev => ({ ...prev, profit_target: isNaN(value) ? 0 : value }))
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="e.g., 100"
                  min="0"
                  step="10"
                />
                <p className="mt-1 text-xs text-gray-500">Daily profit goal (0 = disabled)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Loss Limit ($)
                </label>
                <input
                  type="number"
                  value={settings.loss_limit}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setSettings(prev => ({ ...prev, loss_limit: isNaN(value) ? 0 : value }))
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="e.g., 50"
                  min="0"
                  step="10"
                />
                <p className="mt-1 text-xs text-gray-500">Maximum daily loss (0 = disabled)</p>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={updateTradingLimits}
                disabled={limitsLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50"
              >
                {limitsLoading ? 'Saving...' : 'Save Limits'}
              </button>
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

      {/* Daily Target & Loss Protection Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Daily Trading Limits</h2>
              <p className="text-sm text-gray-500">
                {limitsLoading
                  ? 'Loading limits...'
                  : `${tradingLimits.target_today > 0 ? `Profit Target: $${tradingLimits.target_today.toFixed(2)}` : 'No profit target'} | 
                   ${tradingLimits.max_daily_loss > 0 ? `Loss Limit: $${tradingLimits.max_daily_loss}` : 'No loss limit'}`
              }
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {getTargetStatus() === 'loss-limit-reached' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 animate-pulse">
                  <ShieldExclamationIcon className="h-4 w-4 mr-1" />
                  Loss Limit Reached! ⚠️
                </span>
              )}
              {getTargetStatus() === 'reached' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 animate-pulse">
                  <TrophyIcon className="h-4 w-4 mr-1" />
                  Target Reached! 🎯
                </span>
              )}
              {getTargetStatus() === 'processing' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                  Processing Target
                </span>
              )}
              {getTargetStatus() === 'losing' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  <TrendingDownIcon className="h-4 w-4 mr-1" />
                  In Drawdown
                </span>
              )}
              {getTargetStatus() === 'awaiting' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Awaiting Trades
                </span>
              )}
              {getTargetStatus() === 'no-target' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                  <FlagIcon className="h-4 w-4 mr-1" />
                  No Limits Set
                </span>
              )}
            </div>
          </div>

          {/* Dual Progress Bars */}
          <div className="space-y-6">
            {/* Profit Target Progress */}
            {tradingLimits.target_today > 0 && (
              <div>
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Profit Target Progress</p>
                    <p className="text-xs text-gray-500">Goal: ${tradingLimits.target_today.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${accountData.todayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${accountData.todayPnL >= 0 ? '+' : ''}{accountData.todayPnL.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{targetProgress.toFixed(0)}% complete</p>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      tradingLimits.target_reached
                        ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 animate-pulse'
                        : accountData.todayPnL > 0 
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : 'bg-gray-300'
                    }`}
                    style={{ width: `${targetProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Loss Limit Progress */}
            {tradingLimits.max_daily_loss > 0 && (
              <div>
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Loss Limit Status</p>
                    <p className="text-xs text-gray-500">Max Loss: ${tradingLimits.max_daily_loss}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${accountData.todayPnL < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {accountData.todayPnL < 0 ? '-' : ''}${Math.abs(accountData.todayPnL).toFixed(2)} loss
                    </p>
                    <p className="text-xs text-gray-500">{lossProgress.toFixed(0)}% of limit</p>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      tradingLimits.loss_limit_reached
                        ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse'
                        : accountData.todayPnL < 0
                          ? 'bg-gradient-to-r from-orange-400 to-red-500'
                          : 'bg-gray-300'
                    }`}
                    style={{ width: `${lossProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500">Today's P&L</p>
              <p className={`mt-1 text-xl font-semibold ${accountData.todayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {accountData.todayPnL >= 0 ? '+' : ''}${accountData.todayPnL.toFixed(2)}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500">Profit Target</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                ${tradingLimits.target_today.toFixed(2)}
              </p>
              {tradingLimits.target_today > 0 && accountData.todayPnL < tradingLimits.target_today && (
                <p className="text-xs text-gray-500">
                  Left: ${Math.max(0, tradingLimits.target_today - accountData.todayPnL).toFixed(2)}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500">Loss Limit</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                ${tradingLimits.max_daily_loss}
              </p>
              {tradingLimits.max_daily_loss > 0 && accountData.todayPnL < 0 && (
                <p className="text-xs text-gray-500">
                  Remaining: ${Math.max(0, tradingLimits.max_daily_loss - Math.abs(accountData.todayPnL)).toFixed(2)}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500">Trades Today</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {accountData.tradesToday || 0}
              </p>
            </div>
          </div>

          {/* Status Messages */}
          <div className="mt-5">
            {tradingLimits.loss_limit_reached ? (
              <div className="rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-orange-50 p-5 relative overflow-hidden shadow-lg">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute -top-6 left-6 h-20 w-20 rounded-full bg-red-300 blur-2xl animate-pulse" />
                  <div className="absolute top-2 right-10 h-16 w-16 rounded-full bg-orange-300 blur-2xl animate-bounce" />
                </div>

                <div className="relative flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <ShieldExclamationIcon className="h-8 w-8 text-red-500 animate-bounce" />
                      <p className="text-xl font-bold text-red-800">
                        ⚠️ Daily Loss Limit Reached!
                      </p>
                    </div>
                    <p className="text-sm text-red-700 font-medium">
                      You've reached your daily loss limit of ${tradingLimits.max_daily_loss}.
                    </p>
                    <p className="mt-2 text-sm text-red-600">
                      Trading has been automatically stopped to protect your account.
                    </p>
                  </div>
                  <button
                    onClick={resetLossLimit}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 font-medium shadow-md"
                  >
                    Reset Loss Limit & Resume
                  </button>
                </div>
              </div>
            ) : tradingLimits.target_reached ? (
              <div className="rounded-xl border-2 border-green-300 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 p-5 relative overflow-hidden shadow-lg">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute -top-6 left-6 h-20 w-20 rounded-full bg-green-300 blur-2xl animate-pulse" />
                  <div className="absolute top-2 right-10 h-16 w-16 rounded-full bg-emerald-300 blur-2xl animate-bounce" />
                </div>

                <div className="relative flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrophyIcon className="h-8 w-8 text-yellow-500 animate-bounce" />
                      <p className="text-xl font-bold text-green-800">
                        🎉 Profit Target Reached! 🎉
                      </p>
                    </div>
                    <p className="text-sm text-green-700 font-medium">
                      Congratulations! You've successfully reached today's profit goal of ${tradingLimits.target_today}.
                    </p>
                    <p className="mt-2 text-sm text-green-600">
                      Set a new target to continue your winning streak!
                    </p>
                  </div>
                  <button
                    onClick={resetTarget}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 font-medium shadow-md"
                  >
                    Set New Target
                  </button>
                </div>
              </div>
            ) : accountData.todayPnL < 0 && lossProgress > 50 && tradingLimits.max_daily_loss > 0 ? (
              <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-30" />
                    <ExclamationTriangleIcon className="relative h-8 w-8 text-orange-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-orange-800">
                      Warning: Approaching Daily Loss Limit
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      Current loss: ${Math.abs(accountData.todayPnL).toFixed(2)} of ${tradingLimits.max_daily_loss} limit
                      ({lossProgress.toFixed(0)}% used)
                    </p>
                  </div>
                </div>
              </div>
            ) : tradingLimits.target_today > 0 && accountData.todayPnL > 0 && targetProgress > 50 ? (
              <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                <div className="flex items-center space-x-3">
                  <RocketLaunchIcon className="h-8 w-8 text-green-500 animate-bounce" />
                  <div>
                    <p className="text-base font-semibold text-green-800">
                      Getting close to your target!
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      {targetProgress.toFixed(0)}% complete - just ${Math.max(0, tradingLimits.target_today - accountData.todayPnL).toFixed(2)} to go!
                    </p>
                  </div>
                </div>
              </div>
            ) : tradingLimits.target_today <= 0 && tradingLimits.max_daily_loss <= 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                <FlagIcon className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-700">No trading limits configured</p>
                <p className="mt-1 text-xs text-gray-500">Set profit targets and loss limits to protect your account</p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="mt-3 px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700"
                >
                  Configure Limits
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Trades</h2>
            <SparklesIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentTradesLoading ? (
              <div className="flex justify-center py-8">
                <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : recentTrades.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No trades yet</p>
              </div>
            ) : (
              recentTrades.slice(0, 4).map((trade) => {
                const profitMeta = getProfitMeta(trade.profit)
                return (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{trade.symbol || '--'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          (trade.side || '').toUpperCase() === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(trade.side || '--').toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTradeStatusColor(trade.status)}`}>
                          {(trade.status || 'OPEN').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500">{formatTradeTime(trade)}</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-xs font-medium text-gray-700">Ticket #{trade.mt5_ticket}</span>
                        {profitMeta && (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className={`text-xs font-semibold ${profitMeta.className}`}>
                              {profitMeta.sign}{profitMeta.value.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {(trade.status || '').toUpperCase() === 'CLOSED' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowPathIcon className="h-5 w-5 text-yellow-500 animate-spin" />
                    )}
                  </div>
                )
              })
            )}
          </div>
          <button
            onClick={() => {
              setShowTradesModal(true)
              loadAllTrades()
            }}
            className="mt-4 w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View All Trades →
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Market Overview Card */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-7 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Market Overview</h2>
            <div className="flex items-center space-x-2">
              {['XAUUSD', 'EURUSD', 'BTCUSD'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => setActiveSymbol(sym)}
                  className={`text-xs px-2.5 py-1.5 font-semibold rounded-lg transition-all ${
                    activeSymbol === sym
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[520px] border border-gray-200 rounded-xl overflow-hidden bg-slate-50 relative flex-1">
            <Chart symbol={activeSymbol} theme="light" height="100%" />
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
