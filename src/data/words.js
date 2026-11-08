/**
 * VOID TYPER — local word dictionary
 *
 * Four difficulty tiers. Every word is a single lowercase ASCII token
 * (letters only — no spaces, digits, apostrophes or hyphens).
 * A sanitizer below re-validates and re-buckets everything by real length,
 * so a misplaced word can never leak into the wrong tier.
 */

const EASY_WORDS = [
  // 3–5 characters — common English words
  'ace', 'act', 'add', 'aim', 'air', 'arc', 'arm', 'ash', 'atom', 'aura',
  'auto', 'axis', 'bait', 'ball', 'band', 'bank', 'base', 'bath', 'beam', 'bean',
  'bear', 'beat', 'bike', 'bird', 'blade', 'blaze', 'blink', 'blue', 'boat', 'bolt',
  'bone', 'boost', 'boot', 'box', 'brave', 'bread', 'break', 'brew', 'brush', 'burn',
  'bush', 'calm', 'cargo', 'cave', 'cell', 'chain', 'chaos', 'charm', 'chase', 'chef',
  'chest', 'chill', 'chip', 'clamp', 'clash', 'clean', 'clear', 'cliff', 'climb', 'cloud',
  'coach', 'coast', 'comet', 'core', 'crane', 'crash', 'crew', 'crown', 'cube', 'curve',
  'cycle', 'dawn', 'deck', 'delta', 'dice', 'dive', 'dock', 'drone', 'dust', 'duty',
  'eagle', 'earth', 'echo', 'edge', 'elite', 'ember', 'empty', 'enemy', 'equal', 'ether',
  'exit', 'fang', 'farm', 'fear', 'flag', 'flare', 'fleet', 'flip', 'float', 'focus',
  'force', 'forge', 'frame', 'fuel', 'fuse', 'gain', 'gate', 'gear', 'ghost', 'gift',
  'glass', 'globe', 'grip', 'guard', 'halo', 'halt', 'hatch', 'hawk', 'heat', 'helm',
  'hive', 'hold', 'hood', 'hook', 'hope', 'hull', 'hunt', 'icon', 'idea', 'iron',
  'jade', 'jet', 'join', 'jump', 'keel', 'kill', 'kite', 'knee', 'knife', 'knock',
  'laser', 'launch', 'lead', 'leaf', 'leap', 'legend', 'lens', 'lift', 'light', 'lime',
  'lock', 'loop', 'luck', 'lunar', 'mark', 'mask', 'mast', 'mate', 'mesh', 'meteor',
  'mine', 'mint', 'mode', 'moon', 'nest', 'net', 'nova', 'oath', 'orbit', 'oven',
  'pack', 'paint', 'path', 'pause', 'phase', 'phone', 'pilot', 'pipe', 'pixel', 'plate',
  'plug', 'point', 'polar', 'port', 'power', 'probe', 'prop', 'pulse', 'pump', 'race',
  'radar', 'raid', 'rank', 'raven', 'react', 'repo', 'ring', 'rise', 'risk', 'rocket',
  'rope', 'ruin', 'rush', 'sail', 'salt', 'scan', 'seal', 'seat', 'seed', 'shade',
  'shift', 'ship', 'shock', 'sight', 'sign', 'silicon', 'sing', 'site', 'size', 'skill',
  'sky', 'slam', 'sled', 'slot', 'smoke', 'solar', 'sonic', 'sound', 'space', 'spark',
  'spin', 'star', 'steel', 'stem', 'storm', 'suit', 'sun', 'surge', 'swap', 'switch',
  'tank', 'tap', 'tech', 'thaw', 'tiara', 'tide', 'tile', 'tip', 'tone', 'tool',
  'trace', 'track', 'trail', 'tree', 'trim', 'tune', 'twin', 'unit', 'vacuum', 'vast',
  'vector', 'vault', 'vent', 'vice', 'void', 'volt', 'warp', 'wave', 'wing', 'wolf',
  'wood', 'zero', 'zone', 'zoom',
];

const MEDIUM_WORDS = [
  // 5–8 characters — moderately difficult vocabulary
  'anchor', 'anomaly', 'armor', 'arctic', 'ascent', 'assault', 'asteroid', 'aurora',
  'avenger', 'beacon', 'binary', 'blizzard', 'breeze', 'bridge', 'bright', 'bullet',
  'bundle', 'bunker', 'burrow', 'canyon', 'captain', 'carbon', 'chamber', 'charger',
  'charter', 'cipher', 'circuit', 'climate', 'cobalt', 'command', 'compact', 'console',
  'convoy', 'cosmos', 'crimson', 'cruiser', 'cyclone', 'dagger', 'defend', 'defense',
  'destiny', 'detour', 'devour', 'dispatch', 'distant', 'dolphin', 'dominion', 'dynamic',
  'eclipse', 'elevate', 'emission', 'empire', 'engine', 'enigma', 'escort', 'ethereal',
  'evasion', 'exodus', 'expand', 'explore', 'fabric', 'falcon', 'feedback', 'fission',
  'flanker', 'flotilla', 'flutter', 'fortress', 'forward', 'freedom', 'freight', 'frigate',
  'fusion', 'galaxy', 'gateway', 'genesis', 'glimmer', 'granite', 'gravity', 'guardian',
  'hammer', 'harbor', 'hazard', 'helium', 'horizon', 'hunter', 'hybrid', 'impulse',
  'infrared', 'insight', 'inspire', 'invader', 'jettison', 'junction', 'kestrel', 'kiloton',
  'kinetic', 'lancer', 'lantern', 'lattice', 'launcher', 'legion', 'liberty', 'machine',
  'magnet', 'mantis', 'marshal', 'marvel', 'matrix', 'mercury', 'meridian', 'meteor',
  'mirage', 'mission', 'mixture', 'monitor', 'monolith', 'mortar', 'nebula', 'nemesis',
  'neutron', 'nimble', 'nozzle', 'nucleus', 'observer', 'oblivion', 'odyssey', 'onboard',
  'orbital', 'outpost', 'oxygen', 'panther', 'particle', 'passage', 'patrol', 'payload',
  'phantom', 'photon', 'pierce', 'pillar', 'pioneer', 'piston', 'plasma', 'plummet',
  'portal', 'prestige', 'primer', 'promise', 'proton', 'pulsar', 'purpose', 'quantum',
  'quasar', 'raider', 'ranger', 'raptor', 'reactor', 'rebirth', 'recruit', 'reflex',
  'resonant', 'retreat', 'revival', 'revolver', 'rocket', 'rudder', 'salvage', 'samurai',
  'sapphire', 'scanner', 'scatter', 'scenario', 'sentry', 'serpent', 'shadow', 'shatter',
  'shield', 'shrapnel', 'shutter', 'silence', 'silver', 'skeleton', 'skyline', 'snapshot',
  'spectrum', 'sprint', 'stalwart', 'standby', 'stardust', 'stealth', 'stellar', 'storage',
  'striker', 'surface', 'sustain', 'tactical', 'tempest', 'thermal', 'thruster', 'thunder',
  'torpedo', 'tracker', 'tractor', 'trigger', 'trident', 'triumph', 'turret', 'twilight',
  'typhoon', 'tyrant', 'umbrella', 'unicorn', 'upgrade', 'utopia', 'vantage', 'velocity',
  'verdict', 'veteran', 'victory', 'vigilant', 'vision', 'voltage', 'vortex', 'voyager',
  'warden', 'warrior', 'weapon', 'weather', 'whistle', 'wildcard', 'winter', 'wizard',
  'wraith', 'wrench', 'zeppelin', 'zenith', 'zephyr', 'zigzag', 'zodiac',
];

const HARD_WORDS = [
  // 8–12 characters — more complex spelling
  'accretion', 'adversary', 'aerospace', 'afterburner', 'ammunition', 'artillery',
  'ascendant', 'astronaut', 'atmosphere', 'battalion', 'battleship', 'bombardier',
  'brainstorm', 'breakpoint', 'cataclysm', 'celestial', 'chromatic', 'collision',
  'component', 'concussion', 'crossfire', 'destroyer', 'detonation', 'deviation',
  'diligence', 'diversion', 'dragonfly', 'dreadnought', 'elevation', 'emergency',
  'encounter', 'equipment', 'exosphere', 'explosive', 'forbidden', 'formation',
  'frequency', 'generator', 'gladiator', 'guerrilla', 'gunpowder', 'gyroscope',
  'hurricane', 'hypernova', 'hyperspace', 'illuminate', 'imperative', 'implosion',
  'interlude', 'intersect', 'invincible', 'ionosphere', 'labyrinth', 'landslide',
  'lieutenant', 'lightning', 'malfunction', 'mercurial', 'metropolis', 'navigation',
  'nocturnal', 'notorious', 'obliterate', 'observatory', 'obstacles', 'offensive',
  'onslaught', 'operative', 'ordnance', 'overdrive', 'parachute', 'peninsula',
  'perimeter', 'personnel', 'phosphorus', 'precision', 'projectile', 'prototype',
  'quarantine', 'radiation', 'recapture', 'refraction', 'reinforce', 'resistance',
  'revolution', 'sabotage', 'semaphore', 'shipboard', 'shipwright', 'shockwave',
  'silhouette', 'simulator', 'slingshot', 'snowstorm', 'spaceport', 'spaceship',
  'starboard', 'starlight', 'steadfast', 'stabilizer', 'strategist', 'subroutine',
  'supersonic', 'surrender', 'switchblade', 'swordsman', 'synthesis', 'tactician',
  'telegraph', 'telescope', 'tenacious', 'territory', 'trajectory', 'traversal',
  'tributary', 'triceratops', 'ultimatum', 'ultrasonic', 'universal', 'variation',
  'vengeance', 'versatile', 'vibration', 'violation', 'wilderness', 'wolfhound',
  'xylophone',
];

const EXPERT_WORDS = [
  // 10–16 characters — advanced vocabulary, challenging combinations
  'aerodynamics', 'aeronautics', 'amphibious', 'antimatter', 'apocalypse',
  'aristocracy', 'astronomer', 'astrophysics', 'battlecruiser', 'blacksmith',
  'bombardment', 'cataclysmic', 'catastrophe', 'caterpillar', 'centrifuge',
  'chivalrous', 'circumference', 'civilization', 'combustible', 'conflagration',
  'conspicuous', 'contraband', 'convertible', 'cornucopia', 'cosmopolitan',
  'counterfeit', 'cryptography', 'cumulonimbus', 'diabolical', 'disintegrate',
  'earthquake', 'eccentricity', 'effervescent', 'electrocute', 'elimination',
  'encyclopedia', 'exceptional', 'expedition', 'experimental', 'extraordinary',
  'fluorescent', 'fortification', 'fundamental', 'gargantuan', 'gravitation',
  'harpsichord', 'heliocentric', 'hexadecimal', 'hydraulics', 'imagination',
  'incandescent', 'indispensable', 'infiltration', 'interplanetary', 'interstellar',
  'intervention', 'invertebrate', 'jackhammer', 'juggernaut', 'kaleidoscope',
  'magnificent', 'mercantile', 'motherboard', 'nightingale', 'obfuscation',
  'omnipotent', 'paratrooper', 'partition', 'pathfinder', 'penicillin',
  'perihelion', 'perturbation', 'planetarium', 'pomegranate', 'portmanteau',
  'prehistoric', 'promontory', 'propellant', 'protagonist', 'proverbial',
  'pyromaniac', 'quartermaster', 'rendezvous', 'rhinoceros', 'salamander',
  'scientific', 'searchlight', 'skyscraper', 'smokestack', 'somersault',
  'stalactite', 'stethoscope', 'stratosphere', 'submersible', 'superhuman',
  'suspension', 'switchback', 'synchronize', 'synonymous', 'tempestuous',
  'terrestrial', 'thermodynamics', 'thermometer', 'thunderclap', 'thunderhead',
  'transatlantic', 'translucent', 'transparent', 'treacherous', 'turbocharger',
  'ultraviolet', 'velociraptor', 'vicissitude', 'victorious', 'viewfinder',
  'wanderlust', 'watchtower', 'watermelon', 'wheelwright', 'witchcraft',
  'woodpecker',
];

const RANGE_BY_TIER = {
  easy: [3, 5],
  medium: [5, 8],
  hard: [8, 12],
  expert: [10, 16],
};

/**
 * Sanitize + bucket every list by its REAL length so the tiers always
 * honor the documented character ranges and contain only /^[a-z]+$/ tokens.
 */
function buildPools() {
  const seen = new Set();
  const pools = { easy: [], medium: [], hard: [], expert: [] };
  const tiers = [
    ['easy', EASY_WORDS],
    ['medium', MEDIUM_WORDS],
    ['hard', HARD_WORDS],
    ['expert', EXPERT_WORDS],
  ];
  for (const [tier, list] of tiers) {
    for (const raw of list) {
      const word = String(raw).toLowerCase().trim();
      if (!/^[a-z]+$/.test(word) || seen.has(word)) continue;
      seen.add(word);
      const len = word.length;
      let placed = false;
      for (const [name, [min, max]] of Object.entries(RANGE_BY_TIER)) {
        if (len >= min && len <= max) {
          pools[name].push(word);
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Out of every documented range — bucket into the closest tier.
        if (len < 3) pools.easy.push(word);
        else pools.expert.push(word);
      }
    }
  }
  return pools;
}

export const WORD_POOLS = buildPools();
export const TIER_RANGES = RANGE_BY_TIER;
