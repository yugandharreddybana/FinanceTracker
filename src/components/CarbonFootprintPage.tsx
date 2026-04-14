import React from 'react';
import { motion } from 'motion/react';
import { Leaf, Car, TrendingDown, Info, MapPin, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

export const CarbonFootprintPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Carbon Footprint</h1>
          <p className="text-white/40">Environmental impact analysis of your spending</p>
        </div>
      </div>

      <div className="glass-card p-10 mb-12 relative overflow-hidden bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
          <div className="space-y-4">
            <p className="text-green-500/50 text-sm font-medium tracking-wider uppercase">Monthly Impact</p>
            <h2 className="text-7xl font-bold font-mono tracking-tighter text-green-400">
              142<span className="text-green-500/30 text-4xl ml-2">kg CO₂e</span>
            </h2>
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full w-fit text-sm font-bold">
              <TrendingDown className="w-4 h-4" />
              <span>-12% vs last month</span>
            </div>
          </div>

          <div className="flex-1 max-w-md p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 shrink-0">
              <Car className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-white/60 leading-relaxed">
                That's equivalent to driving <span className="text-white font-bold">580 km</span> in a standard petrol car.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 mb-12">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-bold">Intensity Breakdown</h3>
          <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase font-mono">
            <Info className="w-3 h-3" />
            <span>Based on merchant MCC codes</span>
          </div>
        </div>
        
        <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden flex mb-8">
          {[
            { label: 'Transport', value: 45, color: '#F43F5E' },
            { label: 'Food', value: 30, color: '#F59E0B' },
            { label: 'Shopping', value: 15, color: '#22D3A5' },
            { label: 'Utilities', value: 10, color: '#10B981' },
          ].map(c => (
            <div 
              key={c.label}
              style={{ width: `${c.value}%`, backgroundColor: c.color }}
              className="h-full"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {[
            { label: 'Transport', spent: 340, carbon: 64, color: '#F43F5E' },
            { label: 'Food', spent: 450, carbon: 42, color: '#F59E0B' },
            { label: 'Shopping', spent: 120, carbon: 21, color: '#22D3A5' },
            { label: 'Utilities', spent: 80, carbon: 15, color: '#10B981' },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="text-sm font-medium">{row.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold">${row.spent}</span>
                <span className="text-[10px] text-white/30 ml-2 font-mono">≈ {row.carbon}kg CO₂e</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8 h-full">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-white/40" />
            Impact Map
          </h3>
          <div className="aspect-video rounded-xl bg-white/2 border border-white/5 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/map/800/400')] bg-cover grayscale" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-negative violet-glow animate-ping mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">High Intensity Area</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 h-full">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-green-400">
            <Leaf className="w-5 h-5" />
            Green Alternatives
          </h3>
          <div className="space-y-4">
            {[
              { title: "Switch to Octopus Energy", text: "Saves ~15kg CO₂/month", merchant: "Utilities" },
              { title: "Use Public Transport", text: "Saves ~24kg CO₂/month", merchant: "Commute" },
            ].map((alt, i) => (
              <div key={i} className="p-4 rounded-xl bg-green-400/5 border border-green-400/10 flex justify-between items-center group cursor-pointer hover:bg-green-400/10 transition-all">
                <div>
                  <h4 className="font-bold text-sm text-green-400">{alt.title}</h4>
                  <p className="text-xs text-white/40">{alt.text}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-green-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
