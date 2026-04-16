import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Palette, 
  Database, 
  CreditCard, 
  Smartphone,
  ChevronRight,
  Save,
  LogOut,
  Trash2,
  Lock,
  Mail,
  UserCircle,
  Moon,
  Sun,
  Languages,
  DollarSign,
  Eye,
  EyeOff,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, icon: Icon, children }) => (
  <div className="glass-card overflow-hidden border-white/5 mb-8">
    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <div>
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <p className="text-sm text-white/40 font-medium">{description}</p>
      </div>
    </div>
    <div className="p-8">
      {children}
    </div>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { userProfile, updateUserProfile } = useFinance();
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile.name,
    email: userProfile.email,
    theme: userProfile.preferences.theme,
    currency: userProfile.preferences.currency,
    language: userProfile.preferences.language,
    notifications: userProfile.preferences.notifications
  });

  const handleSave = () => {
    setIsSaving(true);
    updateUserProfile({
      name: formData.name,
      email: formData.email,
      preferences: {
        theme: formData.theme,
        currency: formData.currency,
        language: formData.language,
        notifications: formData.notifications
      }
    });
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-3 font-display">Settings</h1>
          <p className="text-white/40 font-medium">Manage your account preferences and security settings</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all shadow-lg violet-glow disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Sidebar (Internal) */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'profile', label: 'Profile Information', icon: User },
            { id: 'preferences', label: 'App Preferences', icon: Palette },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'security', label: 'Security & Privacy', icon: Shield },
            { id: 'billing', label: 'Billing & Subscription', icon: CreditCard },
            { id: 'data', label: 'Data Management', icon: Database },
          ].map((item) => (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                item.id === 'profile' ? "bg-accent/10 text-accent border border-accent/20" : "hover:bg-white/5 text-white/40 hover:text-white"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className="w-5 h-5" />
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform",
                item.id === 'profile' ? "translate-x-0" : "group-hover:translate-x-1"
              )} />
            </button>
          ))}
          
          <div className="pt-8">
            <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-negative hover:bg-negative/5 transition-all font-bold text-sm">
              <LogOut className="w-5 h-5" />
              <span>Logout Session</span>
            </button>
            <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-negative/40 hover:text-negative hover:bg-negative/5 transition-all font-bold text-sm mt-2">
              <Trash2 className="w-5 h-5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <SettingsSection 
            title="Profile Information" 
            description="Update your personal details and public profile"
            icon={UserCircle}
          >
            <div className="flex items-center gap-8 mb-8">
              <div className="relative group">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent to-positive p-[1px] shadow-2xl">
                  <div className="w-full h-full rounded-[23px] bg-[#0F0F19] flex items-center justify-center text-2xl font-bold">
                    {formData.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center shadow-lg border-2 border-[#0F0F19] hover:scale-110 transition-transform">
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h4 className="text-lg font-bold">{formData.name}</h4>
                <p className="text-sm text-white/40 mb-3">{formData.email}</p>
                <button className="text-xs font-bold text-accent uppercase tracking-widest hover:underline">Change Avatar</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-accent transition-all font-medium"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-accent transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection 
            title="App Preferences" 
            description="Customize the look and feel of your dashboard"
            icon={Palette}
          >
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1">Visual Theme</h4>
                  <p className="text-xs text-white/40">Switch between light, dark and glassmorphism</p>
                </div>
                <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10">
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, theme: 'dark' }))}
                    className={cn("p-2 rounded-xl transition-all", formData.theme === 'dark' ? "bg-accent text-white shadow-lg" : "text-white/40 hover:text-white")}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, theme: 'light' }))}
                    className={cn("p-2 rounded-xl transition-all", formData.theme === 'light' ? "bg-accent text-white shadow-lg" : "text-white/40 hover:text-white")}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, theme: 'glass' }))}
                    className={cn("p-2 rounded-xl transition-all", formData.theme === 'glass' ? "bg-accent text-white shadow-lg" : "text-white/40 hover:text-white")}
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1">Default Currency</h4>
                  <p className="text-xs text-white/40">Set your primary currency for all analytics</p>
                </div>
                <div className="relative">
                  <select 
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm font-bold outline-none focus:border-accent"
                  >
                    <option className="bg-background">USD ($)</option>
                    <option className="bg-background">EUR (€)</option>
                    <option className="bg-background">GBP (£)</option>
                    <option className="bg-background">INR (₹)</option>
                  </select>
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1">Language</h4>
                  <p className="text-xs text-white/40">Select your preferred display language</p>
                </div>
                <div className="relative">
                  <select 
                    value={formData.language}
                    onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm font-bold outline-none focus:border-accent"
                  >
                    <option className="bg-background">English (US)</option>
                    <option className="bg-background">Spanish</option>
                    <option className="bg-background">French</option>
                    <option className="bg-background">German</option>
                  </select>
                  <Languages className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection 
            title="Security & Privacy" 
            description="Manage your password and security preferences"
            icon={Shield}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 outline-none focus:border-accent transition-all font-mono"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Two-Factor Authentication</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Highly Recommended</p>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/80 transition-all">Enable</button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection 
            title="Data Management" 
            description="Control your data and export your history"
            icon={Database}
          >
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                <Download className="w-8 h-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">Export Data</span>
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1">CSV, JSON, PDF</span>
              </button>
              <button className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                <Upload className="w-8 h-8 text-positive mb-4 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">Import History</span>
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1">Bank Statements</span>
              </button>
            </div>
          </SettingsSection>
        </div>
      </div>
    </motion.div>
  );
};
