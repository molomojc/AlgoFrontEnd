import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../utils/database.queries'
import toast from 'react-hot-toast'
import { 
  UserCircleIcon, 
  Cog6ToothIcon, 
  BellIcon, 
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CreditCardIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  LanguageIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

export default function Profile() {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    broker: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    language: 'en',
    timezone: 'UTC'
  })
  const [settings, setSettings] = useState({
    default_lot_size: 0.01,
    default_num_trades: 1,
    default_time_to_place: 60,
    risk_percentage: 2.0,
    max_daily_trades: 10,
    max_daily_loss: 100,
    max_position_size: 1.0,
    notification_email: true,
    notification_push: true,
    notification_sms: false,
    auto_confirm_trades: false,
    require_confirmation: true
  })
  const [security, setSecurity] = useState({
    two_factor_enabled: false,
    last_password_change: null,
    session_timeout: 30,
    ip_whitelist: []
  })
  const [apiKeys, setApiKeys] = useState([])
  const [showApiKeyForm, setShowApiKeyForm] = useState(false)
  const [newApiKey, setNewApiKey] = useState({ name: '', key: '', secret: '' })

  const tabs = [
    { id: 'profile', label: 'Personal Info', icon: UserCircleIcon },
    { id: 'trading', label: 'Trading Preferences', icon: ChartBarIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'api', label: 'API Keys', icon: KeyIcon }
  ]

  useEffect(() => {
    if (authLoading) return
    if (!userId) return

    loadProfile()
    loadSettings()
    loadSecurity()
    loadApiKeys()
  }, [authLoading, userId])

  const loadProfile = async () => {
    try {
      const data = await db.getUserProfile(userId)
      if (data) {
        setProfile(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      toast.error('Failed to load profile')
    }
  }

  const loadSettings = async () => {
    try {
      const data = await db.getUserSettings(userId)
      if (data) {
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      toast.error('Failed to load settings')
    }
  }

  const loadSecurity = async () => {
    try {
      // Fetch security settings from your API
      const data = await db.getUserSecurity(userId)
      if (data) {
        setSecurity(data)
      }
    } catch (error) {
      console.error('Failed to load security settings:', error)
    }
  }

  const loadApiKeys = async () => {
    try {
      const data = await db.getApiKeys(userId)
      if (data) {
        setApiKeys(data)
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const handleProfileChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    })
  }

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
    })
  }

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target
    setSecurity({
      ...security,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await db.updateUserProfile(userId, profile)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await db.updateUserSettings(userId, settings)
      toast.success('Settings updated successfully')
    } catch (error) {
      toast.error('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSecuritySubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await db.updateUserSecurity(userId, security)
      toast.success('Security settings updated')
    } catch (error) {
      toast.error('Failed to update security settings')
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const key = await db.createApiKey(userId, newApiKey)
      setApiKeys([...apiKeys, key])
      setNewApiKey({ name: '', key: '', secret: '' })
      setShowApiKeyForm(false)
      toast.success('API key created successfully')
    } catch (error) {
      toast.error('Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  const deleteApiKey = async (keyId) => {
    if (confirm('Are you sure you want to delete this API key?')) {
      try {
        await db.deleteApiKey(userId, keyId)
        setApiKeys(apiKeys.filter(key => key.id !== keyId))
        toast.success('API key deleted')
      } catch (error) {
        toast.error('Failed to delete API key')
      }
    }
  }

  const renderProfileTab = () => (
    <form onSubmit={handleProfileSubmit} className="space-y-6">
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {profile.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              <p className="text-sm text-gray-500">Update your personal details and contact information</p>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="inline h-4 w-4 mr-1" />
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={profile.first_name || ''}
                onChange={handleProfileChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all"
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="inline h-4 w-4 mr-1" />
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={profile.last_name || ''}
                onChange={handleProfileChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all"
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserCircleIcon className="inline h-4 w-4 mr-1" />
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={profile.full_name || ''}
              onChange={handleProfileChange}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <EnvelopeIcon className="inline h-4 w-4 mr-1" />
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed. Contact support for assistance.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhoneIcon className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={profile.phone || ''}
                onChange={handleProfileChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingOfficeIcon className="inline h-4 w-4 mr-1" />
                Broker
              </label>
              <input
                type="text"
                name="broker"
                value={profile.broker || ''}
                onChange={handleProfileChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all"
                placeholder="e.g., IC Markets, FP Markets"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPinIcon className="inline h-4 w-4 mr-1" />
              Address
            </label>
            <input
              type="text"
              name="address"
              value={profile.address || ''}
              onChange={handleProfileChange}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                name="city"
                value={profile.city || ''}
                onChange={handleProfileChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <select
                name="country"
                value={profile.country || ''}
                onChange={handleProfileChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Select country</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="SG">Singapore</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <LanguageIcon className="inline h-4 w-4 mr-1" />
                Language
              </label>
              <select
                name="language"
                value={profile.language}
                onChange={handleProfileChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <GlobeAltIcon className="inline h-4 w-4 mr-1" />
                Timezone
              </label>
              <select
                name="timezone"
                value={profile.timezone}
                onChange={handleProfileChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern Time</option>
                <option value="CST">Central Time</option>
                <option value="MST">Mountain Time</option>
                <option value="PST">Pacific Time</option>
                <option value="GMT">GMT</option>
                <option value="CET">Central European Time</option>
                <option value="JST">Japan Standard Time</option>
                <option value="AEST">Australian Eastern Time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all transform hover:scale-105 disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckBadgeIcon className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )

  const renderTradingTab = () => (
    <form onSubmit={handleSettingsSubmit} className="space-y-6">
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Trading Preferences</h3>
              <p className="text-sm text-gray-500">Configure your default trading parameters</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CurrencyDollarIcon className="inline h-4 w-4 mr-1" />
                Default Lot Size
              </label>
              <input
                type="number"
                name="default_lot_size"
                min="0.01"
                step="0.01"
                value={settings.default_lot_size}
                onChange={handleSettingsChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">Standard lot size for new trades (0.01 = micro lot)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Position Size
              </label>
              <input
                type="number"
                name="max_position_size"
                min="0.01"
                step="0.01"
                value={settings.max_position_size}
                onChange={handleSettingsChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">Maximum allowed lot size per trade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Number of Trades
              </label>
              <input
                type="number"
                name="default_num_trades"
                min="1"
                max="10"
                value={settings.default_num_trades}
                onChange={handleSettingsChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Daily Trades
              </label>
              <input
                type="number"
                name="max_daily_trades"
                min="1"
                max="100"
                value={settings.max_daily_trades}
                onChange={handleSettingsChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Time to Place (seconds)
              </label>
              <input
                type="number"
                name="default_time_to_place"
                min="1"
                value={settings.default_time_to_place}
                onChange={handleSettingsChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Daily Loss ($)
              </label>
              <input
                type="number"
                name="max_daily_loss"
                min="0"
                step="10"
                value={settings.max_daily_loss}
                onChange={handleSettingsChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">Auto-stop trading after reaching daily loss limit</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Percentage (%)
            </label>
            <div className="relative">
              <input
                type="range"
                name="risk_percentage"
                min="0.1"
                max="100"
                step="0.1"
                value={settings.risk_percentage}
                onChange={handleSettingsChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative (0.1%)</span>
                <span>Moderate (2%)</span>
                <span>Aggressive (5%+)</span>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">
              Current risk: {settings.risk_percentage}% per trade
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto-confirm Trades</label>
                <p className="text-xs text-gray-500">Automatically execute trades without manual confirmation</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, auto_confirm_trades: !prev.auto_confirm_trades }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.auto_confirm_trades ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.auto_confirm_trades ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Require Confirmation</label>
                <p className="text-xs text-gray-500">Ask for confirmation before executing trades</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, require_confirmation: !prev.require_confirmation }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.require_confirmation ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.require_confirmation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all transform hover:scale-105 disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckBadgeIcon className="h-4 w-4 mr-2" />
                Save Trading Settings
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )

  const renderNotificationsTab = () => (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center">
          <div className="p-2 bg-primary-100 rounded-lg">
            <BellIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
            <p className="text-sm text-gray-500">Choose how you want to receive alerts</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div>
            <p className="font-medium text-gray-900">Email Notifications</p>
            <p className="text-sm text-gray-500">Receive trade updates and alerts via email</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, notification_email: !prev.notification_email }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.notification_email ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.notification_email ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div>
            <p className="font-medium text-gray-900">Push Notifications</p>
            <p className="text-sm text-gray-500">Real-time notifications in your browser</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, notification_push: !prev.notification_push }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.notification_push ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.notification_push ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div>
            <p className="font-medium text-gray-900">SMS Notifications</p>
            <p className="text-sm text-gray-500">Get critical alerts via text message</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, notification_sms: !prev.notification_sms }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.notification_sms ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.notification_sms ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleSettingsSubmit}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all transform hover:scale-105 disabled:opacity-50 shadow-md"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckBadgeIcon className="h-4 w-4 mr-2" />
              Save Notification Settings
            </>
          )}
        </button>
      </div>
    </div>
  )

  const renderSecurityTab = () => (
    <form onSubmit={handleSecuritySubmit} className="space-y-6">
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-500">Protect your account with advanced security features</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div>
              <p className="font-semibold text-gray-900">Two-Factor Authentication (2FA)</p>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <button
              type="button"
              onClick={() => setSecurity(prev => ({ ...prev, two_factor_enabled: !prev.two_factor_enabled }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                security.two_factor_enabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  security.two_factor_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DevicePhoneMobileIcon className="inline h-4 w-4 mr-1" />
              Session Timeout (minutes)
            </label>
            <select
              name="session_timeout"
              value={security.session_timeout}
              onChange={handleSecurityChange}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="480">8 hours</option>
              <option value="1440">24 hours</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Automatically log out after inactivity</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Change Password
            </label>
            <button
              type="button"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {/* Implement password change modal */}}
            >
              Update Password
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Security Activity</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last login</span>
                <span className="text-gray-900">Today, 10:30 AM</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last password change</span>
                <span className="text-gray-900">30 days ago</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active sessions</span>
                <span className="text-gray-900">1</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all transform hover:scale-105 disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckBadgeIcon className="h-4 w-4 mr-2" />
                Save Security Settings
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )

  const renderApiKeysTab = () => (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <KeyIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
                <p className="text-sm text-gray-500">Manage API access for third-party applications</p>
              </div>
            </div>
            <button
              onClick={() => setShowApiKeyForm(!showApiKeyForm)}
              className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all text-sm"
            >
              <RocketLaunchIcon className="h-4 w-4 mr-1" />
              Create API Key
            </button>
          </div>
        </div>

        {showApiKeyForm && (
          <div className="px-6 py-5 bg-yellow-50 border-b border-yellow-200">
            <form onSubmit={createApiKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Name</label>
                <input
                  type="text"
                  value={newApiKey.name}
                  onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="e.g., Trading Bot, Mobile App"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Generate Key
                </button>
                <button
                  type="button"
                  onClick={() => setShowApiKeyForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="px-6 py-5">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first API key.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="text-xs text-gray-500">Created: {new Date(key.created_at).toLocaleDateString()}</p>
                    <p className="text-xs font-mono text-gray-600">{key.key}</p>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-gray-600">Manage your profile, preferences, and security settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'trading' && renderTradingTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'api' && renderApiKeysTab()}
        </div>
      </div>
    </div>
  )
}