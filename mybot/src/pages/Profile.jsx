import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../utils/database.queries'
import toast from 'react-hot-toast'
import { UserCircleIcon } from '@heroicons/react/24/outline'

export default function Profile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    broker: ''
  })
  const [settings, setSettings] = useState({
    default_lot_size: 0.01,
    default_num_trades: 1,
    default_time_to_place: 60,
    risk_percentage: 2.0,
    notification_email: true
  })

  useEffect(() => {
    loadProfile()
    loadSettings()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await db.getUserProfile(user.id)
      if (data) {
        setProfile(data)
      }
    } catch (error) {
      toast.error('Failed to load profile')
    }
  }

  const loadSettings = async () => {
    try {
      const data = await db.getUserSettings(user.id)
      if (data) {
        setSettings(data)
      }
    } catch (error) {
      toast.error('Failed to load settings')
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
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await db.updateUserProfile(user.id, profile)
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
      await db.updateUserSettings(user.id, settings)
      toast.success('Settings updated successfully')
    } catch (error) {
      toast.error('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Profile Settings</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <UserCircleIcon className="h-12 w-12 text-gray-400" />
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-500">Update your personal details</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  id="full_name"
                  value={profile.full_name || ''}
                  onChange={handleProfileChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    id="first_name"
                    value={profile.first_name || ''}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    id="last_name"
                    value={profile.last_name || ''}
                    onChange={handleProfileChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="broker" className="block text-sm font-medium text-gray-700">
                  Broker
                </label>
                <input
                  type="text"
                  name="broker"
                  id="broker"
                  value={profile.broker || ''}
                  onChange={handleProfileChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Trading Settings */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900">Trading Preferences</h2>
            <p className="mt-1 text-sm text-gray-500">Set your default trading parameters</p>

            <form onSubmit={handleSettingsSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="default_lot_size" className="block text-sm font-medium text-gray-700">
                  Default Lot Size
                </label>
                <input
                  type="number"
                  name="default_lot_size"
                  id="default_lot_size"
                  min="0.01"
                  step="0.01"
                  value={settings.default_lot_size}
                  onChange={handleSettingsChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="default_num_trades" className="block text-sm font-medium text-gray-700">
                  Default Number of Trades
                </label>
                <input
                  type="number"
                  name="default_num_trades"
                  id="default_num_trades"
                  min="1"
                  max="10"
                  value={settings.default_num_trades}
                  onChange={handleSettingsChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="default_time_to_place" className="block text-sm font-medium text-gray-700">
                  Default Time to Place (seconds)
                </label>
                <input
                  type="number"
                  name="default_time_to_place"
                  id="default_time_to_place"
                  min="1"
                  value={settings.default_time_to_place}
                  onChange={handleSettingsChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="risk_percentage" className="block text-sm font-medium text-gray-700">
                  Risk Percentage (%)
                </label>
                <input
                  type="number"
                  name="risk_percentage"
                  id="risk_percentage"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={settings.risk_percentage}
                  onChange={handleSettingsChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>

              <div className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="notification_email"
                    name="notification_email"
                    type="checkbox"
                    checked={settings.notification_email}
                    onChange={handleSettingsChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notification_email" className="font-medium text-gray-700">
                    Email Notifications
                  </label>
                  <p className="text-gray-500">Receive email updates about your trades</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}