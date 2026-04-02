// Persistent state backed by localStorage
const DEFAULTS = {
  totalCoins: 0,
  upgrades: {
    doubleJump: false,
    shield: false,
    magnet: false,
  },
  bestDistance: 0,
};

function load() {
  try {
    const saved = localStorage.getItem('coinRushState');
    if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
  } catch (_) {}
  return { ...DEFAULTS, upgrades: { ...DEFAULTS.upgrades } };
}

function save(state) {
  try {
    localStorage.setItem('coinRushState', JSON.stringify(state));
  } catch (_) {}
}

const GameState = {
  _state: load(),

  get totalCoins() { return this._state.totalCoins; },
  get upgrades() { return this._state.upgrades; },
  get bestDistance() { return this._state.bestDistance; },

  addCoins(n) {
    this._state.totalCoins += n;
    save(this._state);
  },

  spendCoins(n) {
    if (this._state.totalCoins < n) return false;
    this._state.totalCoins -= n;
    save(this._state);
    return true;
  },

  buyUpgrade(key) {
    this._state.upgrades[key] = true;
    save(this._state);
  },

  updateBest(distance) {
    if (distance > this._state.bestDistance) {
      this._state.bestDistance = distance;
      save(this._state);
    }
  },

  reload() {
    this._state = load();
  },
};

export default GameState;
