# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.





# ai_quant_bot.py
import os
import time
import asyncio
import uuid
import base64
from datetime import datetime, timezone, timedelta
from pathlib import Path
from supabase import create_client, Client 
from dotenv import load_dotenv
import MetaTrader5 as mt5
from loguru import logger
import sys
import json
import math
from typing import Optional, Dict, List, Any, Tuple
from playwright.async_api import async_playwright
import openai
from tenacity import retry, stop_after_attempt, wait_exponential
import requests
from dataclasses import dataclass, field
import numpy as np

from hft_profit_maximizer import IntegratedHFTBot

# ========== LOAD ENV ==========
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
USER_ID = os.getenv("USER_ID")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize Supabase with service role key
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Test connection
try:
    test_query = supabase.table("bots").select("count", count="exact").execute()
    logger.success("Supabase connection successful")
except Exception as e:
    logger.error(f"Supabase connection failed: {e}")
    sys.exit(1)

openai.api_key = OPENAI_API_KEY

# ========== CONFIGURATION ==========
SYMBOL_DEFAULT = "XAUUSD.m"
DEFAULT_POINTS = 10
RETRY_ATTEMPTS = 3
RETRY_DELAY = 2
CHECK_INTERVAL = 10  # seconds
CHART_BASE_URL = os.getenv("CHART_BASE_URL", "http://localhost:5173/chart")
SCREENSHOT_DIR = Path("./screenshots")
SCREENSHOT_DIR.mkdir(exist_ok=True)

# Analysis strategies
class AnalysisStrategy:
    SCALPING = ['5', '1']        
    INTRADAY = ['60', '15', '5']       
    SWING = ['D', '240', '60']         
    COMPLETE = ['1', '5', '15', '60', '240', 'D']  
    DEFAULT = ['D', '60', '15']         

# Timeframe weights for consolidation
TIMEFRAME_WEIGHTS = {
    '1': 0.2, '5': 0.3, '15': 0.5, '30': 0.6,
    '60': 0.8, '240': 1.0, 'D': 1.2, 'W': 1.5, 'M': 1.8
}

# Setup logging
logger.remove()
logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>")
logger.add("logs/ai_quant_{time:YYYY-MM-DD}.log", rotation="1 day")

# ============================================================================
# PROFIT MAXIMIZER - NEW POSITION MANAGEMENT SYSTEM
# ============================================================================

@dataclass
class PositionTier:
    """Individual tier within a managed position"""
    ticket: int
    portion: float  # 0.0 to 1.0 (e.g., 0.3 for 30%)
    objective: str  # "scalp", "swing", "runner"
    volume: float
    entry_price: float
    status: str = "active"  # active, closed, trail_only
    peak_price: float = 0.0
    trail_activated: bool = False
    breakeven_hit: bool = False
    profit_locked_at: List[float] = field(default_factory=list)


@dataclass
class ManagedPosition:
    """Complete position with tier management"""
    symbol: str
    side: str  # BUY / SELL
    total_volume: float
    entry_price: float
    entry_time: datetime
    initial_sl: float
    strategy: str  # scalper, intraday, swing
    tiers: Dict[str, PositionTier] = field(default_factory=dict)
    current_stage: str = "initial"  # initial, protecting, running, closing
    highest_profit_r: float = 0.0
    lowest_profit_r: float = 0.0


class MarketPhaseDetector:
    """Detect current market phase for adaptive management"""
    
    def __init__(self):
        pass
    
    def detect_phase(self, symbol: str, timeframe: str = "5") -> Tuple[str, dict]:
        """Detect current market phase with metrics"""
        rates = self._get_recent_rates(symbol, timeframe, 50)
        if rates is None or len(rates) < 30:
            return "unknown", {}
        
        # Calculate metrics
        atr = self._calculate_atr(rates, 14)
        atr_prev = self._calculate_atr(rates[:-14], 14) if len(rates) > 28 else atr
        atr_expanding = atr > atr_prev * 1.1
        
        momentum = self._calculate_momentum(rates)
        structure = self._detect_structure(rates)
        
        # Determine phase
        if atr_expanding and momentum > 0.6 and structure == "impulsive":
            phase = "trending_strong"
        elif atr_expanding and momentum > 0.5 and structure == "breakout":
            phase = "volatile_breakout"
        elif not atr_expanding and momentum > 0.4:
            phase = "trending_weak"
        elif not atr_expanding and momentum < 0.3 and structure == "sideways":
            phase = "ranging"
        else:
            phase = "ranging"
        
        metrics = {
            "atr_current": atr,
            "atr_previous": atr_prev,
            "atr_expanding": atr_expanding,
            "momentum_strength": momentum,
            "structure_type": structure,
            "phase": phase
        }
        
        return phase, metrics
    
    def _get_recent_rates(self, symbol: str, timeframe: str, count: int):
        """Get recent price data"""
        tf_map = {"1": mt5.TIMEFRAME_M1, "5": mt5.TIMEFRAME_M5, 
                  "15": mt5.TIMEFRAME_M15, "60": mt5.TIMEFRAME_H1,
                  "240": mt5.TIMEFRAME_H4, "D": mt5.TIMEFRAME_D1}
        try:
            return mt5.copy_rates_from_pos(symbol, tf_map.get(timeframe, mt5.TIMEFRAME_M5), 0, count)
        except:
            return None
    
    def _calculate_atr(self, rates, period: int) -> float:
        """Calculate Average True Range"""
        if len(rates) < period + 1:
            return 0.0
        
        tr_values = []
        for i in range(1, min(len(rates), period + 1)):
            hl = abs(rates[i]["high"] - rates[i]["low"])
            hc = abs(rates[i]["high"] - rates[i-1]["close"])
            lc = abs(rates[i]["low"] - rates[i-1]["close"])
            tr_values.append(max(hl, hc, lc))
        
        return sum(tr_values) / len(tr_values) if tr_values else 0.0
    
    def _calculate_momentum(self, rates) -> float:
        """Calculate momentum strength 0-1"""
        if len(rates) < 20:
            return 0.5
        
        roc_5 = abs(rates[-1]["close"] - rates[-5]["close"]) / max(rates[-5]["close"], 0.00001)
        roc_10 = abs(rates[-1]["close"] - rates[-10]["close"]) / max(rates[-10]["close"], 0.00001)
        
        strength = min(1.0, (roc_5 * 50 + roc_10 * 25))
        return round(strength, 2)
    
    def _detect_structure(self, rates) -> str:
        """Detect market structure type"""
        if len(rates) < 20:
            return "unknown"
        
        highs = [r["high"] for r in rates[-20:]]
        lows = [r["low"] for r in rates[-20:]]
        
        higher_highs = sum(1 for i in range(5, len(highs)) if highs[i] > highs[i-5])
        higher_lows = sum(1 for i in range(5, len(lows)) if lows[i] > lows[i-5])
        
        lower_highs = sum(1 for i in range(5, len(highs)) if highs[i] < highs[i-5])
        lower_lows = sum(1 for i in range(5, len(lows)) if lows[i] < lows[i-5])
        
        total_periods = max(len(highs) - 5, 1)
        
        impulse_ratio = max(higher_highs + higher_lows, lower_highs + lower_lows) / total_periods
        
        if impulse_ratio > 0.6:
            return "impulsive"
        elif impulse_ratio > 0.4:
            return "breakout"
        else:
            return "sideways"


class ProfitMaximizer:
    """
    Advanced position management with:
    - Three-tier position splitting (scalp/swing/runner)
    - Market phase adaptive trailing
    - Profit protection escalator
    - Time-based exit rules
    - Momentum-based adjustments
    """
    
    def __init__(self):
        self.managed_positions: Dict[int, ManagedPosition] = {}
        self.phase_detector = MarketPhaseDetector()
        
        self.strategy_config = {
            "scalper": {
                "tiers": {
                    "scalp": {"portion": 0.40, "tp_r": 0.8, "trail_start_r": 0.4},
                    "swing": {"portion": 0.40, "tp_r": 1.5, "trail_start_r": 0.6},
                    "runner": {"portion": 0.20, "tp_r": None, "trail_start_r": 1.0}
                },
                "time_limits": {"max_hold_min": 45, "breakeven_at_min": 5, "warning_at_min": 30},
                "protection_escalator": [
                    {"r_level": 0.5, "action": "move_sl_to", "value": "breakeven"},
                    {"r_level": 1.0, "action": "lock_profit", "value": 0.3},
                    {"r_level": 1.5, "action": "lock_profit", "value": 0.7},
                    {"r_level": 2.0, "action": "close_percent", "value": 0.5},
                    {"r_level": 3.0, "action": "trail_aggressive", "value": None}
                ]
            },
            "intraday": {
                "tiers": {
                    "scalp": {"portion": 0.30, "tp_r": 1.0, "trail_start_r": 0.5},
                    "swing": {"portion": 0.40, "tp_r": 2.0, "trail_start_r": 1.0},
                    "runner": {"portion": 0.30, "tp_r": None, "trail_start_r": 1.5}
                },
                "time_limits": {"max_hold_min": 480, "breakeven_at_min": 15, "warning_at_min": 240},
                "protection_escalator": [
                    {"r_level": 0.5, "action": "move_sl_to", "value": "breakeven"},
                    {"r_level": 1.0, "action": "lock_profit", "value": 0.3},
                    {"r_level": 2.0, "action": "lock_profit", "value": 0.8},
                    {"r_level": 3.0, "action": "close_percent", "value": 0.5},
                    {"r_level": 5.0, "action": "trail_aggressive", "value": None}
                ]
            },
            "swing": {
                "tiers": {
                    "scalp": {"portion": 0.20, "tp_r": 1.5, "trail_start_r": 0.8},
                    "swing": {"portion": 0.40, "tp_r": 3.0, "trail_start_r": 1.5},
                    "runner": {"portion": 0.40, "tp_r": None, "trail_start_r": 2.0}
                },
                "time_limits": {"max_hold_min": 4320, "breakeven_at_min": 30, "warning_at_min": 1440},
                "protection_escalator": [
                    {"r_level": 0.5, "action": "move_sl_to", "value": "breakeven"},
                    {"r_level": 1.5, "action": "lock_profit", "value": 0.5},
                    {"r_level": 3.0, "action": "lock_profit", "value": 1.0},
                    {"r_level": 5.0, "action": "close_percent", "value": 0.4},
                    {"r_level": 8.0, "action": "trail_aggressive", "value": None}
                ]
            }
        }
        
        self.trail_methods = {
            "trending_strong": "swing_points",
            "trending_weak": "moving_average",
            "ranging": "supertrend",
            "volatile_breakout": "atr_multiple",
            "pre_news": "fixed_breakeven"
        }

    # ========== POSITION INITIALIZATION ==========
    
    def register_position(self, position, strategy: str, max_risk_r: float = 3.0) -> bool:
        """Register a new position for advanced management"""
        try:
            ticket = position.ticket
            side = "BUY" if position.type == mt5.ORDER_TYPE_BUY else "SELL"
            config = self.strategy_config.get(strategy, self.strategy_config["scalper"])
            
            managed = ManagedPosition(
                symbol=position.symbol,
                side=side,
                total_volume=position.volume,
                entry_price=position.price_open,
                entry_time=datetime.now(),
                initial_sl=position.sl if position.sl else position.price_open,
                strategy=strategy
            )
            
            # Create tiers
            for tier_name, tier_config in config["tiers"].items():
                portion = tier_config["portion"]
                managed.tiers[tier_name] = PositionTier(
                    ticket=ticket,
                    portion=portion,
                    objective=tier_name,
                    volume=position.volume * portion,
                    entry_price=position.price_open,
                    peak_price=position.price_open
                )
            
            self.managed_positions[ticket] = managed
            logger.info(f"📊 Position {ticket} registered for {strategy} management "
                       f"({len(managed.tiers)} tiers)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register position: {e}")
            return False
    
    def unregister_position(self, ticket: int):
        """Remove position from management"""
        if ticket in self.managed_positions:
            del self.managed_positions[ticket]
            logger.info(f"🗑️ Position {ticket} unregistered from management")
    
    # ========== MAIN MANAGEMENT LOGIC ==========
    
    def manage_position(self, position, current_price: float) -> dict:
        """Main management function - returns actions to take"""
        ticket = position.ticket
        
        if ticket not in self.managed_positions:
            return {"action": "track_only", "reason": "not_managed",
                    "close_partial": [], "update_sl": None, "update_tp": None,
                    "close_all": False, "reasoning": []}
        
        managed = self.managed_positions[ticket]
        actions = {
            "close_partial": [],
            "update_sl": None,
            "update_tp": None,
            "close_all": False,
            "reasoning": []
        }
        
        # Calculate risk
        risk = self._calculate_risk(managed)
        if risk <= 0:
            actions["reasoning"].append("Invalid risk calculation")
            return actions
        
        current_r = self._calculate_r_multiple(managed, current_price, risk)
        
        # Update peaks
        managed.highest_profit_r = max(managed.highest_profit_r, current_r)
        managed.lowest_profit_r = min(managed.lowest_profit_r, current_r)
        
        # Update tier peak prices
        for tier in managed.tiers.values():
            if tier.status != "active":
                continue
            if managed.side == "BUY":
                tier.peak_price = max(tier.peak_price, current_price)
            else:
                tier.peak_price = min(tier.peak_price, current_price)
        
        # Detect market phase
        phase, metrics = self.phase_detector.detect_phase(managed.symbol)
        
        # 1. Check time-based exits
        time_actions = self._check_time_rules(managed)
        actions = self._merge_actions(actions, time_actions)
        
        # 2. Apply profit protection escalator
        protection_actions = self._apply_protection_escalator(managed, current_r, risk)
        actions = self._merge_actions(actions, protection_actions)
        
        # 3. Manage individual tiers
        tier_actions = self._manage_tiers(managed, current_price, current_r, phase, metrics)
        actions = self._merge_actions(actions, tier_actions)
        
        # 4. Structure-based checks
        structure_actions = self._check_structure_exits(managed, current_price, phase)
        actions = self._merge_actions(actions, structure_actions)
        
        # 5. Correlation checks for runners
        if self._has_runner_tier(managed):
            correlation_exit = self._check_correlation_risks(managed)
            if correlation_exit:
                actions["close_all"] = True
                actions["reasoning"].append("Correlation risk detected")
        
        # Update stage
        managed.current_stage = self._determine_stage(managed, current_r)
        
        return actions
    
    # ========== CALCULATION HELPERS ==========
    
    def _calculate_risk(self, managed: ManagedPosition) -> float:
        """Calculate initial risk in price units"""
        if managed.initial_sl <= 0:
            return abs(managed.entry_price) * 0.005  # Fallback 0.5%
        return abs(managed.entry_price - managed.initial_sl)
    
    def _calculate_r_multiple(self, managed: ManagedPosition, current_price: float, risk: float) -> float:
        """Calculate current profit/loss in R multiples"""
        if managed.side == "BUY":
            return (current_price - managed.entry_price) / risk
        else:
            return (managed.entry_price - current_price) / risk
    
    def _has_runner_tier(self, managed: ManagedPosition) -> bool:
        """Check if position has an active runner tier"""
        return any(t.objective == "runner" and t.status == "active" 
                  for t in managed.tiers.values())
    
    def _determine_stage(self, managed: ManagedPosition, current_r: float) -> str:
        """Determine current stage of the trade"""
        if current_r < 0.5:
            return "initial"
        elif current_r < 2.0:
            return "protecting"
        elif current_r < 4.0:
            return "running"
        else:
            return "closing"
    
    # ========== TIME-BASED RULES ==========
    
    def _check_time_rules(self, managed: ManagedPosition) -> dict:
        """Apply time-based exit rules"""
        config = self.strategy_config.get(managed.strategy, 
                                          self.strategy_config["scalper"])
        time_limits = config["time_limits"]
        
        actions = {"close_partial": [], "update_sl": None, "update_tp": None, 
                   "close_all": False, "reasoning": []}
        
        elapsed = (datetime.now() - managed.entry_time).total_seconds() / 60
        
        # Move to breakeven after minimum time
        if elapsed >= time_limits["breakeven_at_min"]:
            scalp_tier = managed.tiers.get("scalp")
            if scalp_tier and not scalp_tier.breakeven_hit:
                be_price = managed.entry_price
                buffer = self._calculate_risk(managed) * 0.1
                if managed.side == "BUY":
                    be_price += buffer
                else:
                    be_price -= buffer
                
                actions["update_sl"] = be_price
                scalp_tier.breakeven_hit = True
                actions["reasoning"].append(f"Time-based breakeven ({elapsed:.0f}m)")
        
        # Warning near max hold
        if elapsed >= time_limits["warning_at_min"]:
            actions["reasoning"].append(f"⚠️ Approaching max hold time ({elapsed:.0f}m)")
        
        # Force close at max hold
        if elapsed >= time_limits["max_hold_min"]:
            actions["close_all"] = True
            actions["reasoning"].append(f"Max hold time exceeded ({elapsed:.0f}m)")
        
        return actions
    
    # ========== PROFIT PROTECTION ESCALATOR ==========
    
    def _apply_protection_escalator(self, managed: ManagedPosition, current_r: float, 
                                    risk: float) -> dict:
        """Apply the profit protection escalator"""
        config = self.strategy_config.get(managed.strategy, 
                                          self.strategy_config["scalper"])
        escalator = config["protection_escalator"]
        
        actions = {"close_partial": [], "update_sl": None, "update_tp": None, 
                   "close_all": False, "reasoning": []}
        
        for level in escalator:
            r_trigger = level["r_level"]
            
            if managed.highest_profit_r >= r_trigger and current_r >= r_trigger * 0.3:
                action_type = level["action"]
                value = level["value"]
                
                if action_type == "move_sl_to" and value == "breakeven":
                    new_sl = managed.entry_price
                    if managed.side == "BUY":
                        new_sl = max(new_sl, actions.get("update_sl", 0) or 0)
                    else:
                        new_sl = min(new_sl, actions.get("update_sl", float('inf')) or float('inf'))
                    
                    if not actions.get("update_sl") or \
                       (managed.side == "BUY" and new_sl > actions["update_sl"]) or \
                       (managed.side == "SELL" and new_sl < actions["update_sl"]):
                        actions["update_sl"] = new_sl
                        actions["reasoning"].append(f"SL to breakeven at {r_trigger}R")
                
                elif action_type == "lock_profit":
                    profit_r = value
                    if managed.side == "BUY":
                        new_sl = managed.entry_price + (risk * profit_r)
                    else:
                        new_sl = managed.entry_price - (risk * profit_r)
                    
                    if not actions.get("update_sl") or \
                       (managed.side == "BUY" and new_sl > actions["update_sl"]) or \
                       (managed.side == "SELL" and new_sl < actions["update_sl"]):
                        actions["update_sl"] = new_sl
                        actions["reasoning"].append(f"Locked {profit_r}R profit at {r_trigger}R")
                
                elif action_type == "close_percent":
                    actions["close_partial"].append((value, f"Protection close at {r_trigger}R"))
                    actions["reasoning"].append(f"Closing {value*100:.0f}% at {r_trigger}R")
                
                elif action_type == "trail_aggressive":
                    actions["reasoning"].append(f"Aggressive trail activated at {r_trigger}R")
        
        return actions
    
    # ========== TIER MANAGEMENT ==========
    
    def _manage_tiers(self, managed: ManagedPosition, current_price: float, 
                      current_r: float, phase: str, metrics: dict) -> dict:
        """Manage individual position tiers"""
        actions = {"close_partial": [], "update_sl": None, "update_tp": None, 
                   "close_all": False, "reasoning": []}
        
        config = self.strategy_config.get(managed.strategy, 
                                          self.strategy_config["scalper"])
        
        for tier_name, tier in managed.tiers.items():
            if tier.status != "active":
                continue
            
            tier_config = config["tiers"][tier_name]
            
            # Check if tier's TP is hit
            if tier_config["tp_r"] and current_r >= tier_config["tp_r"]:
                actions["close_partial"].append((tier.portion, f"{tier_name} TP at {current_r:.2f}R"))
                tier.status = "closed"
                actions["reasoning"].append(f"✅ {tier_name} tier closed at {tier_config['tp_r']}R")
                continue
            
            # Activate trailing for this tier
            if current_r >= tier_config["trail_start_r"] and not tier.trail_activated:
                tier.trail_activated = True
                actions["reasoning"].append(f"🎯 {tier_name} trail activated at {current_r:.2f}R")
            
            # Apply trailing
            if tier.trail_activated:
                trail_method = self.trail_methods.get(phase, "atr_multiple")
                new_sl = self._calculate_trail_stop(managed, tier, current_price, 
                                                    trail_method, metrics)
                
                if new_sl:
                    if not actions.get("update_sl"):
                        actions["update_sl"] = new_sl
                    elif managed.side == "BUY" and new_sl > actions["update_sl"]:
                        actions["update_sl"] = new_sl
                    elif managed.side == "SELL" and new_sl < actions["update_sl"]:
                        actions["update_sl"] = new_sl
        
        # Check if all tiers are closed
        active_tiers = [t for t in managed.tiers.values() if t.status == "active"]
        if not active_tiers and not actions.get("close_all"):
            actions["close_all"] = True
            actions["reasoning"].append("All tiers closed")
        
        return actions
    
    def _calculate_trail_stop(self, managed: ManagedPosition, tier: PositionTier,
                              current_price: float, method: str, metrics: dict) -> Optional[float]:
        """Calculate trailing stop based on method"""
        
        risk = self._calculate_risk(managed)
        
        if method == "swing_points":
            buffer = risk * 0.2
            if managed.side == "BUY":
                trail_price = tier.peak_price - (tier.peak_price * 0.005)
                return max(trail_price, managed.entry_price + buffer)
            else:
                trail_price = tier.peak_price + (tier.peak_price * 0.005)
                return min(trail_price, managed.entry_price - buffer)
        
        elif method == "moving_average":
            try:
                rates = mt5.copy_rates_from_pos(managed.symbol, mt5.TIMEFRAME_M5, 0, 20)
                if rates and len(rates) >= 20:
                    ma = sum(r["close"] for r in rates[-20:]) / 20
                    return ma
            except:
                pass
            return managed.entry_price
        
        elif method == "supertrend":
            atr = metrics.get("atr_current", risk * 0.5)
            multiplier = 2.0
            if managed.side == "BUY":
                return current_price - (atr * multiplier)
            else:
                return current_price + (atr * multiplier)
        
        elif method == "atr_multiple":
            atr = metrics.get("atr_current", risk * 0.5)
            multiplier = 1.5 if managed.current_stage == "protecting" else 2.5
            if managed.side == "BUY":
                return current_price - (atr * multiplier)
            else:
                return current_price + (atr * multiplier)
        
        elif method == "fixed_breakeven":
            return managed.entry_price
        
        return None
    
    # ========== STRUCTURE & CORRELATION ==========
    
    def _check_structure_exits(self, managed: ManagedPosition, current_price: float, 
                               phase: str) -> dict:
        """Check for structure-based exit signals"""
        actions = {"close_partial": [], "update_sl": None, "update_tp": None, 
                   "close_all": False, "reasoning": []}
        
        if not self._has_runner_tier(managed):
            return actions
        
        rates = self.phase_detector._get_recent_rates(managed.symbol, "5", 30)
        if rates is None or len(rates) < 20:
            return actions
        
        highs = [r["high"] for r in rates[-20:]]
        lows = [r["low"] for r in rates[-20:]]
        
        if managed.side == "BUY":
            recent_highs = highs[-5:]
            if len(recent_highs) >= 3:
                if recent_highs[-1] < recent_highs[-2] < recent_highs[-3]:
                    if managed.highest_profit_r > 1.0:
                        actions["close_partial"].append((0.3, "Lower high formation"))
                        actions["reasoning"].append("⚠️ Lower high - structure weakening")
        else:
            recent_lows = lows[-5:]
            if len(recent_lows) >= 3:
                if recent_lows[-1] > recent_lows[-2] > recent_lows[-3]:
                    if managed.highest_profit_r > 1.0:
                        actions["close_partial"].append((0.3, "Higher low formation"))
                        actions["reasoning"].append("⚠️ Higher low - structure weakening")
        
        return actions
    
    def _check_correlation_risks(self, managed: ManagedPosition) -> bool:
        """Check for adverse correlation movements"""
        if "XAUUSD" in managed.symbol.upper():
            try:
                dxy_rates = mt5.copy_rates_from_pos("USDX", mt5.TIMEFRAME_M5, 0, 5)
                if dxy_rates and len(dxy_rates) >= 3:
                    dxy_change = (dxy_rates[-1]["close"] - dxy_rates[-3]["close"]) / max(dxy_rates[-3]["close"], 0.00001)
                    
                    if managed.side == "BUY" and dxy_change > 0.005:
                        return True
                    elif managed.side == "SELL" and dxy_change < -0.005:
                        return True
            except:
                pass
        
        return False
    
    # ========== ACTION MERGING ==========
    
    def _merge_actions(self, base: dict, new: dict) -> dict:
        """Merge action dictionaries"""
        
        if new.get("close_partial"):
            base["close_partial"].extend(new["close_partial"])
        
        if new.get("update_sl"):
            if base.get("update_sl") is None:
                base["update_sl"] = new["update_sl"]
        
        if new.get("update_tp"):
            base["update_tp"] = new["update_tp"]
        
        if new.get("close_all"):
            base["close_all"] = True
        
        if new.get("reasoning"):
            base["reasoning"].extend(new["reasoning"])
        
        return base
    
    # ========== EXECUTION ==========
    
    def execute_actions(self, position, actions: dict) -> dict:
        """Execute management actions on a real position"""
        results = {
            "partial_closes": 0,
            "sl_updated": False,
            "tp_updated": False,
            "fully_closed": False,
            "summary": []
        }
        
        # Execute partial closes
        for close_percent, reason in actions.get("close_partial", []):
            if self._close_partial(position, close_percent):
                results["partial_closes"] += 1
                results["summary"].append(f"Closed {close_percent*100:.0f}%: {reason}")
        
        # Update SL
        if actions.get("update_sl") and not actions.get("close_all"):
            if self._update_sl(position, actions["update_sl"]):
                results["sl_updated"] = True
                results["summary"].append(f"SL updated to {actions['update_sl']}")
        
        # Update TP
        if actions.get("update_tp") and not actions.get("close_all"):
            if self._update_tp(position, actions["update_tp"]):
                results["tp_updated"] = True
                results["summary"].append(f"TP updated to {actions['update_tp']}")
        
        # Close entire position
        if actions.get("close_all"):
            if self._close_full(position):
                results["fully_closed"] = True
                results["summary"].append("Position fully closed")
                self.unregister_position(position.ticket)
        
        return results
    
    def _close_partial(self, position, percentage: float) -> bool:
        """Close a percentage of the position"""
        if percentage <= 0:
            return False
        if percentage >= 0.999:
            return self._close_full(position)
        
        symbol_info = mt5.symbol_info(position.symbol)
        if not symbol_info:
            return False
        
        step = float(symbol_info.volume_step or 0.01)
        min_vol = float(symbol_info.volume_min or 0.01)
        vol_to_close = max(min_vol, round((position.volume * percentage) / step) * step)
        
        if position.volume - vol_to_close < min_vol:
            return self._close_full(position)
        
        tick = mt5.symbol_info_tick(position.symbol)
        if not tick:
            return False
        
        close_req = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": position.symbol,
            "volume": float(vol_to_close),
            "type": mt5.ORDER_TYPE_SELL if position.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY,
            "position": position.ticket,
            "price": tick.bid if position.type == mt5.ORDER_TYPE_BUY else tick.ask,
            "deviation": 20,
            "magic": 234000,
            "comment": f"PM_PARTIAL_{int(percentage*100)}%"
        }
        
        result = mt5.order_send(close_req)
        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
            logger.success(f"📤 Closed {percentage*100:.0f}% of position {position.ticket}")
            return True
        
        logger.error(f"Partial close failed: {result.comment if result else 'no result'}")
        return False
    
    def _update_sl(self, position, new_sl: float) -> bool:
        """Update stop loss"""
        tick = mt5.symbol_info_tick(position.symbol)
        if not tick:
            return False
        
        info = mt5.symbol_info(position.symbol)
        digits = int(info.digits) if info else 5
        new_sl = round(new_sl, digits)
        
        req = {
            "action": mt5.TRADE_ACTION_SLTP,
            "symbol": position.symbol,
            "position": position.ticket,
            "sl": new_sl,
            "tp": position.tp,
            "magic": 234000,
            "comment": "PM_SL_UPDATE"
        }
        
        result = mt5.order_send(req)
        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
            logger.info(f"🛡️ SL updated to {new_sl} for position {position.ticket}")
            return True
        
        # Don't log as error for minor failures (price too close etc)
        logger.debug(f"SL update skipped: {result.comment if result else 'no result'}")
        return False
    
    def _update_tp(self, position, new_tp: float) -> bool:
        """Update take profit"""
        info = mt5.symbol_info(position.symbol)
        digits = int(info.digits) if info else 5
        new_tp = round(new_tp, digits)
        
        req = {
            "action": mt5.TRADE_ACTION_SLTP,
            "symbol": position.symbol,
            "position": position.ticket,
            "sl": position.sl,
            "tp": new_tp,
            "magic": 234000,
            "comment": "PM_TP_UPDATE"
        }
        
        result = mt5.order_send(req)
        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
            logger.info(f"🎯 TP updated to {new_tp} for position {position.ticket}")
            return True
        
        logger.debug(f"TP update skipped: {result.comment if result else 'no result'}")
        return False
    
    def _close_full(self, position) -> bool:
        """Close entire position"""
        tick = mt5.symbol_info_tick(position.symbol)
        if not tick:
            return False
        
        close_req = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": position.symbol,
            "volume": position.volume,
            "type": mt5.ORDER_TYPE_SELL if position.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY,
            "position": position.ticket,
            "price": tick.bid if position.type == mt5.ORDER_TYPE_BUY else tick.ask,
            "deviation": 20,
            "magic": 234000,
            "comment": "PM_FULL_CLOSE"
        }
        
        result = mt5.order_send(close_req)
        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
            logger.success(f"🔒 Position {position.ticket} fully closed")
            return True
        
        logger.error(f"Full close failed: {result.comment if result else 'no result'}")
        return False
    
    # ========== STATISTICS ==========
    
    def get_position_stats(self, ticket: int) -> Optional[dict]:
        """Get statistics for a managed position"""
        if ticket not in self.managed_positions:
            return None
        
        managed = self.managed_positions[ticket]
        
        active_tiers = [t for t in managed.tiers.values() if t.status == "active"]
        closed_tiers = [t for t in managed.tiers.values() if t.status == "closed"]
        
        return {
            "symbol": managed.symbol,
            "side": managed.side,
            "strategy": managed.strategy,
            "current_stage": managed.current_stage,
            "highest_r": round(managed.highest_profit_r, 2),
            "active_tiers": len(active_tiers),
            "closed_tiers": len(closed_tiers),
            "active_volume_pct": sum(t.portion for t in active_tiers),
            "age_minutes": (datetime.now() - managed.entry_time).total_seconds() / 60
        }

# ============================================================================
# END PROFIT MAXIMIZER
# ============================================================================

# ========== CHART CAPTURE WITH PLAYWRIGHT ==========
class ChartCapture:
    def __init__(self):
        self.screenshot_dir = SCREENSHOT_DIR
        
    async def capture_chart(self, symbol: str, interval: str = "D", theme: str = "dark") -> dict:
        """Capture chart screenshot using Playwright"""
        filename = f"{symbol}_{interval}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = self.screenshot_dir / filename
        
        url = f"{CHART_BASE_URL}?symbol={symbol}&interval={interval}&theme={theme}"
        
        logger.info(f"Capturing {interval} chart for {symbol}")
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=False,
                    args=['--no-sandbox', '--disable-setuid-sandbox']
                )
                context = await browser.new_context()
                page = await context.new_page()
                await page.goto(url, wait_until='domcontentloaded')
                
                wait_time = 8000 if interval in ['1', '5', '15'] else 5000
                await page.wait_for_timeout(wait_time)

                await page.screenshot(
                    path=str(filepath),
                    full_page=True
                )
                
                await page.close()
                await context.close()
                await browser.close()
            
                logger.success(f"✅ {interval} chart captured: {filename}")
                
                return {
                    'success': True,
                    'filepath': str(filepath),
                    'filename': filename,
                    'symbol': symbol,
                    'interval': interval,
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to capture {interval} chart: {e}")
            return {
                'success': False,
                'error': str(e),
                'symbol': symbol,
                'interval': interval
            }
    
    async def capture_multiple_intervals(self, symbol: str, intervals: list) -> list:
        """Capture multiple timeframe charts"""
        logger.info(f"\n📸 Capturing {len(intervals)} timeframes for {symbol}: {intervals}")
        
        results = []
        for i, interval in enumerate(intervals):
            logger.info(f"  [{i+1}/{len(intervals)}] Capturing {interval}...")
            result = await self.capture_chart(symbol, interval)
            results.append(result)
            
            if i < len(intervals) - 1:
                await asyncio.sleep(4)
                
        successful = sum(1 for r in results if r['success'])
        logger.info(f"📊 Capture complete: {successful}/{len(intervals)} successful")
        
        return results
    
    def cleanup_old_screenshots(self, hours: int = 24):
        """Remove screenshots older than specified hours"""
        now = time.time()
        removed = 0
        for file in self.screenshot_dir.glob("*.png"):
            if now - file.stat().st_mtime > hours * 3600:
                file.unlink()
                removed += 1
        if removed > 0:
            logger.info(f"🧹 Cleaned up {removed} old screenshots")

# ========== AI ANALYZER WITH OPENAI VISION ==========
class AIAnalyzer:
    def __init__(self):
        self.client = openai.OpenAI(api_key=OPENAI_API_KEY)
        self.debug_dir = Path("./debug_responses")
        self.debug_dir.mkdir(exist_ok=True)
        
    def encode_image(self, image_path: str) -> str:
        """Convert image to base64"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    
    def _extract_json_safely(self, text: str) -> dict:
        """Safely extract JSON from response with multiple fallback methods"""
        if not text or not text.strip():
            logger.error("Empty response from OpenAI")
            return None
        
        import re
        code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
        code_blocks = re.findall(code_block_pattern, text)
        
        for block in code_blocks:
            try:
                return json.loads(block.strip())
            except:
                continue
        
        json_pattern = r'(\{[\s\S]*\})'
        json_matches = re.findall(json_pattern, text)
        
        for match in json_matches:
            try:
                return json.loads(match)
            except:
                continue
        
        try:
            return json.loads(text.strip())
        except:
            pass
        
        cleaned = text.strip()
        first_brace = cleaned.find('{')
        if first_brace != -1:
            cleaned = cleaned[first_brace:]
            last_brace = cleaned.rfind('}')
            if last_brace != -1:
                cleaned = cleaned[:last_brace + 1]
                try:
                    return json.loads(cleaned)
                except:
                    pass
        
        return None
    
    def _ensure_required_fields(self, analysis: dict, interval: str) -> dict:
        """Ensure all required fields exist with defaults"""
        defaults = {
            'direction': 'NEUTRAL',
            'confidence': 50,
            'entry_price': None,
            'stop_loss': None,
            'take_profit': None,
            'reasoning': '',
            'key_levels': {'support': [], 'resistance': []},
            'indicators': {'trend': 'neutral', 'rsi': 'neutral', 'macd': 'neutral'},
            'risk_reward_ratio': 0
        }
        
        for field, default_value in defaults.items():
            if field not in analysis or analysis[field] is None:
                analysis[field] = default_value
        
        return analysis

    def _coerce_float(self, value):
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        try:
            cleaned = str(value).replace(",", "").strip()
            if not cleaned:
                return None
            return float(cleaned)
        except Exception:
            return None

    def _normalize_price_fields(self, symbol: str, analysis: dict) -> dict:
        """Normalize entry/sl/tp to broker symbol precision and numeric format"""
        try:
            resolved = resolve_mt5_symbol(symbol) or symbol
            info = mt5.symbol_info(resolved)
            digits = int(info.digits) if info else 2
        except Exception:
            digits = 2

        for k in ["entry_price", "stop_loss", "take_profit"]:
            v = self._coerce_float(analysis.get(k))
            if v is not None:
                analysis[k] = round(v, digits)

        return analysis

    def _ensure_decision_fields(self, decision: dict) -> dict:
        """Normalize AI decision payload"""
        defaults = {
            "action": "HOLD",
            "confidence": 0,
            "reasoning": "",
            "reverse_to": None,
            "new_stop_loss": None,
            "new_take_profit": None,
            "urgency": "normal"
        }
        for field, default_value in defaults.items():
            if field not in decision:
                decision[field] = default_value

        action = str(decision.get("action", "HOLD")).upper().strip()
        valid_actions = {"HOLD", "OPEN_BUY", "OPEN_SELL", "CLOSE", "CLOSE_AND_REVERSE"}
        if action not in valid_actions:
            action = "HOLD"
        decision["action"] = action

        reverse_to = decision.get("reverse_to")
        if reverse_to is not None:
            reverse_to = str(reverse_to).upper().strip()
            decision["reverse_to"] = reverse_to if reverse_to in ["BUY", "SELL"] else None

        try:
            decision["confidence"] = int(float(decision.get("confidence", 0)))
        except Exception:
            decision["confidence"] = 0
        decision["confidence"] = max(0, min(100, decision["confidence"]))

        return decision
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def analyze_chart(self, image_path: str, symbol: str, interval: str) -> dict:
        """Send chart to OpenAI Vision for analysis"""
        
        if not os.path.exists(image_path):
            logger.error(f"Image not found: {image_path}")
            return {"direction": "NEUTRAL", "confidence": 0, "error": "Image not found"}
        
        account = get_account_info()
        balance = account['balance'] if account else 0
        equity = account['equity'] if account else 0
        currency = account['currency'] if account else 'USD'
        
        base64_image = self.encode_image(image_path)
        
        logger.info(f"Analyzing {symbol} {interval} chart with OpenAI...")
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert quantitative trader and technical analyst. 
                        Analyze the chart and provide a detailed trading recommendation.
                        Return your analysis in the following JSON format only, no other text:
                        
                        {
                            "direction": "BUY" or "SELL" or "NEUTRAL",
                            "confidence": 0-100,
                            "entry_price": float,
                            "stop_loss": float,
                            "take_profit": float,
                            "reasoning": "detailed analysis",
                            "key_levels": {
                                "support": [float, float],
                                "resistance": [float, float]
                            },
                            "indicators": {
                                "trend": "bullish/bearish/neutral",
                                "rsi": "overbought/oversold/neutral",
                                "macd": "bullish/bearish/neutral"
                            },
                            "risk_reward_ratio": float
                        }"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Analyze this {symbol} {interval} chart. Provide specific entry, stop loss, and take profit levels based on visible support/resistance and technical patterns. Current account balance: {balance} {currency}, current equity: {equity} {currency}"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.2
            )
            
            analysis_text = response.choices[0].message.content
            logger.debug(f"Raw OpenAI response for {interval}: {analysis_text[:200]}...")
            
            analysis = self._extract_json_safely(analysis_text)
            
            if not analysis:
                logger.error(f"Failed to parse JSON from response for {interval}")
                return {
                    'error': 'JSON parsing failed',
                    'symbol': symbol,
                    'interval': interval,
                    'direction': 'NEUTRAL',
                    'confidence': 0
                }
            
            analysis['symbol'] = symbol
            analysis['interval'] = interval
            analysis['timestamp'] = datetime.now().isoformat()
            analysis['image_path'] = image_path
            
            analysis = self._ensure_required_fields(analysis, interval)
            analysis = self._normalize_price_fields(symbol, analysis)
            
            logger.success(f"  ✅ {interval} analysis: {analysis['direction']} ({analysis['confidence']}%)")
            
            return analysis
            
        except Exception as e:
            logger.error(f"OpenAI analysis failed for {interval}: {e}")
            return {
                'error': str(e),
                'symbol': symbol,
                'interval': interval,
                'direction': 'NEUTRAL',
                'confidence': 0
            }
    
    async def analyze_with_context(self, symbol: str, account: dict, chart_results: list, strategy: str = "scalper") -> dict:
        """Progressive analysis: Each timeframe builds context for the next"""
        
        timeframe_orders = {
            'scalper': ['15','1','5'],
            'intraday': ['60', '15', '5'],
            'swing': ['D', '240', '60']
        }
        timeframe_order = timeframe_orders.get(strategy, ['15', '5', '1'])
        sorted_results = sorted(
            [r for r in chart_results if r['success']],
            key=lambda x: timeframe_order.index(x['interval']) if x['interval'] in timeframe_order else 999
        )
        
        if not sorted_results:
            return { 
                'direction': 'NEUTRAL', 
                'confidence': 0, 
                'error': 'No charts',
                'symbol': symbol
            }
        
        context = ""
        analyses = []
        
        logger.info(f"\n📚 Progressive Analysis for {symbol}")
        logger.info("=" * 60)
        
        for i, chart in enumerate(sorted_results):
            interval = chart['interval']
            
            logger.info(f"\n📊 Step {i+1}: Analyzing {interval} timeframe")
            
            analysis = await self.analyze_chart_with_context(
                account,
                chart['filepath'],
                symbol,
                interval,
                context
            )
            
            analyses.append(analysis)
            
            if 'error' not in analysis:
                context += f"""
                {interval}: {analysis.get('direction', 'NEUTRAL')} ({analysis.get('confidence', 0)}%) - {analysis.get('reasoning', '')[:100]}
                """
                logger.info(f"  ✅ {interval} complete - Added to context")
            else:
                logger.warning(f"  ⚠️ {interval} analysis had issues, continuing...")
                context += f"{interval}: Analysis unavailable\n"
            
            if interval == '5':
                logger.info("\n" + "=" * 60)
                logger.info("🎯 FINAL TRADING DECISION (5m Timeframe)")
                logger.info("=" * 60)
                
                if 'error' in analysis:
                    logger.warning("5m analysis failed, using consensus from other timeframes")
                    return self._calculate_consensus(analyses, symbol)
                
                return {
                    'direction': analysis.get('direction', 'NEUTRAL'),
                    'confidence': analysis.get('confidence', 50),
                    'entry_price': analysis.get('entry_price'),
                    'stop_loss': analysis.get('stop_loss'),
                    'take_profit': analysis.get('take_profit'),
                    'reasoning': analysis.get('reasoning', ''),
                    'Volume': analysis.get('Volume', 0),
                    'context': context,
                    'all_analyses': analyses,
                    'symbol': symbol,
                    'trading_timeframe': '5',
                    'timestamp': datetime.now().isoformat()
                }
        
        logger.warning("No 5m timeframe found, using consensus")
        return self._calculate_consensus(analyses, symbol)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def decide_trade_action(
        self,
        symbol: str,
        strategy: str,
        market_signal: dict,
        open_position: Optional[dict],
        account: dict
    ) -> dict:
        """Decide what to do this cycle: OPEN / HOLD / CLOSE / CLOSE_AND_REVERSE"""
        system_prompt = """You are a disciplined discretionary trader.
Return ONLY JSON with this schema:
{
  "action": "HOLD|OPEN_BUY|OPEN_SELL|CLOSE|CLOSE_AND_REVERSE",
  "reverse_to": "BUY|SELL|null",
  "confidence": 0-100,
  "new_stop_loss": float or null,
  "new_take_profit": float or null,
  "urgency": "low|normal|high",
  "reasoning": "short explanation"
}

Rules:
- If there is no open position, prefer OPEN_* only when edge is strong, otherwise HOLD.
- If there is an open position, decide HOLD/CLOSE/CLOSE_AND_REVERSE.
- CLOSE_AND_REVERSE only on clear regime shift.
- Avoid overtrading and avoid flip-flopping."""

        payload = {
            "symbol": symbol,
            "strategy": strategy,
            "market_signal": market_signal,
            "open_position": open_position,
            "account": {
                "balance": account.get("balance"),
                "equity": account.get("equity"),
                "free_margin": account.get("free_margin"),
                "currency": account.get("currency")
            }
        }

        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(payload)}
                ],
                max_tokens=450,
                temperature=0.1
            )
            decision_text = response.choices[0].message.content
            decision = self._extract_json_safely(decision_text)
            if not decision:
                logger.error("AI decision JSON parsing failed")
                return self._ensure_decision_fields({"action": "HOLD", "confidence": 0, "reasoning": "JSON parse failed"})
            decision = self._ensure_decision_fields(decision)
            return decision
        except Exception as e:
            logger.error(f"AI decision failed: {e}")
            return self._ensure_decision_fields({"action": "HOLD", "confidence": 0, "reasoning": str(e)})

    async def should_trail_stop(self, position: dict, current_price: float, market_volatility: str) -> dict:
        """Ask AI for dynamic exit action on an open position"""
        try:
            prompt = f"""
Position: {position.get('symbol')} {position.get('side')}
Entry: {position.get('entry_price')}
Current: {current_price}
Current SL: {position.get('sl')}
Current TP: {position.get('tp')}
Profit: {position.get('profit')}
Volatility: {market_volatility}

Decide:
1) Hold with current SL
2) Trail stop (suggest new level)
3) Take partial profit (suggest %)
4) Close entire position

Return JSON:
{{
    "action": "HOLD|TRAIL|PARTIAL|CLOSE",
    "new_sl": float or null,
    "new_tp": float or null,
    "partial_percent": int,
    "reasoning": "string"
}}
"""
            response = self.client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.2
            )
            parsed = self._extract_json_safely(response.choices[0].message.content) or {}
            action = str(parsed.get("action", "HOLD")).upper()
            if action not in ["HOLD", "TRAIL", "PARTIAL", "CLOSE"]:
                action = "HOLD"
            return {
                "action": action,
                "new_sl": parsed.get("new_sl"),
                "new_tp": parsed.get("new_tp"),
                "partial_percent": int(parsed.get("partial_percent", 0) or 0),
                "reasoning": parsed.get("reasoning", "")
            }
        except Exception as e:
            logger.error(f"AI trail decision failed: {e}")
            return {"action": "HOLD", "new_sl": None, "new_tp": None, "partial_percent": 0, "reasoning": str(e)}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def analyze_chart_with_context(self, account: dict,
        image_path: str, symbol: str, interval: str, context: str = "") -> dict:
        """Send chart to OpenAI with previous context"""
        
        if not os.path.exists(image_path):
            logger.error(f"Image not found: {image_path}")
            return {"direction": "NEUTRAL", "confidence": 0, "error": "Image not found"}
        
        base64_image = self.encode_image(image_path)
        
        system_prompt = """You are an expert quantitative trader analyzing multiple timeframes.
        You will receive charts from larger to smaller timeframes, building context.
        Use information from previous timeframes to inform your analysis of the current chart.
        Based on the account size and trading type suggest an appropriate volume.
        Do not make a mistake of giving a signal because of the overall trend, you need to look at the 
        previous Low or High not the Highest High or Lowest Low.
        Like use 15M to confirm the direction but on 1m just confirm like you cannot enter
        a buy if the price is near a previous resistance on the 1m timeframe.
        
        Keep all price fields strictly numeric (no commas, no text).
        
        Return your analysis in the following JSON format only, no other text:
        {
            "direction": "BUY" or "SELL" or "NEUTRAL",
            "confidence": 0-100,
            "entry_price": float,
            "stop_loss": float,
            "take_profit": float,
            "Trade_type": "scalping/intraday/swing",
            "Volume": float,
            "reasoning": "brief analysis",
            "key_levels": {
                "support": [float, float],
                "resistance": [float, float]
            },
            "indicators": {
                "trend": "bullish/bearish/neutral",
                "rsi": "overbought/oversold/neutral",
                "macd": "bullish/bearish/neutral"
            },
            "risk_reward_ratio": float
        }"""
        
        user_content = []
        
        if context and len(context) > 10:
            user_content.append({
                "type": "text",
                "text": f"PREVIOUS TIMEFRAME ANALYSIS:\n{context}\n\nNow analyze the {interval} chart considering this context."
            })
        else:
            user_content.append({
                "type": "text",
                "text": f"Analyze this {symbol} {interval} chart. with the account info {account}. Provide specific entry, stop loss, and take profit levels."
            })
        
        user_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{base64_image}"
            }
        })
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                max_tokens=1000,
                temperature=0.2
            )
            
            analysis_text = response.choices[0].message.content
            logger.debug(f"Raw response for {interval}: {analysis_text[:100]}...")
            
            analysis = self._extract_json_safely(analysis_text)
            
            if not analysis:
                logger.error(f"Failed to parse JSON from response for {interval}")
                return {
                    'error': 'JSON parsing failed',
                    'symbol': symbol,
                    'interval': interval,
                    'direction': 'NEUTRAL',
                    'confidence': 0
                }
            
            analysis['symbol'] = symbol
            analysis['interval'] = interval
            analysis['timestamp'] = datetime.now().isoformat()
            analysis['image_path'] = image_path
            
            analysis = self._ensure_required_fields(analysis, interval)
            analysis = self._normalize_price_fields(symbol, analysis)
            
            logger.success(f"  ✅ {interval} analysis: {analysis['direction']} ({analysis['confidence']}%)")
            
            return analysis
            
        except Exception as e:
            logger.error(f"OpenAI analysis failed for {interval}: {e}")
            return {
                'error': str(e),
                'symbol': symbol,
                'interval': interval,
                'direction': 'NEUTRAL',
                'confidence': 0
            }
    
    def _calculate_consensus(self, analyses: list, symbol: str) -> dict:
        """Calculate consensus from multiple timeframe analyses"""
        
        valid_analyses = [a for a in analyses if 'error' not in a]
        
        if not valid_analyses:
            return {
                'direction': 'NEUTRAL',
                'confidence': 0,
                'error': 'No valid analyses',
                'symbol': symbol,
                'timestamp': datetime.now().isoformat()
            }
        
        weighted_votes = {'BUY': 0, 'SELL': 0, 'NEUTRAL': 0}
        total_weight = 0
        
        for a in valid_analyses:
            weight = TIMEFRAME_WEIGHTS.get(a.get('interval', 'D'), 0.5)
            confidence = a.get('confidence', 50) / 100
            weighted_votes[a.get('direction', 'NEUTRAL')] += weight * confidence
            total_weight += weight
        
        if weighted_votes['BUY'] > weighted_votes['SELL'] and weighted_votes['BUY'] > weighted_votes['NEUTRAL']:
            final_direction = 'BUY'
            final_confidence = (weighted_votes['BUY'] / total_weight) * 100
        elif weighted_votes['SELL'] > weighted_votes['BUY'] and weighted_votes['SELL'] > weighted_votes['NEUTRAL']:
            final_direction = 'SELL'
            final_confidence = (weighted_votes['SELL'] / total_weight) * 100
        else:
            final_direction = 'NEUTRAL'
            final_confidence = 50
        
        return {
            'direction': final_direction,
            'confidence': round(final_confidence, 2),
            'all_analyses': analyses,
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),
            'note': 'Consensus from multiple timeframes'
        }

# ========== MT5 CONNECTION ==========
def mt5_connect():
    """Initialize MT5 connection"""
    if not mt5.initialize():
        error = mt5.last_error()
        raise RuntimeError(f"MT5 init failed: {error}")
    
    login = os.getenv("MT5_LOGIN")
    password = os.getenv("MT5_PASSWORD")
    server = os.getenv("MT5_SERVER")
    
    if login and password and server:
        authorized = mt5.login(int(login), password=password, server=server)
        if not authorized:
            raise RuntimeError(f"MT5 login failed: {mt5.last_error()}")
    
    if not mt5.symbol_select(SYMBOL_DEFAULT, True):
        raise RuntimeError(f"symbol_select failed for {SYMBOL_DEFAULT}")
    
    logger.success(f"MT5 connected successfully")
    return True

def get_account_info():
    """Fetch account balance, equity, and open positions"""
    account_info = mt5.account_info()
    if account_info is None:
        logger.error(f"Failed to get account info: {mt5.last_error()}")
        return None
    
    positions = mt5.positions_get()
    
    account_data = {
        "balance": account_info.balance,
        "equity": account_info.equity,
        "margin": account_info.margin,
        "free_margin": account_info.margin_free,
        "leverage": account_info.leverage,
        "currency": account_info.currency,
        "open_positions": []
    }
    
    if positions:
        for position in positions:
            account_data["open_positions"].append({
                "ticket": position.ticket,
                "symbol": position.symbol,
                "type": "buy" if position.type == mt5.ORDER_TYPE_BUY else "sell",
                "volume": position.volume,
                "price_open": position.price_open,
                "sl": position.sl,
                "tp": position.tp,
                "profit": position.profit,
                "comment": position.comment
            })
        logger.info(f"📊 Open positions: {len(positions)}")
    
    return account_data

def resolve_mt5_symbol(symbol: str) -> Optional[str]:
    """Resolve broker symbol aliases like XAUUSD <-> XAUUSD.m"""
    try:
        requested = (symbol or "").strip()
        if not requested:
            return None

        candidates = [requested]
        if requested.lower().endswith(".m"):
            candidates.append(requested[:-2])
        else:
            candidates.append(f"{requested}.m")

        seen = set()
        for candidate in candidates:
            if not candidate or candidate in seen:
                continue
            seen.add(candidate)
            info = mt5.symbol_info(candidate)
            if info:
                mt5.symbol_select(candidate, True)
                if candidate != requested:
                    logger.info(f"Resolved MT5 symbol {requested} -> {candidate}")
                return candidate

        logger.error(f"Could not resolve MT5 symbol for {requested}")
        return None
    except Exception as e:
        logger.error(f"Symbol resolution failed for {symbol}: {e}")
        return None

def _round_volume_to_step(volume: float, min_volume: float, max_volume: float, step: float) -> float:
    """Round volume down to broker step and clamp bounds"""
    if step <= 0:
        step = 0.01
    clamped = max(min(volume, max_volume), min_volume)
    stepped = math.floor((clamped - min_volume) / step) * step + min_volume
    return round(max(min(stepped, max_volume), min_volume), 2)

def calculate_risk_based_lot(symbol: str, order_type: str, stop_loss: float, account_balance: float, risk_percent: float) -> Optional[float]:
    """Lot size from fixed-risk model"""
    try:
        resolved_symbol = resolve_mt5_symbol(symbol)
        if not resolved_symbol:
            return None

        symbol_info = mt5.symbol_info(resolved_symbol)
        tick = mt5.symbol_info_tick(resolved_symbol)
        if not symbol_info or not tick:
            logger.error(f"Cannot fetch symbol info for {resolved_symbol}")
            return None

        entry_price = tick.ask if order_type.upper() == "BUY" else tick.bid
        stop_distance = abs(entry_price - float(stop_loss))
        if stop_distance <= (symbol_info.point * 3):
            logger.warning("Stop distance too small for safe sizing")
            return None

        tick_value = float(symbol_info.trade_tick_value or 0)
        tick_size = float(symbol_info.trade_tick_size or 0)
        if tick_value <= 0 or tick_size <= 0:
            logger.error(f"Invalid tick value/size for {resolved_symbol}")
            return None

        value_per_price_unit = tick_value / tick_size
        risk_amount = account_balance * (max(risk_percent, 0.01) / 100.0)
        raw_lot = risk_amount / (stop_distance * value_per_price_unit)

        lot = _round_volume_to_step(
            raw_lot,
            float(symbol_info.volume_min or 0.01),
            float(symbol_info.volume_max or 5.0),
            float(symbol_info.volume_step or 0.01)
        )
        return lot
    except Exception as e:
        logger.error(f"Risk-based lot calculation failed: {e}")
        return None

def place_order(symbol: str, order_type: str, volume: float, 
                sl: float = 0, tp: float = 0, comment: str = "AI Quant Bot"):
    """Place a market order"""
    resolved_symbol = resolve_mt5_symbol(symbol)
    if not resolved_symbol:
        logger.error(f"Order blocked: symbol not found for {symbol}")
        return None
    # AI_MODE = True
    # if AI_MODE:
    #     sl = round(float(sl), 5) if sl else 0
    #     tp = round(float(tp), 5) if tp else 0
    # elif not AI_MODE:
        
    tick = mt5.symbol_info_tick(resolved_symbol)
    if not tick:
        logger.error(f"No tick data for {resolved_symbol}")
        return None

    if order_type.upper() == "BUY":
        mt5_order_type = mt5.ORDER_TYPE_BUY
        price = tick.ask
        sl = price - 500 
    elif order_type.upper() == "SELL":
        mt5_order_type = mt5.ORDER_TYPE_SELL
        price = tick.bid
        sl = price + 500 
    else:
        logger.error(f"Invalid order type: {order_type}")
        return None
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": resolved_symbol,
        "volume": float(volume),
        "type": mt5_order_type,
        "price": price,
        "sl": float(sl) if sl else 0,
        "tp": float(tp) if tp else 0,
        "deviation": 20,
        "magic": 234000,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
    }
    
    result = mt5.order_send(request)
    
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        logger.error(f"Order failed: {result.comment} (code: {result.retcode})")
        return None
    
    logger.success(f"✅ Order placed: {order_type} {volume} {resolved_symbol} @ {price}")
    return result.order

def close_position(position, reason: str = "AI_CLOSE") -> bool:
    """Close an open MT5 position at market"""
    tick = mt5.symbol_info_tick(position.symbol)
    if not tick:
        logger.error(f"No tick data for {position.symbol}")
        return False

    close_request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": position.symbol,
        "volume": position.volume,
        "type": mt5.ORDER_TYPE_SELL if position.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY,
        "position": position.ticket,
        "price": tick.bid if position.type == mt5.ORDER_TYPE_BUY else tick.ask,
        "deviation": 20,
        "magic": 234000,
        "comment": reason,
        "type_time": mt5.ORDER_TIME_GTC,
    }
    result = mt5.order_send(close_request)
    if result and result.retcode == mt5.TRADE_RETCODE_DONE:
        logger.success(f"Closed position {position.ticket} ({reason})")
        return True
    logger.error(f"Failed closing position {position.ticket}: {result.comment if result else 'no result'}")
    return False

# ========== GRADUAL TRADER SYSTEM ==========
class GradualTrader:
    def __init__(self, ai_analyzer: AIAnalyzer, chart_capture: ChartCapture):
        self.ai_analyzer = ai_analyzer
        self.chart_capture = chart_capture
        self.trade_history = []
        self.consecutive_wins = 0
        self.consecutive_losses = 0
        self.base_position_size = 0.01
        self.max_position_size = 5.0
        self.last_entry_at = {}
        self.last_close_at = {}
        self.daily_limits = {
            "day": datetime.now().strftime("%Y-%m-%d"),
            "trades": 0,
            "reversals": 0
        }
        # NEW: Replace old exit_manager and trailing_stop with ProfitMaximizer
        self.profit_maximizer = ProfitMaximizer()

    def _get_market_volatility(self, symbol: str) -> str:
        """Determine market volatility based on ATR"""
        try:
            rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M5, 0, 20)
            if rates is None or len(rates) < 20:
                return "normal"

            highs = [rate['high'] for rate in rates]
            lows = [rate['low'] for rate in rates]
            closes = [rate['close'] for rate in rates]

            true_ranges = []
            for i in range(1, len(rates)):
                tr = max(
                    highs[i] - lows[i],
                    abs(highs[i] - closes[i - 1]),
                    abs(lows[i] - closes[i - 1])
                )
                true_ranges.append(tr)

            avg_tr = sum(true_ranges) / len(true_ranges)
            atr_percentage = (avg_tr / closes[-1]) * 100

            if atr_percentage > 0.5:
                return "high"
            if atr_percentage < 0.2:
                return "low"
            return "normal"
        except Exception as e:
            logger.debug(f"Volatility calculation error: {e}")
            return "normal"

    def _get_trading_session(self) -> str:
        """Determine current trading session based on time"""
        now = datetime.now(timezone.utc) + timedelta(hours=2)
        hour = now.hour

        if 0 <= hour < 8:
            return "asian"
        if 8 <= hour < 16:
            return "london"
        if 16 <= hour < 24:
            return "new_york"
        return "off_hours"

    def _reset_daily_limits_if_needed(self):
        today = datetime.now().strftime("%Y-%m-%d")
        if self.daily_limits["day"] != today:
            self.daily_limits = {"day": today, "trades": 0, "reversals": 0}

    def _update_streak_from_profit(self, pnl: float):
        if pnl > 0:
            self.consecutive_wins += 1
            self.consecutive_losses = 0
        else:
            self.consecutive_losses += 1
            self.consecutive_wins = 0

    def _can_open_new_position(self, symbol: str, open_position: Any, settings: dict, current_positions: int = 0) -> bool:
        return True

    def _apply_governor_rules(self, decision: dict, symbol: str, open_position: Any, settings: dict) -> dict:
        min_conf = int(settings.get("min_confidence", 70))
        min_reverse_conf = int(settings.get("min_reverse_confidence", 85))
        min_hold_minutes = int(settings.get("min_hold_minutes", 12))
        max_reversals = int(settings.get("max_reversals_per_day", 2))

        action = decision.get("action", "HOLD")
        confidence = int(decision.get("confidence", 0))
        age_minutes = int((time.time() - open_position.time) / 60) if open_position else 0

        if action in ["OPEN_BUY", "OPEN_SELL"] and confidence < min_conf:
            decision["action"] = "HOLD"
            decision["reasoning"] = f"Blocked: confidence {confidence} < min_confidence {min_conf}"

        if action == "CLOSE_AND_REVERSE":
            if not open_position:
                decision["action"] = "HOLD"
                decision["reasoning"] = "Blocked: no open position to reverse"
            elif confidence < min_reverse_conf:
                decision["action"] = "HOLD"
                decision["reasoning"] = f"Blocked: reverse confidence {confidence} < {min_reverse_conf}"
            elif age_minutes < min_hold_minutes:
                decision["action"] = "HOLD"
                decision["reasoning"] = f"Blocked: minimum hold not reached ({age_minutes}m < {min_hold_minutes}m)"
            elif self.daily_limits["reversals"] >= max_reversals:
                decision["action"] = "HOLD"
                decision["reasoning"] = "Blocked: daily reversal limit reached"

        if action == "CLOSE" and open_position and age_minutes < max(2, min_hold_minutes // 2):
            if open_position.profit >= 0:
                decision["action"] = "HOLD"
                decision["reasoning"] = f"Blocked: closing too early ({age_minutes}m)"

        return decision

    async def _build_strategy_signal(
        self,
        state: str,
        symbol: str,
        account: dict,
        volatility: str,
        session: str,
        current_positions: int
    ) -> Optional[dict]:
        intervals_by_strategy = {
            "scalper": ["15", "5", "1"],
            "intraday": ["60", "15", "5"],
            "swing": ["D", "240", "60"]
        }
        intervals = intervals_by_strategy.get(state, ["15", "5", "1"])
        logger.info(f"Running {state.upper()} analysis for {symbol} with intervals {intervals}")

        chart_results = await self.chart_capture.capture_multiple_intervals(symbol, intervals)
        analysis = await self.ai_analyzer.analyze_with_context(symbol, account, chart_results, strategy=state)
        if not analysis or "error" in analysis:
            logger.error(f"Analysis failed for {symbol}: {analysis.get('error') if analysis else 'none'}")
            return None

        return {
            "strategy": state,
            "symbol": symbol,
            "direction": analysis.get("direction", "NEUTRAL"),
            "confidence": analysis.get("confidence", 0),
            "entry_price": analysis.get("entry_price"),
            "stop_loss": analysis.get("stop_loss"),
            "take_profit": analysis.get("take_profit"),
            "reasoning": analysis.get("reasoning", ""),
            "volatility": volatility,
            "session": session,
            "analysis": analysis,
            "current_positions": current_positions
        }

    async def ai_control_cycle(self, state: str, symbol: str, settings: dict, mt5_connected: bool = True) -> dict:
        """
        One full decision cycle with ProfitMaximizer registration
        """
        self._reset_daily_limits_if_needed()
        account = get_account_info()
        if not account:
            return {"status": "error", "reason": "account_unavailable"}

        open_positions = mt5.positions_get() or []
        mt5_symbol = resolve_mt5_symbol(symbol) or symbol
        symbol_positions = mt5.positions_get(symbol=mt5_symbol) or []
        open_position = symbol_positions[0] if symbol_positions else None
        current_positions = len(open_positions)

        volatility = self._get_market_volatility(mt5_symbol)
        session = self._get_trading_session()

        signal = await self._build_strategy_signal(state, symbol, account, volatility, session, current_positions)
        if not signal:
            return {"status": "hold", "reason": "no_signal"}

        position_payload = None
        if open_position:
            position_payload = {
                "ticket": open_position.ticket,
                "symbol": open_position.symbol,
                "side": "BUY" if open_position.type == mt5.ORDER_TYPE_BUY else "SELL",
                "volume": open_position.volume,
                "price_open": open_position.price_open,
                "profit": open_position.profit,
                "sl": open_position.sl,
                "tp": open_position.tp,
                "age_minutes": int((time.time() - open_position.time) / 60)
            }

        decision = await self.ai_analyzer.decide_trade_action(
            symbol=symbol,
            strategy=state,
            market_signal=signal,
            open_position=position_payload,
            account=account
        )

        # Fallback: when signal is strong and no position exists
        if not open_position and decision.get("action") == "HOLD":
            min_conf = int(settings.get("min_confidence", 70))
            signal_dir = str(signal.get("direction", "NEUTRAL")).upper()
            signal_conf = int(signal.get("confidence", 0))
            if signal_dir in ["BUY", "SELL"] and signal_conf >= min_conf:
                decision["action"] = f"OPEN_{signal_dir}"
                decision["confidence"] = max(int(decision.get("confidence", 0)), signal_conf)
                decision["reasoning"] = (
                    f"{decision.get('reasoning', '')} | Fallback override: strong market signal"
                ).strip(" |")

        decision = self._apply_governor_rules(decision, symbol, open_position, settings)

        execution = {
            "status": "hold",
            "action": decision.get("action"),
            "executed": False,
            "order_ticket": None,
            "closed_ticket": None,
            "decision_confidence": decision.get("confidence", 0),
            "reasoning": decision.get("reasoning", "")
        }

        if not mt5_connected:
            execution["status"] = "simulation_only"
            return {"signal": signal, "decision": decision, "execution": execution}

        action = decision.get("action")
        aggressive_mode = bool(settings.get("aggressive_mode", False))
        trades_per_signal = int(settings.get("trades_per_signal", 1))
        if aggressive_mode and trades_per_signal < 3:
            trades_per_signal = 3
        trades_per_signal = max(1, min(trades_per_signal, 10))

        if action in ["OPEN_BUY", "OPEN_SELL"]:
            side = "BUY" if action == "OPEN_BUY" else "SELL"
            if self._can_open_new_position(symbol, open_position, settings, current_positions=current_positions):
                lot = calculate_risk_based_lot(
                    symbol=symbol,
                    order_type=side,
                    stop_loss=signal.get("stop_loss"),
                    account_balance=account.get("balance", 0),
                    risk_percent=float(settings.get("risk_per_trade", 0.5))
                )
                if lot is not None:
                    order_tickets = []
                    max_positions = int(settings.get("max_positions", 1))
                    for i in range(trades_per_signal):
                        live_positions = mt5.positions_get() or []
                        if len(live_positions) >= max_positions:
                            logger.info(f"Burst stopped at cap: {len(live_positions)}/{max_positions}")
                            break

                        order_ticket = place_order(
                            symbol=symbol,
                            order_type=side,
                            volume=0.05,
                            sl=signal.get("stop_loss", 0),
                            tp=signal.get("take_profit", 0),
                            comment=f"AI_{state.upper()}_{decision.get('confidence', 0)}%_B{i+1}"
                        )
                        if order_ticket:
                            order_tickets.append(order_ticket)
                            self.last_entry_at[symbol] = time.time()
                            self.daily_limits["trades"] += 1
                            
                            # NEW: Register position with ProfitMaximizer
                            positions = mt5.positions_get(ticket=order_ticket)
                            if positions:
                                self.profit_maximizer.register_position(
                                    positions[0], 
                                    strategy=state,
                                    max_risk_r=3.0
                                )
                        else:
                            break

                    if order_tickets:
                        execution.update({
                            "status": "opened_burst" if len(order_tickets) > 1 else "opened",
                            "executed": True,
                            "order_ticket": order_tickets[0],
                            "order_tickets": order_tickets,
                            "orders_count": len(order_tickets)
                        })
                else:
                    execution["status"] = "blocked_invalid_lot_or_sl"
            else:
                execution["status"] = "blocked_by_position_or_cooldown"

        elif action == "CLOSE" and open_position:
            if close_position(open_position, reason="AI_CLOSE"):
                self.profit_maximizer.unregister_position(open_position.ticket)
                self.last_close_at[symbol] = time.time()
                execution.update({"status": "closed", "executed": True, "closed_ticket": open_position.ticket})
                self._update_streak_from_profit(open_position.profit)

        elif action == "CLOSE_AND_REVERSE" and open_position:
            reverse_to = decision.get("reverse_to")
            if reverse_to in ["BUY", "SELL"]:
                if close_position(open_position, reason=f"AI_REVERSE_TO_{reverse_to}"):
                    self.profit_maximizer.unregister_position(open_position.ticket)
                    self.last_close_at[symbol] = time.time()
                    self.daily_limits["reversals"] += 1
                    self._update_streak_from_profit(open_position.profit)
                    lot = calculate_risk_based_lot(
                        symbol=symbol,
                        order_type=reverse_to,
                        stop_loss=signal.get("stop_loss"),
                        account_balance=account.get("balance", 0),
                        risk_percent=float(settings.get("risk_per_trade", 0.5))
                    )
                    if lot is not None:
                        order_tickets = []
                        max_positions = int(settings.get("max_positions", 1))
                        for i in range(trades_per_signal):
                            live_positions = mt5.positions_get() or []
                            if len(live_positions) >= max_positions:
                                logger.info(f"Reverse burst stopped at cap: {len(live_positions)}/{max_positions}")
                                break

                            order_ticket = place_order(
                                symbol=symbol,
                                order_type=reverse_to,
                                volume=lot,
                                sl=signal.get("stop_loss", 0),
                                tp=signal.get("take_profit", 0),
                                comment=f"AI_REV_{state.upper()}_{decision.get('confidence', 0)}%_B{i+1}"
                            )
                            if order_ticket:
                                order_tickets.append(order_ticket)
                                self.last_entry_at[symbol] = time.time()
                                self.daily_limits["trades"] += 1
                                
                                # NEW: Register reversed position with ProfitMaximizer
                                positions = mt5.positions_get(ticket=order_ticket)
                                if positions:
                                    self.profit_maximizer.register_position(
                                        positions[0], 
                                        strategy=state,
                                        max_risk_r=3.0
                                    )
                            else:
                                break

                        if order_tickets:
                            execution.update({
                                "status": "reversed_burst" if len(order_tickets) > 1 else "reversed",
                                "executed": True,
                                "closed_ticket": open_position.ticket,
                                "order_ticket": order_tickets[0],
                                "order_tickets": order_tickets,
                                "orders_count": len(order_tickets)
                            })

        return {"signal": signal, "decision": decision, "execution": execution}

    async def manage_open_positions(self, symbol: str, settings: dict):
        """Enhanced position management using ProfitMaximizer"""
        resolved_symbol = resolve_mt5_symbol(symbol) or symbol
        positions = mt5.positions_get(symbol=resolved_symbol) or []
        
        for position in positions:
            tick = mt5.symbol_info_tick(position.symbol)
            if not tick:
                continue
            
            # Get executable price
            side = "BUY" if position.type == mt5.ORDER_TYPE_BUY else "SELL"
            current_price = tick.bid if side == "BUY" else tick.ask
            
            # Get management actions from ProfitMaximizer
            actions = self.profit_maximizer.manage_position(position, current_price)
            
            # Execute actions
            results = self.profit_maximizer.execute_actions(position, actions)
            
            # Log summary
            if results["summary"]:
                for summary in results["summary"]:
                    logger.info(f"📊 Position {position.ticket}: {summary}")
            
            # Log stats periodically
            stats = self.profit_maximizer.get_position_stats(position.ticket)
            if stats:
                logger.debug(f"Position {position.ticket} stats: "
                           f"Stage={stats['current_stage']}, "
                           f"Peak R={stats['highest_r']}, "
                           f"Active={stats['active_tiers']} tiers")
            
            # If AI exit is enabled, use it as secondary check
            if settings.get("enable_ai_exit") and not actions.get("close_all"):
                try:
                    ai_decision = await self.ai_analyzer.should_trail_stop(
                        position={
                            "symbol": position.symbol,
                            "side": side,
                            "entry_price": float(position.price_open),
                            "sl": float(position.sl or 0),
                            "tp": float(position.tp or 0),
                            "profit": float(position.profit or 0)
                        },
                        current_price=float(current_price),
                        market_volatility=self._get_market_volatility(position.symbol)
                    )
                    
                    # Only use AI for emergency closes
                    if ai_decision.get("action") == "CLOSE":
                        self.profit_maximizer._close_full(position)
                        logger.info(f"🤖 AI emergency close for position {position.ticket}")
                except Exception as e:
                    logger.debug(f"AI exit check skipped: {e}")

    def update_trade_history(self, trade_result: dict):
        """Update trade history with results"""
        self.trade_history.append(trade_result)

        if len(self.trade_history) > 100:
            self.trade_history = self.trade_history[-100:]

        if trade_result.get('profit', 0) > 0:
            self.consecutive_wins += 1
            self.consecutive_losses = 0
        else:
            self.consecutive_losses += 1
            self.consecutive_wins = 0

# ========== TELEGRAM NOTIFIER ==========
class TelegramNotifier:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.enabled = os.getenv("TELEGRAM_ENABLED", "false").lower() == "true"
        
        if self.enabled and (not self.bot_token or not self.chat_id):
            logger.warning("⚠️ Telegram enabled but missing token or chat_id")
            self.enabled = False
    
    def send_message(self, message: str, parse_mode: str = "HTML"):
        """Send a text message to Telegram"""
        if not self.enabled:
            return
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                "chat_id": self.chat_id,
                "text": message,
                "parse_mode": parse_mode
            }
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Telegram send failed: {response.text}")
        except Exception as e:
            logger.error(f"Telegram error: {e}")
    
    def send_photo(self, caption: str, photo_path: str):
        """Send a photo with caption"""
        if not self.enabled:
            return
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto"
            with open(photo_path, 'rb') as photo:
                files = {'photo': photo}
                data = {'chat_id': self.chat_id, 'caption': caption}
                response = requests.post(url, files=files, data=data, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"Telegram photo send failed: {response.text}")
        except Exception as e:
            logger.error(f"Telegram photo error: {e}")
    
    def send_signal_alert(self, signal: dict):
        """Format and send trading signal"""
        emoji = "🟢" if signal['direction'] == 'BUY' else "🔴" if signal['direction'] == 'SELL' else "⚪"
        
        message = f"""
{emoji} <b>TRADING SIGNAL</b> {emoji}

<b>Symbol:</b> {signal['symbol']}
<b>Direction:</b> {signal['direction']}
<b>Confidence:</b> {signal['confidence']}%
<b>Strategy:</b> {signal.get('strategy', 'N/A').upper()}
<b>Position Size:</b> {signal.get('position_size', 'N/A')} lots

<b>Entry:</b> {signal.get('entry', 'N/A')}
<b>Stop Loss:</b> {signal.get('stop_loss', 'N/A')}
<b>Take Profit:</b> {signal.get('take_profit', 'N/A')}

<b>Reasoning:</b> {signal.get('reasoning', 'N/A')[:200]}...

<b>Market:</b> {signal.get('volatility', 'N/A')} volatility | {signal.get('session', 'N/A')} session
"""
        self.send_message(message)
    
    def send_trade_execution(self, order_result: dict, signal: dict):
        """Send trade execution alert"""
        message = f"""
✅ <b>TRADE EXECUTED</b> ✅

<b>Symbol:</b> {signal['symbol']}
<b>Direction:</b> {signal['direction']}
<b>Volume:</b> {signal.get('position_size', 'N/A')} lots
<b>Order Ticket:</b> #{order_result}

<b>Entry:</b> {signal.get('entry', 'N/A')}
<b>Stop Loss:</b> {signal.get('stop_loss', 'N/A')}
<b>Take Profit:</b> {signal.get('take_profit', 'N/A')}

<b>Confidence:</b> {signal['confidence']}%
<b>Strategy:</b> {signal.get('strategy', 'N/A').upper()}
"""
        self.send_message(message)
    
    def send_position_update(self, position, action: str):
        """Send position management updates"""
        emoji = "📈" if action == "CLOSED_WIN" else "📉" if action == "CLOSED_LOSS" else "🔄"
        
        message = f"""
{emoji} <b>POSITION {action}</b> {emoji}

<b>Symbol:</b> {position.symbol}
<b>Type:</b> {'BUY' if position.type == mt5.ORDER_TYPE_BUY else 'SELL'}
<b>Volume:</b> {position.volume} lots
<b>Open Price:</b> {position.price_open}
<b>Current Price:</b> {position.price_current}
<b>Profit:</b> ${position.profit:.2f}

<b>Duration:</b> {(time.time() - position.time) / 60:.1f} minutes
"""
        self.send_message(message)
    
    def send_error_alert(self, error_msg: str, component: str):
        """Send error alerts"""
        message = f"""
❌ <b>ERROR ALERT - {component}</b> ❌

<code>{error_msg[:500]}</code>

<b>Time:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        self.send_message(message)
    
    def send_daily_summary(self, stats: dict):
        """Send end-of-day performance summary"""
        emoji = "📊"
        message = f"""
{emoji} <b>DAILY TRADING SUMMARY</b> {emoji}

<b>Date:</b> {datetime.now().strftime('%Y-%m-%d')}

<b>Trades Today:</b> {stats.get('total_trades', 0)}
<b>Winning Trades:</b> {stats.get('wins', 0)}
<b>Losing Trades:</b> {stats.get('losses', 0)}
<b>Win Rate:</b> {stats.get('win_rate', 0)}%

<b>Total P&L:</b> ${stats.get('total_pnl', 0):.2f}
<b>Best Trade:</b> ${stats.get('best_trade', 0):.2f}
<b>Worst Trade:</b> ${stats.get('worst_trade', 0):.2f}

<b>Current Balance:</b> ${stats.get('balance', 0):.2f}
<b>Open Positions:</b> {stats.get('open_positions', 0)}
"""
        self.send_message(message)

# ========== DATABASE OPERATIONS ==========
def get_bot_status():
    """Check if bot is running from bots table"""
    try:
        response = supabase.table("bots") \
            .select("*") \
            .eq("user_id", USER_ID) \
            .eq("status", "running") \
            .execute()
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to get bot status: {e}")
        return None

def update_bot_status(bot_id: str, status: str, error_message: str = None):
    """Update bot status in bot_status table"""
    try:
        status_map = {
            'running': 'idle',
            'analyzing': 'analyzing',
            'trading': 'trading',
            'error': 'error',
            'stopped': 'idle'
        }
        
        db_status = status_map.get(status, 'idle')
        
        response = supabase.table("bot_status") \
            .select("*") \
            .eq("bot_id", bot_id) \
            .execute()
        
        data = {
            "status": db_status,
            "last_check": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if error_message:
            data["error_message"] = error_message[:500]
        
        if response.data:
            supabase.table("bot_status") \
                .update(data) \
                .eq("bot_id", bot_id) \
                .execute()
        else:
            data["bot_id"] = bot_id
            data["created_at"] = datetime.now(timezone.utc).isoformat()
            supabase.table("bot_status").insert(data).execute()
            
    except Exception as e:
        logger.error(f"Failed to update bot status: {e}")

def save_ai_analysis(analysis: dict, trade_request_id: str = None) -> str:
    """Save AI analysis to database"""
    try:
        data = {
            "symbol": analysis.get("symbol"),
            "direction": analysis.get("direction", "NEUTRAL"),
            "confidence": analysis.get("confidence", 0),
            "entry_price": analysis.get("entry_price"),
            "stop_loss": analysis.get("stop_loss"),
            "take_profit": analysis.get("take_profit"),
            "reasoning": analysis.get("reasoning", ""),
            "key_levels": json.dumps(analysis.get("key_levels", {})),
            "indicators": json.dumps(analysis.get("indicators", {})),
            "risk_reward_ratio": analysis.get("risk_reward_ratio"),
            "chart_image_path": analysis.get("image_path"),
            "user_id": USER_ID
        }
        
        if trade_request_id:
            data["trade_request_id"] = trade_request_id
        
        response = supabase.table("ai_analyses").insert(data).execute()
        
        if response.data:
            analysis_id = response.data[0]["id"]
            logger.info(f"💾 Analysis saved to DB (ID: {analysis_id})")
            
            if trade_request_id:
                supabase.table("trade_requests") \
                    .update({
                        "ai_analysis_id": analysis_id,
                        "ai_confidence": analysis.get("confidence"),
                        "ai_direction": analysis.get("direction"),
                        "ai_metadata": json.dumps({
                            "entry": analysis.get("entry_price"),
                            "sl": analysis.get("stop_loss"),
                            "tp": analysis.get("take_profit")
                        })
                    }) \
                    .eq("id", trade_request_id) \
                    .execute()
            
            return analysis_id
    except Exception as e:
        logger.error(f"Failed to save AI analysis: {e}")
        return None

def get_auto_trade_settings():
    """Get auto-trade settings for user"""
    try:
        logger.debug(f"Fetching auto-trade settings...")
        default_settings = {
            "user_id": USER_ID,
            "enabled": False,
            "watchlist": ["XAUUSD"],
            "min_confidence": 72,
            "min_reverse_confidence": 85,
            "max_positions": 5,
            "one_position_only": False,
            "risk_per_trade": 0.5,
            "aggressive_mode": True,
            "trades_per_signal": 3,
            "atr_period": 14,
            "trail_multiplier": 2.0,
            "enable_ai_exit": True,
            "exit_style": "aggressive",
            "scan_interval_minutes": 5,
            "cooldown_minutes": 15,
            "min_hold_minutes": 12,
            "max_trades_per_day": 8,
            "max_reversals_per_day": 2,
            "max_consecutive_losses": 3,
            "trading_strategy": "scalper"
        }
        
        response = supabase.table("auto_trade_settings") \
            .select("*") \
            .eq("user_id", USER_ID) \
            .execute()
        
        if response.data and len(response.data) > 0:
            settings = response.data[0]
            for k, v in default_settings.items():
                if k not in settings or settings.get(k) is None:
                    settings[k] = v
            logger.info(f"📋 Auto-trade: {'ENABLED' if settings.get('enabled') else 'DISABLED'}")
            return settings
        else:
            logger.info("No settings found, creating defaults")
            default = default_settings
            
            insert_response = supabase.table("auto_trade_settings").insert(default).execute()
            
            if insert_response.data:
                logger.success("Created default auto-trade settings")
                return insert_response.data[0]
            else:
                return default
            
    except Exception as e:
        logger.error(f"Error getting auto-trade settings: {e}")
        return default_settings

def log_market_scan(symbol: str, direction: str, confidence: int, action_taken: bool = False, analysis_id: str = None):
    """Log market scan results"""
    try:
        data = {
            "user_id": USER_ID,
            "symbol": symbol,
            "direction": direction,
            "confidence": confidence,
            "action_taken": action_taken,
            "scan_time": datetime.now(timezone.utc).isoformat()
        }
        
        if analysis_id:
            data["metadata"] = json.dumps({"analysis_id": analysis_id})
        
        supabase.table("market_scans").insert(data).execute()
        logger.debug(f"📝 Scan logged for {symbol}")
    except Exception as e:
        logger.error(f"Failed to log market scan: {e}")

# ========== DATABASE ACCESS TEST FUNCTION ==========
async def test_database_access():
    """Test access to all Supabase tables and report status"""
    
    logger.info("=" * 60)
    logger.info("TESTING DATABASE ACCESS")
    logger.info("=" * 60)
    
    tables = [
        "bots", "bot_commands", "bot_status", "trade_requests",
        "ai_analyses", "auto_trade_settings", "market_scans",
        "news_events", "user_profiles"
    ]
    
    results = {"success": [], "failed": []}
    
    for table in tables:
        try:
            logger.info(f"Testing access to {table}...")
            select_test = supabase.table(table).select("*").limit(1).execute()
            logger.debug(f"  ✓ SELECT successful")
            results["success"].append(table)
            logger.success(f"  ✅ {table}: ACCESS OK")
        except Exception as e:
            results["failed"].append(table)
            logger.error(f"  ❌ {table}: ACCESS FAILED - {e}")
    
    logger.info("=" * 60)
    logger.info(f"SUMMARY: {len(results['success'])}/{len(tables)} tables accessible")
    logger.info("=" * 60)
    
    return results

# ========== MAIN LOOP ==========
async def main_loop():
    """Main bot execution loop"""
    logger.info("🚀 Starting AI Quant Bot with ProfitMaximizer...")
    
    # Run database access test
    await test_database_access()
    
    # Initialize components
    mt5_connected = False
    try:
        mt5_connect()
        mt5_connected = True
    except Exception as e:
        logger.error(f"MT5 connection failed: {e}")
        logger.warning("Continuing in analysis-only mode")
    
    telegram = TelegramNotifier()
    if telegram.enabled:
        telegram.send_message("🤖 <b>AI Quant Bot Started</b>\n\nProfitMaximizer active - monitoring markets...")
     
    chart_capture = ChartCapture()
    ai_analyzer = AIAnalyzer()
    gradual_trader = GradualTrader(ai_analyzer, chart_capture)
   
    hft_bot = IntegratedHFTBot(gradual_trader, chart_capture, ai_analyzer)
    last_scan_time = {}
    bot_id = None
    
    while True:
        try:
            # Check if bot should be running
            bot = get_bot_status()
            
            if bot and bot.get("status") == "running":
                bot_id = bot["id"]
                
                if not last_scan_time.get('bot_started'):
                    logger.info(f"✅ Bot {bot_id} is running")
                    last_scan_time['bot_started'] = time.time()
                    
                # Get settings
                settings = get_auto_trade_settings()
                
                if settings and settings.get('enabled'):
                    now = time.time()
                    last_scan = last_scan_time.get('auto', 0)
                    interval = int(settings.get("scan_interval_minutes", 5)) * 60
                    
                    logger.debug(f"Checking scan interval: {now - last_scan:.2f}s elapsed, interval is {interval}s")
                    
                    if now - last_scan >= interval:
                        logger.info("\n" + "=" * 70)
                        logger.info(" RUNNING MULTI-TIMEFRAME MARKET SCAN")
                        logger.info("=" * 70)
                        
                        try:
                            update_bot_status(bot_id, "analyzing")
                        except:
                            pass
                        
                        for symbol in settings.get('watchlist', ['XAUUSD']):
                            try:
                                logger.info(f"\n{'─' * 50}")
                                logger.info(f"📈 Analyzing {symbol}")
                                logger.info(f"{'─' * 50}")
                                
                                strategy = settings.get('trading_strategy', 'scalper')
                                cycle = await hft_bot.run_cycle(
                                    state=strategy,
                                    symbol=symbol,
                                    settings=settings,
                                    mt5_connected=mt5_connected
                                )

                                signal = cycle.get("signal", {})
                                decision = cycle.get("decision", {})
                                execution = cycle.get("execution", {})
                                direction = signal.get("direction", "NEUTRAL")
                                confidence = signal.get("confidence", 0)

                                analysis_id = None
                                if signal:
                                    analysis_id = save_ai_analysis(signal.get("analysis", signal))
                                    log_market_scan(
                                        symbol=symbol,
                                        direction=direction,
                                        confidence=confidence,
                                        action_taken=bool(execution.get("executed")),
                                        analysis_id=analysis_id
                                    )

                                logger.info(
                                    f"AI action={decision.get('action', 'HOLD')} "
                                    f"conf={decision.get('confidence', 0)} "
                                    f"exec={execution.get('status', 'hold')}"
                                )

                                if execution.get("executed"):
                                    try:
                                        update_bot_status(bot_id, "trading")
                                    except:
                                        pass
                                else:
                                    logger.info(f"No trade execution for {symbol}: {execution.get('status', 'hold')}")
                                
                                # Delay between symbols
                                await asyncio.sleep(5)
                                
                            except Exception as e:
                                logger.error(f"Error scanning {symbol}: {e}")
                                continue
                        
                        last_scan_time['auto'] = now
                        
                        # Cleanup old screenshots
                        chart_capture.cleanup_old_screenshots()
                        
                        try:
                            update_bot_status(bot_id, "idle")
                        except:
                            pass
                        
                        logger.info("\n" + "=" * 70)
                        logger.info("✅ Scan cycle complete")
                        logger.info("=" * 70)
                
                # Fast position management every CHECK_INTERVAL using ProfitMaximizer
                if mt5_connected and settings and settings.get('enabled'):
                    for symbol in settings.get('watchlist', ['XAUUSD']):
                        try:
                            await gradual_trader.manage_open_positions(symbol=symbol, settings=settings)
                        except Exception as e:
                            logger.error(f"Position management error for {symbol}: {e}")
            else:
                if bot_id and last_scan_time.get('bot_started'):
                    logger.info("⏸️ Bot stopped")
                    try:
                        update_bot_status(bot_id, "idle")
                    except:
                        pass
                    last_scan_time['bot_started'] = None
            
            await asyncio.sleep(CHECK_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("👋 Bot stopped by user")
            if bot_id:
                try:
                    update_bot_status(bot_id, "idle")
                except:
                    pass
            break
            
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
            if bot_id:
                try:
                    update_bot_status(bot_id, "error", str(e))
                except:
                    pass
            await asyncio.sleep(30)

async def startup():
    """Run startup sequence"""
    await test_database_access()
    await main_loop()

if __name__ == "__main__":
    try:
        asyncio.run(startup())
    except KeyboardInterrupt:
        logger.info("👋 Bot stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        try:
            mt5.shutdown()
            logger.info("MT5 connection closed")
        except Exception as e:
            logger.error(f"Failed to close MT5 connection: {e}")