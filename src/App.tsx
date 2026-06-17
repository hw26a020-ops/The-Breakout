import { useState, useEffect } from 'react';
import { GameStats, GameSettings, VisualTheme } from './types';
import { GameBoard } from './components/GameBoard';
import { LEVELS } from './levels';
import { playSound } from './utils/sound';
import { Play, Volume2, VolumeX, Shield, Award, HelpCircle, Flame, Sparkles, BookOpen, ChevronRight, Zap } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'MENU' | 'LEVEL_SELECT' | 'GAME' | 'TUTORIAL'>('MENU');
  
  // Game settings state
  const [settings, setSettings] = useState<GameSettings>({
    muted: false,
    vibration: true,
    theme: 'neon-retro',
    ballSpeedFactor: 1.0,
  });

  // Game stats state
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    level: 1,
    lives: 3,
    bricksCleared: 0,
    hasShield: false,
    multiplier: 1,
    maxMultiplier: 1,
    comboTimer: 0,
  });

  // Main game state (controlled in GameBoard, mapped here)
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVELCLEAR' | 'COMPLETED'>('START');

  // Load HighScore on mount
  useEffect(() => {
    try {
      const savedScore = localStorage.getItem('brick_breaker_high_score');
      if (savedScore) {
        const hsValue = parseInt(savedScore, 10);
        setStats((prev) => ({ ...prev, highScore: hsValue }));
      }
    } catch (e) {
      console.warn('Could not read high score from local storage', e);
    }
  }, []);

  // Persist HighScore when score exceeds it
  useEffect(() => {
    if (stats.score > stats.highScore) {
      setStats((prev) => ({ ...prev, highScore: prev.score }));
      try {
        localStorage.setItem('brick_breaker_high_score', stats.score.toString());
      } catch (e) {
        console.warn('Could not save high score to local storage', e);
      }
    }
  }, [stats.score, stats.highScore]);

  // Handle Level Starting
  const handleStartGame = (startingLvl: number) => {
    playSound.vibrate(settings.vibration, 85);
    playSound.powerup(settings.muted);

    setStats((prev) => ({
      ...prev,
      score: 0,
      level: startingLvl,
      lives: 3,
      bricksCleared: 0,
      hasShield: false,
      multiplier: 1,
      maxMultiplier: 1,
      comboTimer: 0,
    }));

    setGameState('PLAYING');
    setView('GAME');
  };

  const currentThemeConfigs = {
    'neon-retro': {
      outerBg: 'bg-[#05040a]',
      cardBg: 'bg-[#0f0e21]/70',
      border: 'border-pink-500/30',
      textAccent: 'text-pink-500',
      glow: 'shadow-[0_0_15px_rgba(255,0,127,0.15)]',
      gradientBtn: 'from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] text-white',
    },
    'cyberpunk': {
      outerBg: 'bg-[#020104]',
      cardBg: 'bg-[#0c0a17]/80',
      border: 'border-yellow-500/30',
      textAccent: 'text-yellow-400',
      glow: 'shadow-[0_0_15px_rgba(249,255,0,0.1)]',
      gradientBtn: 'from-yellow-500 to-purple-600 hover:from-yellow-400 hover:to-purple-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] text-black font-black',
    },
    'classic-slate': {
      outerBg: 'bg-slate-950',
      cardBg: 'bg-slate-900/80',
      border: 'border-slate-700/60',
      textAccent: 'text-sky-400',
      glow: 'shadow-[0_0_10px_rgba(56,189,248,0.05)]',
      gradientBtn: 'from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.35)] text-white',
    },
    'magma': {
      outerBg: 'bg-[#050101]',
      cardBg: 'bg-[#1a0808]/75',
      border: 'border-red-600/30',
      textAccent: 'text-red-500',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.12)]',
      gradientBtn: 'from-red-600 to-amber-655 hover:from-red-500 hover:to-amber-550 shadow-[0_0_15px_rgba(239,68,68,0.45)] text-white',
    },
  }[settings.theme];

  return (
    <div className={`min-h-screen ${currentThemeConfigs.outerBg} text-slate-100 flex flex-col items-center justify-center p-4 transition-colors duration-500 font-sans`}>
      
      {/* Background Visual Grid Ambient Layer (purely aesthetic CSS) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {view === 'MENU' && (
        <div className={`w-full max-w-md ${currentThemeConfigs.cardBg} ${currentThemeConfigs.glow} border ${currentThemeConfigs.border} rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden z-10 transition-all duration-300`}>
          
          {/* Glowing Top Ambient Header */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400" />
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-[10px] text-cyan-400 font-semibold tracking-wider uppercase mb-3">
              <Sparkles size={11} className="animate-spin-slow" /> Retro Arcade Experience
            </div>
            
            <div className="flex justify-center mb-4">
              <img
                src="/title.png"
                alt="ブロック崩し"
                className="max-h-64 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
              爽快な破壊エフェクトとパワーアップアイテムを搭載したレトロSFスタイルの本格ブロック崩し。
            </p>
          </div>

          {/* Core Menu Action Panels */}
          <div className="space-y-3.5 mb-8">
            <button
              onClick={() => handleStartGame(1)}
              className={`w-full py-3.5 px-5 rounded-xl bg-gradient-to-r ${currentThemeConfigs.gradientBtn} font-black tracking-widest text-sm flex items-center justify-center gap-2 transition duration-200 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0`}
              id="menu_play_now"
            >
              <Play size={16} fill="currentColor" /> PLAY
            </button>

            <button
              onClick={() => setView('LEVEL_SELECT')}
              className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 font-semibold text-xs tracking-wider transition flex items-center justify-between"
              id="menu_level_select"
            >
              <span className="flex items-center gap-1.5"><Zap size={14} className="text-yellow-400" /> ステージ選択</span>
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => setView('TUTORIAL')}
              className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 font-semibold text-xs tracking-wider transition flex items-center justify-between"
              id="menu_tutorial"
            >
              <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-green-400" /> 遊び方 & アイテム詳細</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Quick Realtime Settings in Home Menu */}
          <div className="border-t border-slate-800/80 pt-5 space-y-4">
            <h3 className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Quick Customizations</h3>
            
            {/* Speed Adjuster */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1"><Flame size={12} className="text-orange-500 animate-pulse" /> ボール速度 (BALL SPEED):</span>
              <div className="flex bg-slate-900 p-0.5 rounded-md border border-slate-800">
                {[
                  { label: '遅い', factor: 0.8 },
                  { label: '標準', factor: 1.0 },
                  { label: '速い', factor: 1.25 }
                ].map((s) => (
                  <button
                    key={s.factor}
                    onClick={() => setSettings((prev) => ({ ...prev, ballSpeedFactor: s.factor }))}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                      settings.ballSpeedFactor === s.factor 
                        ? 'bg-slate-800 text-white shadow' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual themes indicator */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">ビジュアルテーマ (THEME):</span>
              <select
                value={settings.theme}
                onChange={(e) => setSettings((p) => ({ ...p, theme: e.target.value as VisualTheme }))}
                className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded text-[11px] font-medium"
              >
                <option value="neon-retro">ネオン・レトロ</option>
                <option value="cyberpunk">サイバーパンク</option>
                <option value="classic-slate">クラシック・スレート</option>
                <option value="magma">マグマ</option>
              </select>
            </div>

            {/* Mute vibration options */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">ゲーム音声 & 効果音:</span>
              <button
                onClick={() => setSettings((p) => ({ ...p, muted: !p.muted }))}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-right"
              >
                {settings.muted ? (
                  <>
                    <VolumeX size={12} className="text-red-400" />
                    <span>消音中 (MUTED)</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={12} className="text-emerald-400" />
                    <span>音声オン (PLAY)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* High Score Floating Footer */}
          <div className="bg-slate-950/60 rounded-xl p-3 mt-6 flex items-center justify-between border border-slate-850">
            <div className="flex items-center gap-1.5">
              <Award size={15} className="text-yellow-400" />
              <span className="text-[10px] text-slate-400 tracking-wider">PERSONAL BEST:</span>
            </div>
            <div className="font-mono text-xs font-black text-yellow-400">{stats.highScore} PTS</div>
          </div>

        </div>
      )}

      {view === 'LEVEL_SELECT' && (
        <div className={`w-full max-w-xl ${currentThemeConfigs.cardBg} ${currentThemeConfigs.glow} border ${currentThemeConfigs.border} rounded-2xl p-6 md:p-8 backdrop-blur-md relative z-10 animate-fade-in`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <Zap size={18} className="text-yellow-400 animate-pulse" /> ステージ選択
            </h2>
            <button
              onClick={() => setView('MENU')}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800"
            >
              戻る
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-6">好きな開始ステージを選択可能。難易度が大幅に向上します。</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
            {LEVELS.map((lvl, index) => {
              const num = index + 1;
              return (
                <button
                  key={num}
                  onClick={() => handleStartGame(num)}
                  className="p-4 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 hover:border-slate-700 transition duration-150 text-left flex items-start gap-3.5 group cursor-pointer w-full"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-850 text-pink-400 font-bold font-mono text-sm flex items-center justify-center shrink-0 border border-slate-700 group-hover:bg-pink-500 group-hover:text-white group-hover:border-pink-400 transition">
                    #{num}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-200 group-hover:text-white transition truncate">
                      {lvl.name}
                    </h3>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-sans line-clamp-2">
                      {lvl.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center font-mono text-[10px] text-slate-500">
            全5ステージクリアを達成し、最高記録を樹立せよ。
          </div>
        </div>
      )}

      {view === 'TUTORIAL' && (
        <div className={`w-full max-w-xl ${currentThemeConfigs.cardBg} ${currentThemeConfigs.glow} border ${currentThemeConfigs.border} rounded-2xl p-6 md:p-8 backdrop-blur-md relative z-10 overflow-hidden`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-1.5">
              <HelpCircle size={18} className="text-green-400" /> ルール説明 & 攻略
            </h2>
            <button
              onClick={() => setView('MENU')}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800"
            >
              戻る
            </button>
          </div>

          <div className="space-y-5 text-xs text-slate-300 leading-relaxed max-h-[460px] overflow-y-auto pr-2">
            
            {/* Guide segment */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> 基本ルール</h3>
              <p className="text-slate-400">
                パドルを操作してボールを跳ね返し、ステージ上のすべての壊せるブロックを破壊してクリアを目指します。ボールを落下させてしまうとライフが減少します。
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-400" /> コンボマルチプライヤー</h3>
              <p className="text-slate-400">
                ボールが連続してブロックを壊すと<span className="text-yellow-400 font-bold">コンボ(マルチプライヤー)</span>が増加し、獲得スコアが増えます。パドルに触れるか時間経過すると、マルチプライヤーはリセットされます。
              </p>
            </div>

            {/* Bricks lexicon */}
            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="font-bold text-slate-200 text-xs mb-2">特殊ブロックの種類:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2">
                  <div className="w-6 h-4 bg-gradient-to-r from-red-500 to-amber-500 rounded border border-white animate-pulse" />
                  <div>
                    <div className="font-bold text-[10px]">爆発ブロック</div>
                    <div className="text-[9px] text-slate-500 font-sans">周囲を爆風で破壊</div>
                  </div>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2">
                  <div className="w-6 h-4 bg-slate-700 rounded border border-slate-500 flex items-center justify-center text-[7px]" />
                  <div>
                    <div className="font-bold text-[10px]">メタルブロック</div>
                    <div className="text-[9px] text-slate-500 font-sans">破壊不可能（反射）</div>
                  </div>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2">
                  <div className="w-6 h-4 bg-purple-650 rounded border border-purple-400" />
                  <div>
                    <div className="font-bold text-[10px]">強固ブロック</div>
                    <div className="text-[9px] text-slate-500 font-sans">複数回衝突で破壊可能</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Item lexicon */}
            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h3 className="font-bold text-slate-200 text-xs mb-2 text-[#00f0ff] flex items-center gap-1">🚀 パワーアップアイテム (有利効果):</h3>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                  <div className="w-6 h-6 rounded-full bg-cyan-400 text-black font-black flex items-center justify-center text-[9px] shrink-0">×3</div>
                  <div>
                    <div className="font-bold text-slate-200">マルチボール</div>
                    <div className="text-slate-500">ボールが3つに分裂します。</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-black font-black flex items-center justify-center text-xs shrink-0">＋</div>
                  <div>
                    <div className="font-bold text-slate-200">パドル拡大</div>
                    <div className="text-slate-500">パドルの幅が広く変化します。</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                  <div className="w-6 h-6 rounded-full bg-red-500 text-black font-black flex items-center justify-center text-[8px] shrink-0">▲</div>
                  <div>
                    <div className="font-bold text-slate-200">レーザーキャノン</div>
                    <div className="text-slate-500">自動で連射するほか、スペースキーまたはクリックで追加発射します。</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 text-black font-black flex items-center justify-center text-xs shrink-0">★</div>
                  <div>
                    <div className="font-bold text-slate-200">スタッキー</div>
                    <div className="text-slate-500">パドルにボールが一時的に吸着します。</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                  <div className="w-6 h-6 rounded-full bg-teal-400 text-black font-black flex items-center justify-center text-xs shrink-0">🛡</div>
                  <div>
                    <div className="font-bold text-slate-200">シールドバリア</div>
                    <div className="text-slate-500">画面最下部に一度だけ跳ね返すバリアを展開。</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-black font-black flex items-center justify-center text-xs shrink-0">▼</div>
                  <div>
                    <div className="font-bold text-slate-200">スローボール</div>
                    <div className="text-slate-500">ボールの速度が低減し、跳ね返えしやすくなります。</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Debuff lexicon */}
            <div className="space-y-2 border-t border-slate-800/80 pt-4" id="debuff_lexicon">
              <h3 className="font-bold text-slate-200 text-xs mb-2 text-rose-450 flex items-center gap-1">⚠️ デバフ・障害アイテム (不利効果):</h3>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-black font-black flex items-center justify-center text-xs shrink-0">－</div>
                  <div>
                    <div className="font-bold text-rose-300">パドル縮小</div>
                    <div className="text-slate-500">パドルの幅が狭くなり、ボールを落としやすくなります。</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                  <div className="w-6 h-6 rounded-full bg-[#e300ff] text-black font-black flex items-center justify-center text-[10px] shrink-0">▲</div>
                  <div>
                    <div className="font-bold text-rose-300">スピードアップ</div>
                    <div className="text-slate-500">ボールの速度が上がり、跳ね返しの反応難易度が上昇します。</div>
                  </div>
                </div>
              </div>
            </div>



          </div>

          <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
            <button
              onClick={() => setView('MENU')}
              className="px-6 py-2 bg-slate-850 hover:bg-slate-800 text-xs font-bold text-white rounded-lg transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {view === 'GAME' && (
        <GameBoard
          settings={settings}
          setSettings={setSettings}
          stats={stats}
          setStats={setStats}
          gameState={gameState}
          setGameState={setGameState}
          onGoBack={() => {
            setView('MENU');
            setGameState('START');
          }}
        />
      )}

      {/* Retro Footnote */}
      {view !== 'GAME' && (
        <div className="mt-6 text-center text-[10px] text-slate-500 font-mono tracking-widest z-10">
          © 2026 BRICK BREAKER CLASSIC • ARCADE SENSATION
        </div>
      )}
    </div>
  );
}
