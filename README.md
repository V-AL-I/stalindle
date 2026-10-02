# 🎖️ STALINDLE — The Daily Stalin Sort Lottery

> *"Order must be maintained. Unfit elements shall be purged without hesitation."*

**STALINDLE** is an esoteric, daily lottery-style "-dle" web game based on the infamous **Stalin Sort** algorithm. 

The player witnesses the deliberate sorting of three military echelons, starting each formation individually:
1. 🪖 **The Squad:** 10 soldiers (High suspense, deliberate inspection of each comrade)
2. 🎖️ **The Platoon:** 50 soldiers (Tactical review with tumbling eliminated bars)
3. ⭐ **The Company:** 100 soldiers (Mass algorithmic tribunal)

The player does not manipulate the order: fate and probability alone decide which soldiers survive the purge. The goal is to finish with the **highest remaining number of loyal elements** out of 160!

---

## 🔒 One Device = One Daily Attempt
- Every player gets strictly **one official attempt per day** across the 3 echelons.
- Once a player has played today, they are immediately shown their **Official Pravda Dispatch (Results Page)** upon visiting, with a countdown timer to tomorrow's daily purge.
- Mid-game progress is preserved in local storage so refreshing resumes the active echelon rather than generating new numbers.

---

## ⚙️ How Stalin Sort Works ($O(N)$ Sorting)
Stalin Sort iterates left-to-right across an array:
1. **The First Recruit:** Automatically accepted as the first loyal survivor.
2. **The Inspection:** Every subsequent recruit is evaluated:
   - If greater than or equal to the previous survivor, they are **spared and promoted** (gains gold star).
   - If smaller than the previous survivor, they are **purged** — an execution strike flashes and the bar **tumbles downward off the screen under gravity into Siberia**!
3. **The Result:** After a single pass, the remaining array is guaranteed sorted in non-decreasing order.

### 🎲 The Mathematics of Luck
In a uniform random permutation of $N$ elements, the expected number of survivors is given by the Harmonic number:
$$E[\text{Survivors}] = H_N = 1 + \frac{1}{2} + \frac{1}{3} + \dots + \frac{1}{N} \approx \ln(N) + 0.5772$$

- **10 Elements:** $\approx 2.93$ expected survivors
- **50 Elements:** $\approx 4.50$ expected survivors
- **100 Elements:** $\approx 5.19$ expected survivors
- **Expected Total:** $\approx 12.6$ out of 160 ($\approx 7.9\%$)

If your very first recruit happens to be an arrogant giant (e.g. 98 out of 100), almost everyone who follows is purged! But if your formation begins with humble recruits who gradually rise in height, you can achieve historic numbers of survivors and earn the highest state decorations!

---

## 🎖️ Honor Ranks & State Medals
Based on your total surviving comrades across all 3 echelons (160 soldiers):
- 🚫 **Saboteur of the State** (`< 7` survivors)
- ⛏️ **Gulag Quarry Worker** (`7 - 10` survivors)
- 🔨 **Loyal Proletariat** (`11 - 15` survivors)
- ⭐ **Order of the Red Star** (`16 - 22` survivors)
- 🏅 **Hero of Socialist Labour** (`23 - 32` survivors)
- ⚔️ **Marshal of the Red Army** (`33 - 44` survivors)
- 🎖️🌟 **Generalissimo Supreme** (`45+` survivors)

---

## 🚀 Key Features
- **Strictly One Attempt Per Day:** Players who have completed today's purge immediately see their results page and midnight countdown.
- **Dynamic "Die" Physics Animation:** Purged bars tumble off the bottom of the screen with gravity and spin into the abyss.
- **Fixed Deliberate Pacing:** Calibrated slower so each comrade's inspection can be followed with tension.
- **Enlarged, Readable Typography:** High contrast, large fonts for values, indexes, and statistics.
- **Streamlined 2-Column Telemetry:** Dedicated readouts for Loyal Survivors and Purged Comrades.
- **Retro Soviet Cyberpunk Styling:** CRT scanlines and vignette active by default with authentic Cold War typography (`Bebas Neue`, `Russo One`, `Share Tech Mono`).
- **Shareable Pravda Dispatch:** Wordle-style emoji grids (`🟩🟨🟥`) ready to copy to clipboard and share.

---

## 💻 Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```
