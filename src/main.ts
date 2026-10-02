import './style.css';
import type { TierConfig, TierId, TierResult, DailyGameData } from './types';
import { createPRNG, hashString, getTodayDateStr, getDayNumber, getTimeUntilNextDaily, generateStalinArray } from './prng';
import { runStalinSortSimulation, toTierResult } from './stalinSort';
import type { StalinSortSimulation } from './stalinSort';
import { sound } from './audio';
import { ParticleSystem } from './particles';
import { StalinRenderer } from './renderer';
import { getRankForSurvivors, RANKS } from './ranks';
import {
  getOrCreatePlayerId,
  saveSettings,
  loadTodayGame,
  saveDailyGame,
  loadStats,
} from './storage';

// 3 Echelons: 10, 50, 100 with fixed deliberate pace
const TIERS: TierConfig[] = [
  {
    id: 'squad',
    name: 'The Squad',
    russianName: 'ОТДЕЛЕНИЕ',
    size: 10,
    icon: '🪖',
    color: '#06d6a0',
    description: '10 comrades in inspection line',
    stepDelayMs: 250, // Deliberate and suspenseful
  },
  {
    id: 'platoon',
    name: 'The Platoon',
    russianName: 'ВЗВОД',
    size: 50,
    icon: '🎖️',
    color: '#ffd166',
    description: '50 comrades under tactical review',
    stepDelayMs: 80,
  },
  {
    id: 'company',
    name: 'The Company',
    russianName: 'РОТА',
    size: 100,
    icon: '⭐',
    color: '#e63946',
    description: '100 comrades in mass tribunal',
    stepDelayMs: 45,
  },
];

class StalindleGame {
  private particleSystem: ParticleSystem;
  private renderer!: StalinRenderer;

  // Active game state
  private activeTierId: TierId = 'squad';
  private isSorting: boolean = false;
  private todayGame: DailyGameData | null = null;
  private tierArrays: Record<TierId, number[]> = { squad: [], platoon: [], company: [] };
  private tierSims: Record<TierId, StalinSortSimulation | null> = { squad: null, platoon: null, company: null };
  private completedTierResults: Record<TierId, TierResult | null> = { squad: null, platoon: null, company: null };

  // Active step
  private currentStep: number = 0;
  private animRunning: boolean = false;

  // DOM Elements
  private canvas!: HTMLCanvasElement;
  private canvasOverlay!: HTMLElement;
  private overlayTitle!: HTMLElement;
  private overlayDesc!: HTMLElement;
  private overlayBtnText!: HTMLElement;
  private btnLaunchOverlay!: HTMLButtonElement;
  private btnMainAction!: HTMLButtonElement;
  private mainActionText!: HTMLElement;

  // Telemetry elements
  private valSurvivors!: HTMLElement;
  private subSurvivors!: HTMLElement;
  private valPurged!: HTMLElement;
  private subPurged!: HTMLElement;
  private canvasTitleText!: HTMLElement;
  private commandEchelonBadge!: HTMLElement;
  private commandTipText!: HTMLElement;

  // Modals
  private modalTribunal!: HTMLElement;
  private modalHowToPlay!: HTMLElement;
  private modalStats!: HTMLElement;
  private toastEl!: HTMLElement;

  constructor() {
    this.particleSystem = new ParticleSystem();

    this.initDOMElements();
    this.initRenderer();
    this.initEventListeners();
    this.applySettings();
    this.startCountdownLoop();

    // Check today's game
    this.updateHeaderInfo();
    this.initDailyGameSession();

    // Start continuous render loop for falling bars and celebration particles
    this.startContinuousRenderLoop();
  }

  private initDOMElements() {
    this.canvas = document.getElementById('sortCanvas') as HTMLCanvasElement;
    this.canvasOverlay = document.getElementById('canvasOverlay')!;
    this.overlayTitle = document.getElementById('overlayTitle')!;
    this.overlayDesc = document.getElementById('overlayDesc')!;
    this.overlayBtnText = document.getElementById('overlayBtnText')!;
    this.btnLaunchOverlay = document.getElementById('btnLaunchOverlay') as HTMLButtonElement;
    this.btnMainAction = document.getElementById('btnMainAction') as HTMLButtonElement;
    this.mainActionText = document.getElementById('mainActionText')!;

    this.valSurvivors = document.getElementById('valSurvivors')!;
    this.subSurvivors = document.getElementById('subSurvivors')!;
    this.valPurged = document.getElementById('valPurged')!;
    this.subPurged = document.getElementById('subPurged')!;
    this.canvasTitleText = document.getElementById('canvasTitleText')!;
    this.commandEchelonBadge = document.getElementById('commandEchelonBadge')!;
    this.commandTipText = document.getElementById('commandTipText')!;

    this.modalTribunal = document.getElementById('modalTribunal')!;
    this.modalHowToPlay = document.getElementById('modalHowToPlay')!;
    this.modalStats = document.getElementById('modalStats')!;
    this.toastEl = document.getElementById('toast')!;
  }

  private initRenderer() {
    this.renderer = new StalinRenderer(this.canvas, this.particleSystem);
  }

  private updateHeaderInfo() {
    const today = getTodayDateStr();
    const dayNum = getDayNumber(today);
    const dayBadgeText = document.getElementById('dailyNumberText');
    const dayDateText = document.getElementById('dailyDateText');
    if (dayBadgeText) dayBadgeText.textContent = `#${dayNum}`;
    if (dayDateText) dayDateText.textContent = today;
  }

  private applySettings() {
    const soundIcon = document.getElementById('soundIcon');
    if (soundIcon) {
      soundIcon.textContent = sound.isMuted() ? '🔇' : '🔊';
    }
  }

  // Initialize or restore today's official single-attempt session
  private initDailyGameSession() {
    const today = getTodayDateStr();
    const playerId = getOrCreatePlayerId();
    const baseSeedStr = `stalindle-daily-${today}-${playerId}`;
    const seed = hashString(baseSeedStr);
    const rng = createPRNG(seed);

    this.todayGame = loadTodayGame(today);

    // Initialize deterministic arrays
    const defaultArrays = {
      squad: generateStalinArray(10, rng),
      platoon: generateStalinArray(50, rng),
      company: generateStalinArray(100, rng),
    };

    if (this.todayGame) {
      // Check if todayGame has valid current initialArrays
      if (this.todayGame.initialArrays && this.todayGame.initialArrays.squad) {
        this.tierArrays = this.todayGame.initialArrays;
      } else {
        this.tierArrays = defaultArrays;
        this.todayGame.initialArrays = this.tierArrays;
      }

      // Restore completed results
      if (Array.isArray(this.todayGame.tierResults)) {
        this.todayGame.tierResults.forEach((tr) => {
          if (tr && (tr.tierId === 'squad' || tr.tierId === 'platoon' || tr.tierId === 'company')) {
            this.completedTierResults[tr.tierId] = tr;
            if (tr.initialArray && tr.initialArray.length === TIERS.find(t => t.id === tr.tierId)?.size) {
              this.tierArrays[tr.tierId] = tr.initialArray;
            }
          }
        });
      }

      this.tierSims = {
        squad: runStalinSortSimulation('squad', this.tierArrays.squad),
        platoon: runStalinSortSimulation('platoon', this.tierArrays.platoon),
        company: runStalinSortSimulation('company', this.tierArrays.company),
      };

      if (this.todayGame.completed && this.completedTierResults.squad && this.completedTierResults.platoon && this.completedTierResults.company) {
        // Player has ALREADY completed today's game!
        // Immediately show the result page as requested:
        this.setActiveTier('company');
        this.updateTierTabsUI();
        this.mainActionText.textContent = 'VIEW TRIBUNAL REPORT';
        this.commandTipText.textContent = 'Today’s official purge is complete. Review results below.';
        this.canvasOverlay.classList.add('hidden');

        setTimeout(() => {
          this.openTribunalModal(this.todayGame!);
        }, 150);
        return;
      } else {
        // Resume from where player left off today
        if (this.completedTierResults.squad === null) {
          this.setActiveTier('squad');
        } else if (this.completedTierResults.platoon === null) {
          this.setActiveTier('platoon');
        } else {
          this.setActiveTier('company');
        }
      }
    } else {
      // First visit today! Lock in today's unique deterministic arrays
      this.tierArrays = defaultArrays;
      this.tierSims = {
        squad: runStalinSortSimulation('squad', this.tierArrays.squad),
        platoon: runStalinSortSimulation('platoon', this.tierArrays.platoon),
        company: runStalinSortSimulation('company', this.tierArrays.company),
      };

      const initialGameData: DailyGameData = {
        dateStr: today,
        dayNumber: getDayNumber(today),
        completed: false,
        tierResults: [],
        totalSurvivors: 0,
        totalPurged: 0,
        totalElements: 160,
        totalSurvivalRate: 0,
        rank: getRankForSurvivors(0),
        completedAt: 0,
        seed,
        initialArrays: this.tierArrays,
      };
      saveDailyGame(initialGameData);
      this.todayGame = initialGameData;

      this.setActiveTier('squad');
    }
  }

  private initEventListeners() {
    // Echelon tab buttons
    TIERS.forEach((tier) => {
      const btn = document.getElementById(`tierBtn-${tier.id}`);
      btn?.addEventListener('click', () => {
        if (this.isSorting) return;
        const isUnlocked = this.isTierUnlocked(tier.id);
        if (isUnlocked) {
          this.setActiveTier(tier.id);
        }
      });
    });

    // Launch action buttons
    this.btnLaunchOverlay.addEventListener('click', () => this.handleActionClick());
    this.btnMainAction.addEventListener('click', () => this.handleActionClick());

    // Header buttons
    document.getElementById('btnHowToPlay')?.addEventListener('click', () => {
      this.openModal(this.modalHowToPlay);
    });

    document.getElementById('btnStats')?.addEventListener('click', () => {
      this.renderStatsModal();
      this.openModal(this.modalStats);
    });

    document.getElementById('btnSound')?.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      saveSettings({ soundEnabled: !isMuted });
      const icon = document.getElementById('soundIcon');
      if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
      this.showToast(isMuted ? 'AUDIO SILENCED' : 'AUDIO ACTIVE');
    });

    // Modal Close buttons
    document.getElementById('closeTribunalBtn')?.addEventListener('click', () => this.closeModal(this.modalTribunal));
    document.getElementById('closeHowToBtn')?.addEventListener('click', () => this.closeModal(this.modalHowToPlay));
    document.getElementById('closeStatsBtn')?.addEventListener('click', () => this.closeModal(this.modalStats));

    // Share button
    document.getElementById('btnShareDispatch')?.addEventListener('click', () => this.copyShareDispatch());

    // Close modal on backdrop click
    [this.modalTribunal, this.modalHowToPlay, this.modalStats].forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal(this.modalTribunal);
        this.closeModal(this.modalHowToPlay);
        this.closeModal(this.modalStats);
      }
    });
  }

  private isTierUnlocked(tierId: TierId): boolean {
    if (this.todayGame && this.todayGame.completed) return true;
    if (tierId === 'squad') return true;
    if (tierId === 'platoon') return this.completedTierResults.squad !== null;
    if (tierId === 'company') return this.completedTierResults.platoon !== null;
    return false;
  }

  // Switch active echelon
  private setActiveTier(tierId: TierId) {
    this.activeTierId = tierId;
    const tierConfig = TIERS.find((t) => t.id === tierId)!;
    const tierResult = this.completedTierResults[tierId];

    this.updateTierTabsUI();
    this.canvasTitleText.textContent = `RADAR TRIBUNAL: ${tierConfig.name.toUpperCase()} (${tierConfig.size} ELEMENTS)`;

    const tierIndex = TIERS.findIndex((t) => t.id === tierId);
    this.commandEchelonBadge.textContent = `ECHELON ${tierIndex + 1} / 3`;

    if (tierResult) {
      // Completed echelon view
      this.canvasOverlay.classList.add('hidden');
      this.currentStep = tierConfig.size;
      this.updateTelemetry(tierConfig.size, tierResult.survivors, tierResult.purged);

      if (this.todayGame && this.todayGame.completed) {
        this.mainActionText.textContent = 'VIEW TRIBUNAL REPORT';
        this.commandTipText.textContent = 'Purge completed today. Click to view results.';
      } else {
        const nextTier = this.getNextTier(tierId);
        if (nextTier) {
          this.mainActionText.textContent = `PROCEED TO ${nextTier.name.toUpperCase()} (${nextTier.size})`;
          this.commandTipText.textContent = `${tierConfig.name} complete! Proceed to ${nextTier.name}.`;
        }
      }
    } else {
      // Ready to be sorted
      this.currentStep = 0;
      this.renderer.clearDyingBars();
      this.updateTelemetry(tierConfig.size, 0, 0);

      this.canvasOverlay.classList.remove('hidden');
      this.overlayTitle.textContent = `${tierConfig.name.toUpperCase()} ASSEMBLED`;
      this.overlayDesc.textContent = `${tierConfig.size} comrades stand in formation. Any recruit shorter than the preceding survivor will tumble to Siberia!`;
      this.overlayBtnText.textContent = `INITIATE PURGE (${tierConfig.size} ELEMENTS)`;

      this.mainActionText.textContent = `INITIATE PURGE (${tierConfig.size} ELEMENTS)`;
      this.commandTipText.textContent = `Press Initiate Purge to inspect ${tierConfig.name}.`;
    }
  }

  private getNextTier(tierId: TierId): TierConfig | null {
    if (tierId === 'squad') return TIERS[1];
    if (tierId === 'platoon') return TIERS[2];
    return null;
  }

  private handleActionClick() {
    if (this.isSorting) return;

    // If today is completed, button always opens Tribunal Report
    if (this.todayGame && this.todayGame.completed) {
      this.openTribunalModal(this.todayGame);
      return;
    }

    const currentResult = this.completedTierResults[this.activeTierId];

    if (!currentResult) {
      // Start this echelon's purge!
      this.startActiveTierPurge();
    } else {
      // Proceed to next echelon
      const nextTier = this.getNextTier(this.activeTierId);
      if (nextTier) {
        this.setActiveTier(nextTier.id);
      }
    }
  }

  // Deliberate execution of the active tier
  private async startActiveTierPurge() {
    if (this.isSorting) return;

    this.isSorting = true;
    this.btnMainAction.disabled = true;
    this.canvasOverlay.classList.add('hidden');
    this.renderer.clearDyingBars();

    sound.playPurgeStamp();

    const tierConfig = TIERS.find((t) => t.id === this.activeTierId)!;
    const array = this.tierArrays[this.activeTierId];
    const sim = this.tierSims[this.activeTierId]!;
    const size = tierConfig.size;
    const startTime = performance.now();
    const stepDelay = tierConfig.stepDelayMs;

    let survivorsCount = 0;
    let purgedCount = 0;

    // Step-by-step deliberate inspection
    for (let i = 0; i < size; i++) {
      this.currentStep = i + 1;
      const val = array[i];
      const isKept = sim.keptIndices[i];

      if (isKept) {
        survivorsCount++;
        const normH = val / sim.maxPossible;
        sound.playTick(normH, true);
        const rect = this.renderer.getBarRect(i, size);
        this.particleSystem.spawnSurvivorChime(rect.x + rect.w * 0.5, rect.y);
      } else {
        purgedCount++;
        const normH = val / sim.maxPossible;
        sound.playTick(normH, false);

        // TRIGGER DYING BAR TUMBLE ANIMATION!
        const rect = this.renderer.getBarRect(i, size);
        const barH = (val / sim.maxPossible) * (this.canvas.height - 72);
        const floorY = this.canvas.height - 34;
        this.renderer.triggerBarDeath(rect.x, floorY - barH, rect.w, barH, val);
      }

      this.updateTelemetry(size, survivorsCount, purgedCount);

      // Suspenseful deliberate pace
      await this.delay(stepDelay);
    }

    // Tier complete!
    const duration = performance.now() - startTime;
    const result = toTierResult(sim, duration);
    this.completedTierResults[this.activeTierId] = result;

    // Save partial progress to localStorage immediately
    this.persistCurrentProgress();

    sound.playTierSuccess();
    this.particleSystem.spawnCelebration(this.canvas.width, this.canvas.height, 45);

    this.isSorting = false;
    this.btnMainAction.disabled = false;

    // Check if all tiers are now done
    if (
      this.completedTierResults.squad !== null &&
      this.completedTierResults.platoon !== null &&
      this.completedTierResults.company !== null
    ) {
      this.onAllTiersCompleted();
    } else {
      this.updateTierTabsUI();
      const nextTier = this.getNextTier(this.activeTierId);
      if (nextTier) {
        this.mainActionText.textContent = `PROCEED TO ${nextTier.name.toUpperCase()} (${nextTier.size})`;
        this.commandTipText.textContent = `${tierConfig.name} complete (${result.survivors} kept). Proceed to next echelon!`;
      }
    }
  }

  // Persist current daily progress
  private persistCurrentProgress() {
    const today = getTodayDateStr();
    const results: TierResult[] = [
      this.completedTierResults.squad,
      this.completedTierResults.platoon,
      this.completedTierResults.company,
    ].filter(Boolean) as TierResult[];

    const allDone = results.length === 3;
    const totalSurvivors = results.reduce((a, b) => a + b.survivors, 0);
    const totalPurged = results.reduce((a, b) => a + b.purged, 0);
    const totalElements = 160;
    const totalSurvivalRate = Number(((totalSurvivors / totalElements) * 100).toFixed(2));
    const rank = getRankForSurvivors(totalSurvivors);

    const gameData: DailyGameData = {
      dateStr: today,
      dayNumber: getDayNumber(today),
      completed: allDone,
      tierResults: results,
      totalSurvivors,
      totalPurged,
      totalElements,
      totalSurvivalRate,
      rank,
      completedAt: allDone ? Date.now() : 0,
      seed: this.todayGame ? this.todayGame.seed : 1337,
      initialArrays: this.tierArrays,
    };

    saveDailyGame(gameData);
    this.todayGame = gameData;
  }

  // All 3 echelons completed!
  private onAllTiersCompleted() {
    this.persistCurrentProgress();
    this.updateTierTabsUI();

    sound.playTribunalStamp();
    if (this.todayGame && this.todayGame.rank.stars >= 4) {
      sound.playVictoryFanfare();
    }
    this.particleSystem.spawnCelebration(this.canvas.width, this.canvas.height, 100);

    this.mainActionText.textContent = 'VIEW TRIBUNAL REPORT';
    this.commandTipText.textContent = 'All 3 echelons complete! Tribunal verdict rendered.';

    setTimeout(() => {
      if (this.todayGame) {
        this.openTribunalModal(this.todayGame);
      }
    }, 600);
  }

  // Update UI telemetry cards (2 columns: Survivors & Purged)
  private updateTelemetry(size: number, survivors: number, purged: number) {
    const rate = this.currentStep > 0 ? ((survivors / this.currentStep) * 100).toFixed(1) : '0.0';
    const purgeRate = this.currentStep > 0 ? ((purged / this.currentStep) * 100).toFixed(1) : '0.0';

    this.valSurvivors.textContent = `${survivors} / ${size}`;
    this.subSurvivors.textContent = `${rate}% SURVIVAL RATE`;

    this.valPurged.textContent = `${purged} / ${size}`;
    this.subPurged.textContent = `${purgeRate}% EXECUTED TO SIBERIA`;
  }

  // Update echelon buttons in header
  private updateTierTabsUI() {
    TIERS.forEach((tier, idx) => {
      const btn = document.getElementById(`tierBtn-${tier.id}`) as HTMLButtonElement;
      const statusEl = document.getElementById(`tierStatus-${tier.id}`);
      const conn = document.getElementById(`conn${idx}`);
      const result = this.completedTierResults[tier.id];
      const isUnlocked = this.isTierUnlocked(tier.id);

      btn.classList.remove('active', 'completed', 'locked');

      if (!isUnlocked) {
        btn.classList.add('locked');
        if (statusEl) statusEl.textContent = 'LOCKED';
        if (conn) conn.classList.remove('active');
      } else if (result) {
        btn.classList.add('completed');
        if (tier.id === this.activeTierId) btn.classList.add('active');
        if (statusEl) statusEl.textContent = `${result.survivors} / ${tier.size} KEPT`;
        if (conn) conn.classList.add('active');
      } else {
        if (tier.id === this.activeTierId) {
          btn.classList.add('active');
          if (statusEl) statusEl.textContent = this.isSorting ? 'INSPECTION ACTIVE' : 'READY';
        } else {
          if (statusEl) statusEl.textContent = 'UNLOCKED';
        }
        if (conn) conn.classList.remove('active');
      }
    });
  }

  // Continuous render loop for canvas
  private startContinuousRenderLoop() {
    this.animRunning = true;
    const renderLoop = () => {
      if (!this.animRunning) return;

      const array = this.tierArrays[this.activeTierId] || [];
      const sim = this.tierSims[this.activeTierId];

      if (sim && array.length > 0) {
        this.renderer.render({
          array,
          keptIndices: sim.keptIndices,
          currentIndex: this.currentStep,
          maxVal: sim.maxPossible,
          isComplete: this.currentStep >= array.length,
        });
      }

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
  }

  // Open Tribunal Results Modal
  private openTribunalModal(game: DailyGameData) {
    const medalEl = document.getElementById('dispatchMedal')!;
    const rankNameEl = document.getElementById('dispatchRankName')!;
    const rankRussianEl = document.getElementById('dispatchRussianName')!;
    const quoteEl = document.getElementById('dispatchRankQuote')!;
    const totalSurvivorsEl = document.getElementById('dispatchTotalSurvivors')!;
    const survivalRateEl = document.getElementById('dispatchSurvivalRate')!;

    medalEl.textContent = game.rank.medal;
    rankNameEl.textContent = game.rank.title;
    rankRussianEl.textContent = game.rank.russianTitle;
    quoteEl.textContent = game.rank.quote;
    totalSurvivorsEl.textContent = game.totalSurvivors.toString();
    survivalRateEl.textContent = `${game.totalSurvivalRate}% SURVIVAL`;

    // Tier rows
    const squadRes = game.tierResults.find((r) => r.tierId === 'squad');
    const platoonRes = game.tierResults.find((r) => r.tierId === 'platoon');
    const companyRes = game.tierResults.find((r) => r.tierId === 'company');

    if (squadRes) {
      document.getElementById('resSquad')!.textContent = `${squadRes.survivors} / 10`;
      document.getElementById('pctSquad')!.textContent = `(${squadRes.survivalRate}%)`;
      document.getElementById('fillSquad')!.style.width = `${Math.min(100, squadRes.survivalRate * 2.5)}%`;
    }
    if (platoonRes) {
      document.getElementById('resPlatoon')!.textContent = `${platoonRes.survivors} / 50`;
      document.getElementById('pctPlatoon')!.textContent = `(${platoonRes.survivalRate}%)`;
      document.getElementById('fillPlatoon')!.style.width = `${Math.min(100, platoonRes.survivalRate * 3.5)}%`;
    }
    if (companyRes) {
      document.getElementById('resCompany')!.textContent = `${companyRes.survivors} / 100`;
      document.getElementById('pctCompany')!.textContent = `(${companyRes.survivalRate}%)`;
      document.getElementById('fillCompany')!.style.width = `${Math.min(100, companyRes.survivalRate * 4)}%`;
    }

    const shareText = this.generateShareText(game);
    document.getElementById('shareTextPreview')!.textContent = shareText;

    this.openModal(this.modalTribunal);
  }

  // Generate Wordle-style shareable dispatch text
  private generateShareText(game: DailyGameData): string {
    const stats = loadStats();
    const streak = stats.currentStreak || 1;

    const getEmojiBar = (survivors: number, expected: number) => {
      const ratio = survivors / expected;
      if (ratio >= 2.0) return '🟩🟩🟩🟩';
      if (ratio >= 1.4) return '🟩🟩🟩🟨';
      if (ratio >= 1.0) return '🟩🟩🟨🟥';
      if (ratio >= 0.7) return '🟩🟨🟥🟥';
      if (ratio >= 0.4) return '🟨🟥🟥🟥';
      return '🟥🟥🟥🟥';
    };

    const s = game.tierResults.find((r) => r.tierId === 'squad') || { survivors: 0, survivalRate: 0 };
    const p = game.tierResults.find((r) => r.tierId === 'platoon') || { survivors: 0, survivalRate: 0 };
    const c = game.tierResults.find((r) => r.tierId === 'company') || { survivors: 0, survivalRate: 0 };

    const sBar = getEmojiBar(s.survivors, 3);
    const pBar = getEmojiBar(p.survivors, 4.5);
    const cBar = getEmojiBar(c.survivors, 5.2);

    return `STALINDLE #${game.dayNumber} 🎖️ (${game.dateStr})
⚔️ The Stalin Sort Lottery
🪖 Squad (10):     ${s.survivors}/10   ${sBar} (${s.survivalRate}%)
🎖️ Platoon (50):   ${p.survivors}/50   ${pBar} (${p.survivalRate}%)
⭐ Company (100):  ${c.survivors}/100  ${cBar} (${c.survivalRate}%)
-----------------------------------
Loyal Comrades: ${game.totalSurvivors} / 160 (${game.totalSurvivalRate}%)
Rank: ${game.rank.title} ${game.rank.medal}
Streak: ${streak} 🔥 | Best: ${Math.max(stats.bestSurvivors, game.totalSurvivors)}

Order must be maintained!
stalindle.online`;
  }

  private async copyShareDispatch() {
    if (!this.todayGame) return;
    const text = this.generateShareText(this.todayGame);
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('PRAVDA DISPATCH COPIED TO CLIPBOARD! 📋');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast('PRAVDA DISPATCH COPIED TO CLIPBOARD! 📋');
    }
  }

  private renderStatsModal() {
    const stats = loadStats();
    document.getElementById('statGamesPlayed')!.textContent = stats.gamesPlayed.toString();
    document.getElementById('statCurrentStreak')!.textContent = stats.currentStreak.toString();
    document.getElementById('statMaxStreak')!.textContent = stats.maxStreak.toString();
    document.getElementById('statBestSurvivors')!.textContent = stats.bestSurvivors.toString();

    const chartContainer = document.getElementById('distributionChart')!;
    chartContainer.innerHTML = '';
    const bucketLabels = ['< 7', '7-10', '11-15', '16-22', '23-32', '33-44', '45+'];
    const maxVal = Math.max(1, ...stats.scoreDistribution);

    stats.scoreDistribution.forEach((count, i) => {
      const pct = Math.max(8, Math.round((count / maxVal) * 100));
      const row = document.createElement('div');
      row.className = 'dist-row';
      row.innerHTML = `
        <span class="dist-label">${bucketLabels[i]}</span>
        <div class="dist-bar-wrapper">
          <div class="dist-bar-fill" style="width: ${count > 0 ? pct : 0}%">
            ${count}
          </div>
        </div>
      `;
      chartContainer.appendChild(row);
    });

    const ranksList = document.getElementById('ranksSummaryList')!;
    ranksList.innerHTML = '';
    RANKS.forEach((rank) => {
      const awarded = stats.rankHistory[rank.id] || 0;
      const item = document.createElement('div');
      item.className = 'rank-item';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${rank.medal}</span>
          <span style="color: ${rank.badgeColor}; font-weight: bold;">${rank.title}</span>
        </div>
        <span style="color: var(--text-muted); font-weight: bold;">${awarded} awarded</span>
      `;
      ranksList.appendChild(item);
    });
  }

  private startCountdownLoop() {
    const updateCountdown = () => {
      const time = getTimeUntilNextDaily();
      const timerEl = document.getElementById('countdownTimer');
      if (timerEl) {
        timerEl.textContent = time.formatted;
      }
    };
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  private openModal(el: HTMLElement) {
    el.classList.remove('hidden');
  }

  private closeModal(el: HTMLElement) {
    el.classList.add('hidden');
  }

  private showToast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 2500);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new StalindleGame();
});
