import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../utils/database.queries'
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  BanknotesIcon 
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

// Mock data for demonstration (replace with actual MT5 data)
const mockAccountData = {
  balance: 10000.00,
  equity: 10250.50,
  openPositions: 3,
  todayPnL: 250.50
}

export default function Dashboard() {
  const { user } = useAuth()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [accountData, setAccountData] = useState(mockAccountData)

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    try {
      const newsData = await db.getTodaysNews()
      setNews(newsData)
    } catch (error) {
      toast.error('Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      name: 'Balance',
      value: `$${accountData.balance.toFixed(2)}`,
      icon: BanknotesIcon,
      change: '+4.75%',
      changeType: 'positive'
    },
    {
      name: 'Equity',
      value: `$${accountData.equity.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      change: '+2.5%',
      changeType: 'positive'
    },
    {
      name: 'Open Positions',
      value: accountData.openPositions,
      icon: ChartBarIcon,
      change: '0',
      changeType: 'neutral'
    },
    {
      name: "Today's P&L",
      value: `$${accountData.todayPnL.toFixed(2)}`,
      icon: ArrowTrendingUpIcon,
      change: '+2.5%',
      changeType: 'positive'
    }
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
          >
            <dt>
              <div className="absolute bg-primary-500 rounded-md p-3">
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">{stat.name}</p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stat.changeType === 'positive'
                    ? 'text-green-600'
                    : stat.changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* TradingView Widget Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Market Overview</h2>
          <div className="h-[400px] bg-gray-100 rounded flex items-center justify-center">
            {/* TradingView Widget will go here */}
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">TradingView Chart</p>
              <p className="text-xs text-gray-400">Widget will be integrated here</p>
            </div>
          </div>
        </div>

        {/* Today's News Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Today's News Events</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : news.length > 0 ? (
            <div className="flow-root">
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
                            <p className="text-sm text-gray-900">{event.event}</p>
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
              <p className="text-sm text-gray-500">No news events for today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}