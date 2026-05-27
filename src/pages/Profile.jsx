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
  GlobeAltIcon,
  LanguageIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  TrashIcon,
  CheckCircleIcon as CheckCircleIconOutline,
  LockClosedIcon,
  ShieldExclamationIcon,
  ChevronRightIcon
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
    { id: 'trading', label: 'Trading preferences', icon: ChartBarIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security & Access', icon: ShieldCheckIcon },
    { id: 'api', label: 'API Credentials', icon: KeyIcon }
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
      toast.error('Failed to load profile details')
    }
  }

  const loadSettings = async () => {
    try {
      const data = await db.getUserSettings(userId)
      if (data) {
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      toast.error('Failed to load trading preferences')
    }
  }

  const loadSecurity = async () => {
    try {
      const data = await db.getUserSecurity(userId)
      if (data) {
        setSecurity(data)
      }
    } catch (error) {
      console.error('Failed to load security configurations:', error)
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
      toast.success('Personal profile details updated successfully')
    } catch (error) {
      toast.error('Failed to save profile settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await db.updateUserSettings(userId, settings)
      toast.success('Trading parameters saved successfully')
    } catch (error) {
      toast.error('Failed to save trading settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSecuritySubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await db.updateUserSecurity(userId, security)
      toast.success('Security configurations updated')
    } catch (error) {
      toast.error('Failed to update security preferences')
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
      toast.success('API Key generated successfully')
    } catch (error) {
      toast.error('Failed to generate API Key')
    } finally {
      setLoading(false)
    }
  }

  const deleteApiKey = async (keyId) => {
    if (confirm('Are you sure you want to permanently delete this API key? This action is irreversible.')) {
      try {
        await db.deleteApiKey(userId, keyId)
        setApiKeys(apiKeys.filter(key => key.id !== keyId))
        toast.success('API key deleted successfully')
      } catch (error) {
        toast.error('Failed to delete API key')
      }
    }
  }

  // Common Header component inside tabs to avoid duplicate lookups
  const TabHeader = ({ title, subtitle, icon: Icon, iconBg = "bg-indigo-50", iconColor = "text-indigo-600" }) => (
    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/30">
      <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0 shadow-sm`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )

  // Custom Input styling container
  const FormField = ({ label, icon: Icon, children }) => (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        {label}
      </label>
      {children}
    </div>
  )

  // Custom Toggle Switch
  const CustomToggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl transition-all duration-200 hover:border-slate-200">
      <div className="pr-4">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )

  const renderProfileTab = () => (
    <form onSubmit={handleProfileSubmit} className="space-y-6 animate-fadeIn">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Profile Details Header with Avatar Preview */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-5 bg-slate-50/40">
          <div className="relative group shrink-0">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-2xl font-bold text-white font-mono">
                {profile.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <span className="text-[10px] text-white font-semibold">EDIT</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Personal Information</h3>
            <p className="text-sm text-slate-500 mt-0.5">Manage details and basic settings of your user account</p>
          </div>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="First Name" icon={UserIcon}>
              <input
                type="text"
                name="first_name"
                value={profile.first_name || ''}
                onChange={handleProfileChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
                placeholder="John"
              />
            </FormField>

            <FormField label="Last Name" icon={UserIcon}>
              <input
                type="text"
                name="last_name"
                value={profile.last_name || ''}
                onChange={handleProfileChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
                placeholder="Doe"
              />
            </FormField>
          </div>

          <FormField label="Full Name" icon={UserCircleIcon}>
            <input
              type="text"
              name="full_name"
              value={profile.full_name || ''}
              onChange={handleProfileChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
              placeholder="John Doe"
            />
          </FormField>

          <FormField label="Email Address" icon={EnvelopeIcon}>
            <div className="relative">
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100/60 cursor-not-allowed px-4 py-3 text-sm text-slate-500 shadow-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-200/80 text-[10px] text-slate-600 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                PRIMARY
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Email addresses are locked to your login profile. Please open a support ticket to request email updates.</p>
          </FormField>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Phone Number" icon={PhoneIcon}>
              <input
                type="tel"
                name="phone"
                value={profile.phone || ''}
                onChange={handleProfileChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
                placeholder="+1 (555) 019-2834"
              />
            </FormField>

            <FormField label="Broker Account Integration" icon={BuildingOfficeIcon}>
              <input
                type="text"
                name="broker"
                value={profile.broker || ''}
                onChange={handleProfileChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
                placeholder="e.g., Pepperstone MT5 Account"
              />
            </FormField>
          </div>

          <FormField label="Physical Address" icon={MapPinIcon}>
            <input
              type="text"
              name="address"
              value={profile.address || ''}
              onChange={handleProfileChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
              placeholder="120 FinTech Boulevard, Suite 50"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="City">
              <input
                type="text"
                name="city"
                value={profile.city || ''}
                onChange={handleProfileChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
                placeholder="New York"
              />
            </FormField>

            <FormField label="Country">
              <select
                name="country"
                value={profile.country || ''}
                onChange={handleProfileChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none appearance-none"
              >
                <option value="">Select country</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="SG">Singapore</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Interface Language" icon={LanguageIcon}>
              <select
                name="language"
                value={profile.language}
                onChange={handleProfileChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none appearance-none"
              >
                <option value="en">English (US)</option>
                <option value="es">Español (ES)</option>
                <option value="fr">Français (FR)</option>
                <option value="de">Deutsch (DE)</option>
                <option value="zh">中文 (ZH)</option>
              </select>
            </FormField>

            <FormField label="Uptime Timezone" icon={GlobeAltIcon}>
              <select
                name="timezone"
                value={profile.timezone}
                onChange={handleProfileChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none appearance-none"
              >
                <option value="UTC">UTC / GMT</option>
                <option value="EST">Eastern Time (EST)</option>
                <option value="CST">Central Time (CST)</option>
                <option value="MST">Mountain Time (MST)</option>
                <option value="PST">Pacific Time (PST)</option>
                <option value="CET">Central European Time (CET)</option>
                <option value="JST">Japan Standard Time (JST)</option>
                <option value="AEST">Australian Eastern Time (AEST)</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-semibold hover:from-indigo-500 hover:to-indigo-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-[0_4px_15px_rgba(99,102,241,0.2)]"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4.5 w-4.5 mr-2 animate-spin" />
                Saving details...
              </>
            ) : (
              <>
                <CheckBadgeIcon className="h-4.5 w-4.5 mr-2" />
                Save profile modifications
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )

  const renderTradingTab = () => (
    <form onSubmit={handleSettingsSubmit} className="space-y-6 animate-fadeIn">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        
        <TabHeader 
          title="Trading Parameters" 
          subtitle="Configure default trade properties, caps, and automated risk restrictions"
          icon={ChartBarIcon}
        />

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Default Lot Size" icon={CurrencyDollarIcon}>
              <input
                type="number"
                name="default_lot_size"
                min="0.01"
                step="0.01"
                value={settings.default_lot_size}
                onChange={handleSettingsChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Starting entry volume for automated orders. 0.01 standard lots represents 1,000 units (Micro lot).</p>
            </FormField>

            <FormField label="Maximum Allowed Position Size">
              <input
                type="number"
                name="max_position_size"
                min="0.01"
                step="0.01"
                value={settings.max_position_size}
                onChange={handleSettingsChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Hard cap limiting maximum aggregated lots open at once on any single trading pair.</p>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Default Trades Per Signal">
              <input
                type="number"
                name="default_num_trades"
                min="1"
                max="10"
                value={settings.default_num_trades}
                onChange={handleSettingsChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
              />
            </FormField>

            <FormField label="Max Daily Trades Cap">
              <input
                type="number"
                name="max_daily_trades"
                min="1"
                max="100"
                value={settings.max_daily_trades}
                onChange={handleSettingsChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Default Order Expiry Limit (Seconds)">
              <input
                type="number"
                name="default_time_to_place"
                min="1"
                value={settings.default_time_to_place}
                onChange={handleSettingsChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
              />
            </FormField>

            <FormField label="Max Daily Loss Limit ($)" icon={LockClosedIcon}>
              <input
                type="number"
                name="max_daily_loss"
                min="0"
                step="10"
                value={settings.max_daily_loss}
                onChange={handleSettingsChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Stops bot routines immediately when session floating/realized loss hits threshold.</p>
            </FormField>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <FormField label="Risk Percentage Exposure per Order" icon={ShieldCheckIcon}>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mt-2">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Dynamic Risk Level</span>
                  <span className="text-base font-extrabold text-indigo-600 font-mono">{settings.risk_percentage}%</span>
                </div>
                <input
                  type="range"
                  name="risk_percentage"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={settings.risk_percentage}
                  onChange={handleSettingsChange}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase mt-3">
                  <span>Conservative (0.1% - 1%)</span>
                  <span>Moderate (2%)</span>
                  <span>Aggressive (5%+)</span>
                </div>
              </div>
            </FormField>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-4">
            <CustomToggle
              label="Auto-confirm Trade Signals"
              description="Instantly route trading alerts to live broker gateway without requiring manual user web pop-ups."
              checked={settings.auto_confirm_trades}
              onChange={() => setSettings(prev => ({ ...prev, auto_confirm_trades: !prev.auto_confirm_trades }))}
            />

            <CustomToggle
              label="Require Execution Confirmations"
              description="Sends explicit interactive notifications confirming trades before final submission to MT4/MT5 gateways."
              checked={settings.require_confirmation}
              onChange={() => setSettings(prev => ({ ...prev, require_confirmation: !prev.require_confirmation }))}
            />
          </div>
        </div>

        <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-semibold hover:from-indigo-500 hover:to-indigo-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-[0_4px_15px_rgba(99,102,241,0.2)]"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4.5 w-4.5 mr-2 animate-spin" />
                Saving configurations...
              </>
            ) : (
              <>
                <CheckBadgeIcon className="h-4.5 w-4.5 mr-2" />
                Save Trading configurations
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )

  const renderNotificationsTab = () => (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden animate-fadeIn">
      
      <TabHeader
        title="Notification Delivery Settings"
        subtitle="Manage alerts for bot order executions, safety shutdowns, and status updates"
        icon={BellIcon}
      />

      <div className="p-8 space-y-4">
        <CustomToggle
          label="Email Reports"
          description="Daily diagnostic logs, P&L reports, and security notification updates."
          checked={settings.notification_email}
          onChange={() => setSettings(prev => ({ ...prev, notification_email: !prev.notification_email }))}
        />

        <CustomToggle
          label="Web Push Notifications"
          description="In-browser execution sounds, order triggers, and risk alarm responses."
          checked={settings.notification_push}
          onChange={() => setSettings(prev => ({ ...prev, notification_push: !prev.notification_push }))}
        />

        <CustomToggle
          label="SMS Text Alerts"
          description="Critical warnings sent to your mobile phone if your account hits daily loss targets or broker connection drops."
          checked={settings.notification_sms}
          onChange={() => setSettings(prev => ({ ...prev, notification_sms: !prev.notification_sms }))}
        />
      </div>

      <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleSettingsSubmit}
          disabled={loading}
          className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-semibold hover:from-indigo-500 hover:to-indigo-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-[0_4px_15px_rgba(99,102,241,0.2)]"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="h-4.5 w-4.5 mr-2 animate-spin" />
              Saving parameters...
            </>
          ) : (
            <>
              <CheckBadgeIcon className="h-4.5 w-4.5 mr-2" />
              Save Notification Preferences
            </>
          )}
        </button>
      </div>
    </div>
  )

  const renderSecurityTab = () => (
    <form onSubmit={handleSecuritySubmit} className="space-y-6 animate-fadeIn">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        
        <TabHeader
          title="Security and Access Logs"
          subtitle="Enforce credential protection, session configurations, and view login histories"
          icon={ShieldCheckIcon}
        />

        <div className="p-8 space-y-6">
          
          {/* 2FA Banner and Switch */}
          <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
            security.two_factor_enabled 
              ? 'bg-emerald-50/50 border-emerald-200' 
              : 'bg-amber-50/50 border-amber-200'
          }`}>
            <div className="flex gap-4 items-start">
              <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                security.two_factor_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {security.two_factor_enabled ? (
                  <CheckCircleIconOutline className="h-6 w-6" />
                ) : (
                  <ShieldExclamationIcon className="h-6 w-6" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Two-Factor Authentication (2FA) is {security.two_factor_enabled ? 'Active' : 'Disabled'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                  Require a generated token verification code upon entering credentials to protect your automated API and capital limits.
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setSecurity(prev => ({ ...prev, two_factor_enabled: !prev.two_factor_enabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                security.two_factor_enabled ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  security.two_factor_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Session Timeout selection */}
          <FormField label="Session Idle Timeout Limit" icon={DevicePhoneMobileIcon}>
            <select
              name="session_timeout"
              value={security.session_timeout}
              onChange={handleSecurityChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none appearance-none"
            >
              <option value="15">15 minutes inactivity</option>
              <option value="30">30 minutes inactivity</option>
              <option value="60">1 hour inactivity</option>
              <option value="120">2 hours inactivity</option>
              <option value="480">8 hours inactivity</option>
              <option value="1440">24 hours inactivity</option>
            </select>
          </FormField>

          {/* Password Action Trigger */}
          <div className="pt-4 border-t border-slate-100">
            <FormField label="System Password">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-1">
                <div>
                  <span className="text-xs font-bold text-slate-800">Change password credentials</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Keep passwords unique to avoid unauthorized execution exposure.</p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                  onClick={() => toast.success('Password update link dispatched to your email address.')}
                >
                  Request Password Reset
                </button>
              </div>
            </FormField>
          </div>

          {/* Security Log Activity */}
          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Recent Security Activity</h4>
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <tbody className="bg-white divide-y divide-slate-50">
                  <tr>
                    <td className="px-4 py-3 text-slate-500">Last successful entry authentication</td>
                    <td className="px-4 py-3 text-slate-800 text-right font-medium">Today, 10:30 AM</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-500">Security preferences modified</td>
                    <td className="px-4 py-3 text-slate-800 text-right font-medium">3 days ago</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-500">Concurrent active session devices</td>
                    <td className="px-4 py-3 text-slate-800 text-right font-medium">1 Active Session</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-semibold hover:from-indigo-500 hover:to-indigo-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-[0_4px_15px_rgba(99,102,241,0.2)]"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4.5 w-4.5 mr-2 animate-spin" />
                Updating protocols...
              </>
            ) : (
              <>
                <CheckBadgeIcon className="h-4.5 w-4.5 mr-2" />
                Save Security Settings
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )

  const renderApiKeysTab = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 shadow-sm">
              <KeyIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">API Credentials</h3>
              <p className="text-sm text-slate-500 mt-0.5">Manage token codes for executing programmatic orders</p>
            </div>
          </div>
          <button
            onClick={() => setShowApiKeyForm(!showApiKeyForm)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <RocketLaunchIcon className="h-4 w-4 mr-1.5" />
            Generate Credential
          </button>
        </div>

        {/* Generate key block warnings */}
        {showApiKeyForm && (
          <div className="p-8 bg-amber-50/40 border-b border-slate-100">
            <form onSubmit={createApiKey} className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Key Description Name</label>
                <input
                  type="text"
                  value={newApiKey.name}
                  onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Python Execution Script"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors"
                >
                  Generate Token
                </button>
                <button
                  type="button"
                  onClick={() => setShowApiKeyForm(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-8">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <KeyIcon className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-semibold text-slate-800">No Credential Tokens Active</h3>
              <p className="mt-1.5 text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Connect external algorithms or spreadsheets by generating a secure API token.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                  <div className="space-y-1 pr-4">
                    <p className="text-sm font-bold text-slate-800">{key.name}</p>
                    <p className="text-[10px] text-slate-400">Issued: {new Date(key.created_at).toLocaleDateString()} at {new Date(key.created_at).toLocaleTimeString()}</p>
                    <div className="pt-2">
                      <span className="font-mono text-xs bg-slate-200/60 text-slate-600 px-3 py-1 rounded-lg select-all border border-slate-300/40">
                        {key.key}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete API key"
                  >
                    <TrashIcon className="h-5 w-5" />
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
    <div className="min-h-screen bg-slate-50/40 text-slate-700 selection:bg-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Account Preferences</h1>
            <p className="mt-1.5 text-sm text-slate-500">Configure parameters, manage notifications, and lock access credentials.</p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-xl text-indigo-700 font-mono text-xs w-fit">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            SYNC STATUS: ACTIVE
          </div>
        </div>

        {/* Tab Navigation (Animated Capsule Pills) */}
        <div className="mb-10 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm flex overflow-x-auto scrollbar-hide gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shrink-0 select-none
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/15'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }
                `}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content Box */}
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