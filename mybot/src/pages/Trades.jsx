import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../utils/database.queries'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'

export default function Trades() {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState(null)
  const [userSettings, setUserSettings] = useState(null)
  const [formData, setFormData] = useState({
    currency: '',
    trade_pair: 'XAUUSD',
    news_event: '',
    impact: 'medium',
    trade_date: format(new Date(), 'yyyy-MM-dd'),
    trade_time: format(new Date(), 'HH:mm'),
    num_trades: 1,
    lot_size: 0.01,
    time_to_place: 60
  })

  useEffect(() => {
    loadTrades()
    loadUserSettings()
  }, [])

  const loadTrades = async () => {
    try {
      const data = await db.getTradeRequests(user.id)
      setTrades(data)
    } catch (error) {
      toast.error('Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  const loadUserSettings = async () => {
    try {
      const settings = await db.getUserSettings(user.id)
      if (settings) {
        setUserSettings(settings)
        setFormData(prev => ({
          ...prev,
          num_trades: settings.default_num_trades,
          lot_size: settings.default_lot_size,
          time_to_place: settings.default_time_to_place
        }))
      }
    } catch (error) {
      console.error('Failed to load user settings:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingTrade) {
        await db.updateTradeRequest(editingTrade.id, formData)
        toast.success('Trade updated successfully')
      } else {
        await db.createTradeRequest(user.id, formData)
        toast.success('Trade created successfully')
      }
      
      setShowForm(false)
      setEditingTrade(null)
      resetForm()
      loadTrades()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleEdit = (trade) => {
    setEditingTrade(trade)
    setFormData({
      currency: trade.currency,
      trade_pair: trade.trade_pair,
      news_event: trade.news_event,
      impact: trade.impact,
      trade_date: trade.trade_date,
      trade_time: trade.trade_time.slice(0, 5),
      num_trades: trade.num_trades,
      lot_size: trade.lot_size,
      time_to_place: trade.time_to_place || 60
    })
    setShowForm(true)
  }

  const handleDelete = async (tradeId) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      try {
        await db.deleteTradeRequest(tradeId)
        toast.success('Trade deleted successfully')
        loadTrades()
      } catch (error) {
        toast.error('Failed to delete trade')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      currency: '',
      trade_pair: 'XAUUSD',
      news_event: '',
      impact: 'medium',
      trade_date: format(new Date(), 'yyyy-MM-dd'),
      trade_time: format(new Date(), 'HH:mm'),
      num_trades: userSettings?.default_num_trades || 1,
      lot_size: userSettings?.default_lot_size || 0.01,
      time_to_place: userSettings?.default_time_to_place || 60
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'executed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Trades</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your trade requests for the trading bot.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => {
              resetForm()
              setEditingTrade(null)
              setShowForm(true)
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Trade
          </button>
        </div>
      </div>

      {/* Trade Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingTrade(null)
                    }}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                      {editingTrade ? 'Edit Trade' : 'Create New Trade'}
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                          Currency
                        </label>
                        <input
                          type="text"
                          name="currency"
                          id="currency"
                          required
                          value={formData.currency}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="e.g., USD, EUR"
                        />
                      </div>

                      <div>
                        <label htmlFor="trade_pair" className="block text-sm font-medium text-gray-700">
                          Trade Pair
                        </label>
                        <select
                          name="trade_pair"
                          id="trade_pair"
                          required
                          value={formData.trade_pair}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                          <option value="XAUUSD">XAUUSD (Gold)</option>
                          <option value="EURUSD">EURUSD</option>
                          <option value="GBPUSD">GBPUSD</option>
                          <option value="USDJPY">USDJPY</option>
                          <option value="USDCAD">USDCAD</option>
                          <option value="AUDUSD">AUDUSD</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="news_event" className="block text-sm font-medium text-gray-700">
                          News Event
                        </label>
                        <input
                          type="text"
                          name="news_event"
                          id="news_event"
                          required
                          value={formData.news_event}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="e.g., Non-Farm Payrolls"
                        />
                      </div>

                      <div>
                        <label htmlFor="impact" className="block text-sm font-medium text-gray-700">
                          Impact
                        </label>
                        <select
                          name="impact"
                          id="impact"
                          required
                          value={formData.impact}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="trade_date" className="block text-sm font-medium text-gray-700">
                            Trade Date
                          </label>
                          <input
                            type="date"
                            name="trade_date"
                            id="trade_date"
                            required
                            value={formData.trade_date}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="trade_time" className="block text-sm font-medium text-gray-700">
                            Trade Time
                          </label>
                          <input
                            type="time"
                            name="trade_time"
                            id="trade_time"
                            required
                            value={formData.trade_time}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="time_to_place" className="block text-sm font-medium text-gray-700">
                          Time to Place (seconds)
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ClockIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                          <input
                            type="number"
                            name="time_to_place"
                            id="time_to_place"
                            required
                            min="1"
                            value={formData.time_to_place}
                            onChange={handleChange}
                            className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Window around the trade time to place orders
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="num_trades" className="block text-sm font-medium text-gray-700">
                            Number of Trades
                          </label>
                          <input
                            type="number"
                            name="num_trades"
                            id="num_trades"
                            required
                            min="1"
                            max="10"
                            value={formData.num_trades}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="lot_size" className="block text-sm font-medium text-gray-700">
                            Lot Size
                          </label>
                          <input
                            type="number"
                            name="lot_size"
                            id="lot_size"
                            required
                            min="0.01"
                            step="0.01"
                            value={formData.lot_size}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 sm:ml-3 sm:w-auto"
                        >
                          {editingTrade ? 'Update' : 'Create'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false)
                            setEditingTrade(null)
                          }}
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trades Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : trades.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Event
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Pair
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date/Time
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Details
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {trades.map((trade) => (
                      <tr key={trade.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="font-medium text-gray-900">{trade.news_event}</div>
                          <div className="text-gray-500">{trade.currency}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {trade.trade_pair}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>{format(new Date(trade.trade_date), 'MMM dd, yyyy')}</div>
                          <div className="text-xs">{trade.trade_time}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>{trade.num_trades} trades × {trade.lot_size} lots</div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getImpactColor(trade.impact)}`}>
                            {trade.impact}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(trade)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(trade.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 bg-white">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No trades</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new trade.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}